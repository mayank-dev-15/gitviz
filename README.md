██╗  ██╗██╗████████╗██╗   ██╗██╗███████╗
██║  ██║██║╚══██╔══╝██║   ██║██║╚══███╔╝
███████║██║   ██║   ██║   ██║██║  ███╔╝ 
██╔══██║██║   ██║   ╚██╗ ██╔╝██║ ███╔╝  
██║  ██║██║   ██║    ╚████╔╝ ██║███████╗
╚═╝  ╚═╝╚═╝   ╚═╝     ╚═══╝  ╚═╝╚══════╝

Real-time GitHub repository analytics dashboard. Single Go binary, zero runtime dependencies.

## Features

- **Live stats** — stars, forks, open issues, PRs, license, language
- **Commit analytics** — weekly frequency chart, additions/deletions, top contributors
- **Bus factor** — minimum contributors owning 50% of the codebase
- **Language breakdown** — color-coded bar chart by byte count
- **SVG badges** — embeddable live badges for any README
- **GitHub OAuth** — sign in with GitHub to browse your repos (like Vercel)
- **Animated UI** — glassmorphism design, canvas charts, shimmer loading, count-up animations

## Quick start

```bash
# Set a GitHub personal access token (get one at github.com/settings/tokens)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Run
./gitviz

# Open http://localhost:8080
```

Without a token, GitHub limits you to 60 unauthenticated API requests/hour. With a token, 5000/hour.

## OAuth setup (optional, for "Sign in with GitHub")

1. Go to **https://github.com/settings/developers** → **OAuth Apps** → **New OAuth App**
2. Fill:
   - **Application name:** `GitViz`
   - **Homepage URL:** `http://localhost:8080`
   - **Authorization callback URL:** `http://localhost:8080/auth/callback`
3. Register, then copy the **Client ID** and **Client Secret**

```bash
export GITHUB_CLIENT_ID=your_client_id
export GITHUB_CLIENT_SECRET=your_client_secret
export GITHUB_TOKEN=your_token     # fallback for unauthenticated API calls
./gitviz
```

When you click **Sign in with GitHub**, it redirects to GitHub for authorization, then fetches your repos and lists them on the landing page. Click any repo to analyze it.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard UI (animated landing + analytics) |
| `GET /api/repo?url=https://github.com/user/repo` | Full repository analytics (JSON) |
| `GET /api/user/repos` | List authenticated user's public repos (requires OAuth or token) |
| `GET /api/badge?url=https://github.com/user/repo` | SVG badge image for READMEs |
| `GET /api/user` | Current auth status |
| `GET /auth/github` | Start OAuth login flow |
| `GET /api/logout` | Logout |

### Badge embed for README

```markdown
[![GitViz](http://your-server:8080/api/badge?url=https://github.com/user/repo)](https://github.com/user/repo)
```

## Build from source

```bash
go build -ldflags="-s -w" -o gitviz.exe .
```

Produces a ~7 MB standalone binary.

## Tech

- **Backend:** Go (stdlib only — `net/http`, `encoding/json`, `crypto`)
- **Frontend:** Vanilla JS (Canvas 2D charts, CSS animations, glassmorphism)
- **API:** GitHub GraphQL (single query fetches all repo data)
- **Auth:** GitHub OAuth (signed cookies, no external deps)

## License

MIT
