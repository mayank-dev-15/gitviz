# GitViz — Real-Time GitHub Repository Analytics Dashboard

A full-featured, real-time GitHub repository analytics dashboard with animated badges, interactive charts, and cloud badge hosting. Built with Go backend and vanilla JavaScript frontend — zero frameworks, zero build tools.

![GitViz](https://i.ibb.co/Hf2f1LnX/gitviz-mayank-dev-15-overview.gif)

## Features

- **Repository Analytics** — Stars, forks, issues, PRs, contributors, commit history, releases
- **Interactive Charts** — Donut pie chart for language distribution, radar/star graph for repo metrics, commit activity area chart
- **Animated GIF Badges** — 10 badge types (overview, stars, forks, issues, language, commits, contributors, bus factor, activity, health) + pie chart
- **Static SVG Badges** — Shields-style badges with gradients and glow effects
- **Animated SVG Badges** — SMIL-animated SVGs with counters, progress bars, shimmer effects
- **Cloud Badge Hosting** — Upload badges to imgbb for permanent URLs in READMEs
- **GitHub OAuth** — Sign in with GitHub to see your own repositories
- **Interactive UI** — Cursor glow trail, floating particles, button ripples, scroll reveal, hover effects, tooltips
- **Settings GUI** — Configure all API keys through the web interface (no code editing needed)
- **Responsive Design** — Works on desktop and mobile
- **Zero Dependencies** — Pure Go stdlib backend, vanilla JS frontend

## Quick Start

### Prerequisites

- **Go 1.22+** — [Download Go](https://go.dev/dl/)
- **GitHub Account** — For generating a personal access token

### Step 1: Clone the Repository

```bash
git clone https://github.com/mayank-dev-15/gitviz.git
cd gitviz
```

### Step 2: Build and Run

```bash
# Build the binary
go build -o gitviz.exe .

# Run the server
./gitviz.exe
```

The server starts on `http://localhost:8080`. Open it in your browser.

### Step 3: Configure Settings

1. Click the **gear icon** (⚙) in the top-right corner of the navigation bar
2. Enter your **GitHub Personal Access Token** (required)
3. Optionally enter your **GitHub OAuth App** credentials (for "Sign in with GitHub")
4. Optionally enter your **imgbb API key** (for cloud badge uploads)
5. Click **Save Settings**

> Your settings are stored locally in `settings.json` on your machine. They are never sent anywhere except the respective APIs.

## Step-by-Step Setup Guide

### Getting a GitHub Personal Access Token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Give it a name like `GitViz`
4. Select the **`repo`** scope (full control of private repositories)
5. Click **Generate token**
6. Copy the token (`ghp_xxxxxxxxxxxxxxxxxxxx`)
7. Open GitViz → Click the ⚙ icon → Paste the token → Save

### Getting a GitHub OAuth App (Optional)

This enables the "Sign in with GitHub" button to see your own repos.

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** GitViz
   - **Homepage URL:** `http://localhost:8080`
   - **Authorization callback URL:** `http://localhost:8080/auth/callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it
7. Open GitViz → Click ⚙ → Paste both values → Save

### Getting an imgbb API Key (Optional)

This enables uploading badges to the cloud for permanent URLs.

1. Go to [api.imgbb.com](https://api.imgbb.com/)
2. Sign up for a free account
3. Go to your account settings to find your API key
4. Open GitViz → Click ⚙ → Paste the key → Save

## Usage

### Analyzing a Repository

1. Type a GitHub URL or `owner/repo` format in the search bar
2. Press Enter or click **Analyze**
3. View the dashboard with all analytics

### Using Your Own Repos

1. Click **Sign in with GitHub** (requires OAuth App setup)
2. Your repositories appear in the sidebar
3. Click any repo to analyze it

### Embedding Badges

1. After analyzing a repo, scroll to **Embed Badges for README**
2. Click any badge to copy its Markdown code
3. Paste into your GitHub README.md
4. Or click **Upload All to imgbb** for cloud-hosted permanent URLs

### Downloading Badges

- Click the download icon on any badge to get the animated GIF
- Click **Download All SVGs** to get all badge files

## Badge Types

| Badge | Description |
|-------|-------------|
| Overview | Repo name + language + star rating |
| Stars | Star count with rating |
| Forks | Fork count |
| Issues | Open issues count |
| Language | Primary language |
| Commits | Total commit count |
| Contributors | Number of contributors |
| Bus Factor | Bus factor with risk rating |
| Activity | Recent commit frequency |
| Health Score | Overall repo health (0-100) |
| Pie Chart | Language distribution donut chart |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Go (stdlib only) |
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Charts | HTML5 Canvas API |
| Badges | Go `image/gif` + `fogleman/gg` + `disintegration/imaging` |
| Font | Comic Sans MS (system font) |
| GitHub API | GraphQL (single query) |
| Auth | GitHub OAuth 2.0 |
| Cloud Hosting | imgbb API |

## Project Structure

```
gitviz/
├── main.go           # Server, routes, session management, middleware
├── github.go         # GitHub GraphQL API client
├── badges.go         # Static SVG badge generation
├── badges_live.go    # Animated SVG badge generation
├── badges_gif.go     # Animated GIF badge generation (fogleman/gg)
├── pie_chart.go      # Language distribution pie chart GIF
├── imgbb.go          # imgbb cloud upload API
├── settings.go       # Settings API (GUI-configured)
├── go.mod            # Go module definition
├── ui/
│   ├── index.html    # Dashboard HTML
│   ├── style.css     # Glassmorphism dark theme + animations
│   └── app.js        # Interactive charts, OAuth, settings modal
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/repo?url=...` | Analyze a repository |
| GET | `/api/user` | Get authenticated user |
| GET | `/api/user/repos` | Get user's repositories |
| GET | `/api/badge?url=...&type=...` | Static SVG badge |
| GET | `/api/badge/live?url=...&type=...` | Animated SVG badge |
| GET | `/api/badge/gif?url=...&type=...` | Animated GIF badge |
| GET | `/api/badge/pie?url=...` | Pie chart GIF |
| POST | `/api/badge/upload?url=...&type=...` | Upload single badge to imgbb |
| POST | `/api/badge/upload-all?url=...` | Upload all badges to imgbb |
| GET | `/api/settings` | Get current settings |
| POST | `/api/settings` | Save settings |
| GET | `/auth/github` | Start GitHub OAuth flow |
| GET | `/auth/callback` | OAuth callback |

## Configuration

All settings can be configured through the web GUI (click ⚙ in the nav bar). Settings are stored in `settings.json` in the project root.

Alternatively, you can set environment variables:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export GITHUB_CLIENT_ID=Iv23ctNGwnaty0r1PcMy
export GITHUB_CLIENT_SECRET=eb9f403eded7a31b9a6ec1fdbfd1b78deff491c0
export IMGBB_API_KEY=529c9d39ee222cb3215338cf3e5a1969
export PORT=8080
```

> GUI settings take precedence over environment variables.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Author

**mayank-dev-15** — [GitHub](https://github.com/mayank-dev-15)
