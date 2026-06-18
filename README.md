# GitViz

Real-time GitHub repository analytics dashboard. Enter any public repo URL and get commit frequency, contributor breakdown, language distribution, bus factor analysis, and embeddable SVG badges for your README.

No database needed. No JavaScript framework. Single Go binary.

## Features

- **Repo overview** — stars, forks, open issues, PRs, license, primary language
- **Language breakdown** — bar chart of languages by byte count
- **Commit activity** — weekly commit frequency chart from last 100 commits
- **Top contributors** — sorted by commit count with additions/deletions and ownership percentage
- **Bus factor** — minimum contributors needed to account for 50% of all code changes
- **Recent releases** — latest releases with timestamps
- **SVG badge** — embeddable live stats badge for any README
- **GitHub OAuth** — login to increase API rate limit from 60 to 5000 requests/hour
- **Token mode** — set `GITHUB_TOKEN` env var to skip OAuth setup

## Quick start

```bash
# Set a GitHub token (get one at https://github.com/settings/tokens)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Run the server
./gitviz

# Open http://localhost:8080
```

Without a token, the GitHub API limits you to 60 unauthenticated requests per hour. With a token, you get 5000/hour.

## Setup OAuth (optional)

1. Go to https://github.com/settings/developers and create a new OAuth App
2. Set Homepage URL to `http://localhost:8080`
3. Set Authorization callback URL to `http://localhost:8080/auth/callback`
4. Run with:

```bash
export GITHUB_CLIENT_ID=your_client_id
export GITHUB_CLIENT_SECRET=your_client_secret
export GITHUB_TOKEN=your_token   # fallback for badge generation
./gitviz
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard UI |
| `GET /api/repo?url=https://github.com/user/repo` | Repository analytics (JSON) |
| `GET /api/badge?url=https://github.com/user/repo` | SVG badge for README |
| `GET /api/user` | Current auth status |
| `GET /auth/github` | Start OAuth login |
| `GET /api/logout` | Logout |

### Badge embed

Add this to any README:

```markdown
[![GitViz](http://your-server:8080/api/badge?url=https://github.com/user/repo)](https://github.com/user/repo)
```

## How bus factor works

The bus factor answers: *"How many contributors would need to be hit by a bus before the project is in trouble?"*

It counts the minimum number of top contributors whose combined code changes (additions + deletions) reach 50% of the project total. A bus factor of 1 means a single person owns the majority of the code.

## Tech

Single Go binary, zero runtime dependencies. Uses the GitHub GraphQL API (single query fetches all data). Frontend is vanilla JS with Canvas 2D charts.

## License

MIT
