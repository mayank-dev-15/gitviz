package main

import (
	"fmt"
	"net/http"
	"strings"
)

func handleBadge(w http.ResponseWriter, r *http.Request) {
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

	w.Header().Set("Content-Type", "image/svg+xml;charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=600")

	stars := fmt.Sprintf("%d", data.Stars)
	forks := fmt.Sprintf("%d", data.Forks)
	issues := fmt.Sprintf("%d", data.OpenIssues)
	lang := data.PrimaryLang
	if lang == "" {
		lang = "N/A"
	}

	leftText := data.FullName
	rightText := fmt.Sprintf("⭐ %s  🍴 %s  ⚠ %s  %s", stars, forks, issues, lang)
	lw := len(leftText)*8 + 16
	rw := len(rightText)*8 + 16
	tw := lw + rw

	fmt.Fprintf(w, `<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="20">
  <linearGradient id="b" x2="0" y2="100%%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <rect rx="3" width="%d" height="20" fill="#555"/>
  <rect x="%d" width="1" height="20" fill="#555"/>
  <rect rx="3" x="%d" width="%d" height="20" fill="#238636"/>
  <rect x="%d" width="1" height="20" fill="#555"/>
  <rect width="%d" height="20" fill="url(#b)"/>
  <g fill="#fff" font-family="Verdana,sans-serif" font-size="11">
    <text x="8" y="14">%s</text>
    <text x="%d" y="14" text-anchor="middle">%s</text>
  </g>
</svg>`, tw, lw, lw, lw, rw, lw+rw, tw, escXML(leftText), lw+rw/2, escXML(rightText))
}

func escXML(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", "\"", "&quot;", "'", "&#39;").Replace(s)
}

func badgeSVG(left, right, color string) string {
	left = escXML(left)
	right = escXML(right)
	lw := len(left)*7 + 12
	rw := len(right)*7 + 12
	tw := lw + rw
	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="20">
  <linearGradient id="s" x2="0" y2="100%%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <rect rx="3" width="%d" height="20" fill="#555"/>
  <rect rx="3" x="%d" width="%d" height="20" fill="%s"/>
  <rect fill="%s" x="%d" width="1" height="20"/>
  <rect rx="3" width="%d" height="20" fill="url(#s)"/>
  <g fill="#fff" font-family="Verdana,sans-serif" font-size="11">
    <text x="6" y="14">%s</text>
    <text x="%d" y="14" text-anchor="middle">%s</text>
  </g>
</svg>`, tw, lw, lw, rw, color, color, lw, tw, left, lw+rw/2, right)
}
