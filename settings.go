package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sync"
)

type AppSettings struct {
	GitHubClientID     string `json:"github_client_id"`
	GitHubClientSecret string `json:"github_client_secret"`
	GitHubToken        string `json:"github_token"`
	ImgBBAPIKey        string `json:"imgbb_api_key"`
	Port               string `json:"port"`
}

var (
	currentSettings = &AppSettings{}
	settingsMu      sync.RWMutex
	settingsFile    = "settings.json"
)

func loadSettings() {
	data, err := os.ReadFile(settingsFile)
	if err != nil {
		cwd, _ := os.Getwd()
		defaultFile := filepath.Join(cwd, "default-settings.json")
		data, err = os.ReadFile(defaultFile)
		if err != nil {
			return
		}
	}
	var s AppSettings
	if json.Unmarshal(data, &s) == nil {
		settingsMu.Lock()
		currentSettings = &s
		settingsMu.Unlock()
		applySettings()
	}
}

func saveSettings(s *AppSettings) error {
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(settingsFile, data, 0600); err != nil {
		return err
	}
	settingsMu.Lock()
	currentSettings = s
	settingsMu.Unlock()
	applySettings()
	return nil
}

func applySettings() {
	settingsMu.RLock()
	defer settingsMu.RUnlock()

	if currentSettings.GitHubClientID != "" {
		githubClientID = currentSettings.GitHubClientID
	} else if githubClientID == "" {
		githubClientID = getDecryptedClientID()
	}
	if currentSettings.GitHubClientSecret != "" {
		githubClientSecret = currentSettings.GitHubClientSecret
	} else if githubClientSecret == "" {
		githubClientSecret = getDecryptedClientSecret()
	}
	if currentSettings.GitHubToken != "" {
		githubToken = currentSettings.GitHubToken
	} else if githubToken == "" {
		githubToken = getDecryptedToken()
	}
	if currentSettings.ImgBBAPIKey != "" {
		imgbbAPIKey = currentSettings.ImgBBAPIKey
	} else if imgbbAPIKey == "" {
		imgbbAPIKey = getDecryptedImgBB()
	}
}

func getSettings() *AppSettings {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	s := *currentSettings
	return &s
}

func handleGetSettings(w http.ResponseWriter, r *http.Request) {
	s := getSettings()
	if s.GitHubClientSecret != "" {
		s.GitHubClientSecret = "***"
	}
	if s.GitHubToken != "" {
		s.GitHubToken = "***"
	}
	if s.ImgBBAPIKey != "" {
		s.ImgBBAPIKey = "***"
	}
	writeJSON(w, s)
}

func handleSaveSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, "POST required", 405)
		return
	}

	var incoming AppSettings
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		writeError(w, "invalid json", 400)
		return
	}

	existing := getSettings()

	if incoming.GitHubClientID == "***" || incoming.GitHubClientID == "" {
		incoming.GitHubClientID = existing.GitHubClientID
	}
	if incoming.GitHubClientSecret == "***" || incoming.GitHubClientSecret == "" {
		incoming.GitHubClientSecret = existing.GitHubClientSecret
	}
	if incoming.GitHubToken == "***" || incoming.GitHubToken == "" {
		incoming.GitHubToken = existing.GitHubToken
	}
	if incoming.ImgBBAPIKey == "***" || incoming.ImgBBAPIKey == "" {
		incoming.ImgBBAPIKey = existing.ImgBBAPIKey
	}
	if incoming.Port == "" {
		incoming.Port = existing.Port
	}

	if err := saveSettings(&incoming); err != nil {
		writeError(w, "save failed: "+err.Error(), 500)
		return
	}

	writeJSON(w, map[string]string{"status": "saved"})
}

func init() {
	cwd, _ := os.Getwd()
	settingsFile = filepath.Join(cwd, "settings.json")
	loadSettings()
}
