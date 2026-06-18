package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"
)

var imgbbAPIKey = os.Getenv("IMGBB_API_KEY")

type imgbbResponse struct {
	Data    json.RawMessage `json:"data"`
	Success bool            `json:"success"`
	Status  int             `json:"status"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

type imgbbData struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	Display  string `json:"display_url"`
	Delete   string `json:"delete_url"`
	URLView  string `json:"url_viewer"`
	Thumb    struct {
		URL string `json:"url"`
	} `json:"thumb"`
	Image struct {
		URL string `json:"url"`
	} `json:"image"`
	Width  int `json:"width"`
	Height int `json:"height"`
	Size   int `json:"size"`
}

func uploadToImgBB(data []byte, filename string) (*imgbbData, error) {
	if imgbbAPIKey == "" {
		return nil, fmt.Errorf("IMGBB_API_KEY not set")
	}

	b64 := base64.StdEncoding.EncodeToString(data)

	form := url.Values{}
	form.Set("key", imgbbAPIKey)
	form.Set("image", b64)
	form.Set("name", filename)
	form.Set("expiration", "0")

	req, err := http.NewRequest("POST", "https://api.imgbb.com/1/upload", bytes.NewBufferString(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("imgbb returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var raw struct {
		Data    json.RawMessage `json:"data"`
		Success bool            `json:"success"`
		Error   *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(respBody, &raw); err != nil {
		return nil, err
	}

	if !raw.Success {
		if raw.Error != nil {
			return nil, fmt.Errorf("imgbb: %s", raw.Error.Message)
		}
		return nil, fmt.Errorf("imgbb upload failed")
	}

	var d imgbbData
	if err := json.Unmarshal(raw.Data, &d); err != nil {
		return nil, fmt.Errorf("failed to parse imgbb data: %v", err)
	}

	return &d, nil
}

type uploadResult struct {
	URL     string `json:"url"`
	Display string `json:"display_url"`
	Delete  string `json:"delete_url"`
	Thumb   string `json:"thumb"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
}

type batchUploadResult struct {
	Badges []namedBadge `json:"badges"`
}

type namedBadge struct {
	Name string       `json:"name"`
	Type string       `json:"type"`
	URL  string       `json:"url"`
	MD   string       `json:"markdown"`
	HTML string       `json:"html"`
}

func handleBadgeUpload(w http.ResponseWriter, r *http.Request) {
	repoURL := r.URL.Query().Get("url")
	badgeType := r.URL.Query().Get("type")

	if repoURL == "" {
		writeError(w, "missing url", 400)
		return
	}

	owner, repo, err := parseRepoURL(repoURL)
	if err != nil {
		writeError(w, "invalid url", 400)
		return
	}

	if imgbbAPIKey == "" {
		writeError(w, "IMGBB_API_KEY not configured on server", 500)
		return
	}

	key := owner + "/" + repo
	data := globalStore.GetCached(key)
	if data == nil {
		var token string
		if t := r.URL.Query().Get("token"); t != "" {
			token = t
		} else {
			token = githubToken
		}
		if token == "" {
			writeError(w, "no token available", 400)
			return
		}
		data, err = fetchRepoData(owner, repo, token)
		if err != nil {
			writeError(w, "fetch failed", 502)
			return
		}
		globalStore.SetCache(key, data)
	}

	if badgeType == "" {
		badgeType = "overview"
	}

	gifBytes, err := generateGIFBadge(buildGIFBadge(data, badgeType))
	if err != nil {
		writeError(w, "gif generation failed: "+err.Error(), 500)
		return
	}

	filename := fmt.Sprintf("gitviz-%s-%s", repo, badgeType)
	d, err := uploadToImgBB(gifBytes, filename)
	if err != nil {
		writeError(w, "imgbb upload failed: "+err.Error(), 502)
		return
	}

	embedURL := fmt.Sprintf("https://github.com/%s/%s", owner, repo)
	_ = fmt.Sprintf("[![GitViz](%s)](%s)", d.URL, embedURL)
	_ = fmt.Sprintf("<a href=\"%s\"><img src=\"%s\" alt=\"GitViz %s\"/></a>", embedURL, d.URL, badgeType)

	writeJSON(w, uploadResult{
		URL:     d.URL,
		Display: d.Display,
		Delete:  d.Delete,
		Thumb:   d.Thumb.URL,
		Width:   d.Width,
		Height:  d.Height,
	})
}

func handleBadgeUploadAll(w http.ResponseWriter, r *http.Request) {
	repoURL := r.URL.Query().Get("url")

	if repoURL == "" {
		writeError(w, "missing url", 400)
		return
	}

	owner, repo, err := parseRepoURL(repoURL)
	if err != nil {
		writeError(w, "invalid url", 400)
		return
	}

	publishProgress("upload", "Preparing badge generation...", 0)

	if imgbbAPIKey == "" {
		publishError("IMGBB_API_KEY not configured")
		writeError(w, "IMGBB_API_KEY not configured on server", 500)
		return
	}

	key := owner + "/" + repo
	data := globalStore.GetCached(key)
	if data == nil {
		var token string
		if t := r.URL.Query().Get("token"); t != "" {
			token = t
		} else {
			token = githubToken
		}
		if token == "" {
			publishError("no token available")
			writeError(w, "no token available", 400)
			return
		}
		publishProgress("fetch", "Fetching repository data for badge generation...", 5)
		data, err = fetchRepoData(owner, repo, token)
		if err != nil {
			publishError("fetch failed: " + err.Error())
			writeError(w, "fetch failed", 502)
			return
		}
		globalStore.SetCache(key, data)
	}

	types := []string{"overview", "stars", "forks", "issues", "language", "commits", "contributors", "bus-factor", "activity", "health"}
	embedURL := fmt.Sprintf("https://github.com/%s/%s", owner, repo)
	var results []namedBadge
	total := len(types)

	for i, t := range types {
		percent := int(float64(i) / float64(total) * 100)
		publishProgress("generate", fmt.Sprintf("Generating %s badge GIF (%d/%d)...", t, i+1, total), percent)

		gifBytes, err := generateGIFBadge(buildGIFBadge(data, t))
		if err != nil {
			publishProgress("generate", fmt.Sprintf("Failed to generate %s badge: %s", t, err.Error()), percent)
			continue
		}

		publishProgress("imgbb", fmt.Sprintf("Uploading %s badge to imgbb...", t), percent+3)

		filename := fmt.Sprintf("gitviz-%s-%s", repo, t)
		d, err := uploadToImgBB(gifBytes, filename)
		if err != nil {
			publishProgress("imgbb", fmt.Sprintf("Upload failed for %s: %s", t, err.Error()), percent+3)
			continue
		}

		markdown := fmt.Sprintf("[![GitViz %s](%s)](%s)", t, d.URL, embedURL)
		html := fmt.Sprintf("<a href=\"%s\"><img src=\"%s\" alt=\"GitViz %s\"/></a>", embedURL, d.URL, t)

		results = append(results, namedBadge{
			Name: fmt.Sprintf("GitViz %s", t),
			Type: t,
			URL:  d.URL,
			MD:   markdown,
			HTML: html,
		})

		publishProgress("imgbb", fmt.Sprintf("Uploaded %s → %s", t, d.URL), percent+5)
		time.Sleep(200 * time.Millisecond)
	}

	publishProgress("done", fmt.Sprintf("All %d badges uploaded successfully!", len(results)), 100)
	publishDone()

	writeJSON(w, batchUploadResult{Badges: results})
}
