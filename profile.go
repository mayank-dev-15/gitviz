package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"time"
)

type ProfileData struct {
	Login             string            `json:"login"`
	Name              string            `json:"name"`
	Bio               string            `json:"bio"`
	AvatarURL         string            `json:"avatar_url"`
	HTMLURL           string            `json:"html_url"`
	Location          string            `json:"location"`
	Company           string            `json:"company"`
	Blog              string            `json:"blog"`
	Email             string            `json:"email"`
	TwitterUsername   string            `json:"twitter_username"`
	PublicRepos       int               `json:"public_repos"`
	PublicGists       int               `json:"public_gists"`
	Followers         int               `json:"followers"`
	Following         int               `json:"following"`
	TotalStars        int               `json:"total_stars"`
	TotalForks        int               `json:"total_forks"`
	TotalWatchers     int               `json:"total_watchers"`
	TotalIssues       int               `json:"total_issues"`
	AccountAge        string            `json:"account_age"`
	TopLanguages     []LangEntry       `json:"top_languages"`
	Repos             []ProfileRepo     `json:"repos"`
	RecentActivity    []ActivityEvent   `json:"recent_activity"`
	FetchedAt         time.Time         `json:"fetched_at"`
}

type ProfileRepo struct {
	Name        string `json:"name"`
	FullName    string `json:"full_name"`
	Description string `json:"description"`
	Stars       int    `json:"stargazers_count"`
	Forks       int    `json:"forks_count"`
	Language    string `json:"language"`
	UpdatedAt   string `json:"updated_at"`
	HTMLURL     string `json:"html_url"`
	IsFork      bool   `json:"fork"`
	IsArchived  bool   `json:"archived"`
	OpenIssues  int    `json:"open_issues_count"`
	Watchers    int    `json:"watchers_count"`
}

type ActivityEvent struct {
	Type      string `json:"type"`
	Repo      string `json:"repo"`
	CreatedAt string `json:"created_at"`
}

func fetchProfileData(username, token string) (*ProfileData, error) {
	baseURL := "https://api.github.com"
	headers := map[string]string{"User-Agent": "GitViz", "Accept": "application/vnd.github.v3+json"}
	if token != "" {
		headers["Authorization"] = "Bearer " + token
	}

	// Fetch user profile
	userData, err := ghREST(baseURL+"/users/"+username, headers)
	if err != nil {
		return nil, fmt.Errorf("user fetch failed: %w", err)
	}

	var user struct {
		Login             string `json:"login"`
		Name              string `json:"name"`
		Bio               string `json:"bio"`
		AvatarURL         string `json:"avatar_url"`
		HTMLURL           string `json:"html_url"`
		Location          string `json:"location"`
		Company           string `json:"company"`
		Blog              string `json:"blog"`
		Email             string `json:"email"`
		TwitterUsername   string `json:"twitter_username"`
		PublicRepos       int    `json:"public_repos"`
		PublicGists       int    `json:"public_gists"`
		Followers         int    `json:"followers"`
		Following         int    `json:"following"`
		CreatedAt         string `json:"created_at"`
	}
	if err := json.Unmarshal(userData, &user); err != nil {
		return nil, fmt.Errorf("parse user: %w", err)
	}

	profile := &ProfileData{
		Login:       user.Login,
		Name:        user.Name,
		Bio:         user.Bio,
		AvatarURL:   user.AvatarURL,
		HTMLURL:     user.HTMLURL,
		Location:    user.Location,
		Company:     user.Company,
		Blog:        user.Blog,
		Email:       user.Email,
		TwitterUsername: user.TwitterUsername,
		PublicRepos: user.PublicRepos,
		PublicGists: user.PublicGists,
		Followers:   user.Followers,
		Following:   user.Following,
		FetchedAt:   time.Now(),
	}

	if t, err := time.Parse(time.RFC3339, user.CreatedAt); err == nil {
		age := time.Since(t)
		days := int(age.Hours() / 24)
		profile.AccountAge = fmt.Sprintf("%d years, %d days", days/365, days%365)
	}

	// Fetch all repos (up to 100)
	reposData, err := ghREST(baseURL+"/users/"+username+"/repos?per_page=100&sort=updated", headers)
	if err == nil {
		var repos []ProfileRepo
		if err := json.Unmarshal(reposData, &repos); err == nil {
			langMap := make(map[string]int)
			for _, r := range repos {
				profile.TotalStars += r.Stars
				profile.TotalForks += r.Forks
				profile.TotalWatchers += r.Watchers
				profile.TotalIssues += r.OpenIssues
				if r.Language != "" {
					langMap[r.Language] += 1
				}
			}
			profile.Repos = repos

			type langCount struct {
				Name  string
				Count int
			}
			var sorted []langCount
			for l, c := range langMap {
				sorted = append(sorted, langCount{l, c})
			}
			sort.Slice(sorted, func(i, j int) bool { return sorted[i].Count > sorted[j].Count })
			for _, l := range sorted {
				profile.TopLanguages = append(profile.TopLanguages, LangEntry{
					Name: l.Name, Pct: float64(l.Count) / float64(len(repos)) * 100,
				})
			}
		}
	}

	// Fetch recent events
	eventsData, err := ghREST(baseURL+"/users/"+username+"/events/public?per_page=30", headers)
	if err == nil {
		var events []struct {
			Type      string `json:"type"`
			CreatedAt string `json:"created_at"`
			Repo      struct {
				Name string `json:"name"`
			} `json:"repo"`
		}
		if err := json.Unmarshal(eventsData, &events); err == nil {
			for _, e := range events {
				profile.RecentActivity = append(profile.RecentActivity, ActivityEvent{
					Type:      e.Type,
					Repo:      e.Repo.Name,
					CreatedAt: e.CreatedAt,
				})
			}
		}
	}

	return profile, nil
}

func ghREST(url string, headers map[string]string) (json.RawMessage, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body[:min(len(body), 200)]))
	}
	return body, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func handleProfile(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		writeError(w, "missing username", 400)
		return
	}

	publishProgress("validate", "Validating username...", 5)

	var token string
	sid := getSessionID(r)
	if sid != "" {
		if sess := globalStore.GetSession(sid); sess != nil {
			token = sess.Token
		}
	}
	if token == "" {
		token = githubToken
	}

	publishProgress("fetch", "Fetching GitHub profile for "+username+"...", 20)
	data, err := fetchProfileData(username, token)
	if err != nil {
		publishError("profile fetch failed: " + err.Error())
		writeError(w, "fetch failed: "+err.Error(), 502)
		return
	}

	publishProgress("process", "Analyzing repositories and languages...", 70)
	time.Sleep(30 * time.Millisecond)

	publishProgress("finalize", "Building profile model...", 95)
	time.Sleep(20 * time.Millisecond)

	publishProgress("done", "Profile analysis complete!", 100)
	publishDone()

	writeJSON(w, data)
}
