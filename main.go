package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

var (
	githubClientID     = os.Getenv("GITHUB_CLIENT_ID")
	githubClientSecret = os.Getenv("GITHUB_CLIENT_SECRET")
	sessionSecret      = os.Getenv("SESSION_SECRET")
	githubToken        = os.Getenv("GITHUB_TOKEN")
	globalStore        *Store
)

func init() {
	if sessionSecret == "" {
		b := make([]byte, 32)
		rand.Read(b)
		sessionSecret = hex.EncodeToString(b)
	}
}

type Session struct {
	Token     string    `json:"token"`
	Login     string    `json:"login"`
	AvatarURL string    `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}

type Store struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	cache    map[string]*RepoData
	filePath string
}

func NewStore() *Store {
	s := &Store{
		sessions: make(map[string]*Session),
		cache:    make(map[string]*RepoData),
		filePath: "gitviz.json",
	}
	s.load()
	return s
}

func (s *Store) load() {
	b, err := os.ReadFile(s.filePath)
	if err != nil {
		return
	}
	var data struct {
		Sessions map[string]*Session `json:"sessions"`
		Cache    map[string]*RepoData `json:"cache"`
	}
	if json.Unmarshal(b, &data) == nil {
		s.mu.Lock()
		if data.Sessions != nil {
			s.sessions = data.Sessions
		}
		if data.Cache != nil {
			s.cache = data.Cache
		}
		s.mu.Unlock()
	}
}

func (s *Store) save() {
	s.mu.RLock()
	data := struct {
		Sessions map[string]*Session   `json:"sessions"`
		Cache    map[string]*RepoData  `json:"cache"`
	}{s.sessions, s.cache}
	s.mu.RUnlock()
	b, _ := json.MarshalIndent(data, "", "  ")
	os.WriteFile(s.filePath, b, 0644)
}

func (s *Store) GetSession(id string) *Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sessions[id]
}

func (s *Store) SetSession(id string, sess *Session) {
	s.mu.Lock()
	s.sessions[id] = sess
	s.mu.Unlock()
	s.save()
}

func (s *Store) DeleteSession(id string) {
	s.mu.Lock()
	delete(s.sessions, id)
	s.mu.Unlock()
	s.save()
}

func (s *Store) GetCached(key string) *RepoData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d := s.cache[key]
	if d != nil && time.Since(d.FetchedAt) < 10*time.Minute {
		return d
	}
	return nil
}

func (s *Store) SetCache(key string, data *RepoData) {
	s.mu.Lock()
	s.cache[key] = data
	s.mu.Unlock()
	s.save()
}

type Stats struct {
	TotalCommits   int              `json:"total_commits"`
	TotalAdditions int              `json:"total_additions"`
	TotalDeletions int              `json:"total_deletions"`
	Authors        []AuthorStat     `json:"authors"`
	WeeklyCommits  []WeekBucket     `json:"weekly_commits"`
	BusFactor      int              `json:"bus_factor"`
	BusFactorPct   float64          `json:"bus_factor_pct"`
}

type AuthorStat struct {
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Commits   int    `json:"commits"`
	Additions int    `json:"additions"`
	Deletions int    `json:"deletions"`
	Pct       float64 `json:"pct"`
}

type WeekBucket struct {
	Week    string `json:"week"`
	Commits int    `json:"commits"`
}

type RepoData struct {
	FullName     string            `json:"full_name"`
	Description  string            `json:"description"`
	URL          string            `json:"url"`
	Stars        int               `json:"stars"`
	Forks        int               `json:"forks"`
	OpenIssues   int               `json:"open_issues"`
	OpenPRs      int               `json:"open_prs"`
	License      string            `json:"license"`
	PrimaryLang  string            `json:"primary_lang"`
	Languages    []LangEntry        `json:"languages"`
	Stats        Stats             `json:"stats"`
	Releases     []ReleaseEntry    `json:"releases"`
	FetchedAt    time.Time         `json:"fetched_at"`
	Owner        string            `json:"owner"`
	Repo         string            `json:"repo"`
}

type LangEntry struct {
	Name  string  `json:"name"`
	Bytes int     `json:"bytes"`
	Color string  `json:"color"`
	Pct   float64 `json:"pct"`
}

type ReleaseEntry struct {
	Name      string `json:"name"`
	TagName   string `json:"tag_name"`
	Published string `json:"published_at"`
	URL       string `json:"url"`
}

func signSessionID(id string) string {
	mac := hmac.New(sha256.New, []byte(sessionSecret))
	mac.Write([]byte(id))
	return hex.EncodeToString(mac.Sum(nil))
}

func generateSessionID() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func main() {
	globalStore = NewStore()

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			globalStore.save()
		}
	}()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /auth/github", handleAuthRedirect)
	mux.HandleFunc("GET /auth/callback", handleAuthCallback)
	mux.HandleFunc("GET /api/user", handleUser)
	mux.HandleFunc("GET /api/repo", handleRepo)
	mux.HandleFunc("GET /api/badge", handleBadge)
	mux.HandleFunc("GET /api/logout", handleLogout)

	exe, _ := os.Executable()
	uiDir := filepath.Join(filepath.Dir(exe), "ui")
	mux.Handle("GET /", http.FileServer(http.Dir(uiDir)))

	handler := corsMiddleware(logMiddleware(mux))

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		globalStore.save()
		os.Exit(0)
	}()

	addr := ":8080"
	if v := os.Getenv("PORT"); v != "" {
		addr = ":" + v
	}
	log.Printf("GitViz running on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}

func getSessionID(r *http.Request) string {
	c, err := r.Cookie("gv_session")
	if err != nil {
		return ""
	}
	parts := strings.SplitN(c.Value, ".", 2)
	if len(parts) != 2 {
		return ""
	}
	sig := signSessionID(parts[0])
	if !hmac.Equal([]byte(sig), []byte(parts[1])) {
		return ""
	}
	return parts[0]
}

func setSessionCookie(w http.ResponseWriter, id string) {
	sig := signSessionID(id)
	http.SetCookie(w, &http.Cookie{
		Name:     "gv_session",
		Value:    id + "." + sig,
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func handleAuthRedirect(w http.ResponseWriter, r *http.Request) {
	if githubClientID == "" {
		writeError(w, "GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or use GITHUB_TOKEN.", 400)
		return
	}
	redirectURI := fmt.Sprintf("https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=read:user,public_repo",
		githubClientID, url.QueryEscape("http://"+r.Host+"/auth/callback"))
	http.Redirect(w, r, redirectURI, 302)
}

func handleAuthCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		writeError(w, "missing code", 400)
		return
	}

	v := url.Values{"client_id": {githubClientID}, "client_secret": {githubClientSecret}, "code": {code}}
	resp, err := http.PostForm("https://github.com/login/oauth/access_token", v)
	if err != nil {
		writeError(w, "token exchange failed", 502)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	q, _ := url.ParseQuery(string(body))
	token := q.Get("access_token")
	if token == "" {
		writeError(w, "no token returned", 502)
		return
	}

	user, err := fetchGitHubUser(token)
	if err != nil {
		writeError(w, "failed to fetch user", 502)
		return
	}

	id := generateSessionID()
	globalStore.SetSession(id, &Session{Token: token, Login: user["login"], AvatarURL: user["avatar_url"], CreatedAt: time.Now()})
	setSessionCookie(w, id)
	http.Redirect(w, r, "/", 302)
}

func handleUser(w http.ResponseWriter, r *http.Request) {
	sid := getSessionID(r)
	if sid == "" && githubToken != "" {
		writeJSON(w, map[string]interface{}{"logged_in": false, "token_mode": true})
		return
	}
	if sid == "" {
		writeJSON(w, map[string]interface{}{"logged_in": false, "token_mode": false})
		return
	}
	sess := globalStore.GetSession(sid)
	if sess == nil {
		writeJSON(w, map[string]interface{}{"logged_in": false})
		return
	}
	writeJSON(w, map[string]interface{}{"logged_in": true, "login": sess.Login, "avatar_url": sess.AvatarURL})
}

func handleRepo(w http.ResponseWriter, r *http.Request) {
	repoURL := r.URL.Query().Get("url")
	if repoURL == "" {
		writeError(w, "missing url parameter", 400)
		return
	}

	owner, repo, err := parseRepoURL(repoURL)
	if err != nil {
		writeError(w, "invalid repo URL: "+err.Error(), 400)
		return
	}

	key := owner + "/" + repo
	if cached := globalStore.GetCached(key); cached != nil {
		writeJSON(w, cached)
		return
	}

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

	data, err := fetchRepoData(owner, repo, token)
	if err != nil {
		writeError(w, "fetch failed: "+err.Error(), 502)
		return
	}

	globalStore.SetCache(key, data)
	writeJSON(w, data)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	sid := getSessionID(r)
	if sid != "" {
		globalStore.DeleteSession(sid)
	}
	http.SetCookie(w, &http.Cookie{Name: "gv_session", Value: "", Path: "/", MaxAge: -1})
	http.Redirect(w, r, "/", 302)
}

func parseRepoURL(raw string) (string, string, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimSuffix(raw, ".git")
	if strings.HasPrefix(raw, "https://github.com/") {
		raw = strings.TrimPrefix(raw, "https://github.com/")
	} else if strings.HasPrefix(raw, "http://github.com/") {
		raw = strings.TrimPrefix(raw, "http://github.com/")
	} else if strings.HasPrefix(raw, "github.com/") {
		raw = strings.TrimPrefix(raw, "github.com/")
	} else {
		return "", "", fmt.Errorf("not a github.com URL")
	}
	parts := strings.SplitN(raw, "/", 3)
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("invalid repo path")
	}
	return parts[0], strings.TrimSuffix(parts[1], ".git"), nil
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

func fetchGitHubUser(token string) (map[string]string, error) {
	req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("User-Agent", "GitViz")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var user struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return map[string]string{"login": user.Login, "avatar_url": user.AvatarURL}, nil
}
