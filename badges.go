package main

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
)

var langColors = map[string]string{
	"JavaScript": "#f1e05a", "TypeScript": "#3178c6", "Python": "#3572A5",
	"Java": "#b07219", "Go": "#00ADD8", "Rust": "#dea584", "C": "#555555",
	"C++": "#f34b7d", "C#": "#178600", "Ruby": "#701516", "PHP": "#4F5D95",
	"Swift": "#F05138", "Kotlin": "#A97BFF", "Dart": "#00B4AB", "Lua": "#000080",
	"Shell": "#89e051", "HTML": "#e34c26", "CSS": "#563d7c", "SCSS": "#c6538c",
	"Vue": "#41b883", "Svelte": "#ff3e00", "Haskell": "#5e5086", "Scala": "#c22d40",
	"R": "#198CE7", "Julia": "#a270ba", "Elixir": "#6e4a7e", "Clojure": "#db5855",
	"OCaml": "#3be133", "Perl": "#0298c3", "Zig": "#ec915c", "Nim": "#ffc200",
	"V": "#4f87c4", "Assembly": "#6E4C13", "Makefile": "#427819",
	"Dockerfile": "#384d54", "Jupyter Notebook": "#DA5B0B",
	"Markdown": "#083fa1", "YAML": "#cb171e", "JSON": "#292929", "TOML": "#9c4221",
	"XML": "#0060ac", "SQL": "#e38c00", "Objective-C": "#438eff",
	"Groovy": "#4298b8", "PowerShell": "#012456",
	"Astro": "#ff5a03",
}

func escXML(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", "\"", "&quot;", "'", "&#39;").Replace(s)
}

func handleBadge(w http.ResponseWriter, r *http.Request) {
	repoURL := r.URL.Query().Get("url")
	badgeType := r.URL.Query().Get("type")
	download := r.URL.Query().Get("download") == "true"

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

	if badgeType == "" {
		badgeType = "overview"
	}

	var svg string
	switch badgeType {
	case "stars":
		svg = badgeStars(data)
	case "forks":
		svg = badgeForks(data)
	case "issues":
		svg = badgeIssues(data)
	case "language":
		svg = badgeLanguage(data)
	case "commits":
		svg = badgeCommits(data)
	case "contributors":
		svg = badgeContributors(data)
	case "bus-factor":
		svg = badgeBusFactor(data)
	case "activity":
		svg = badgeActivity(data)
	case "health":
		svg = badgeHealth(data)
	case "overview":
		svg = badgeOverview(data)
	default:
		svg = badgeOverview(data)
	}

	w.Header().Set("Content-Type", "image/svg+xml;charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=300")

	if download {
		filename := fmt.Sprintf("gitviz-%s-%s.svg", repo, badgeType)
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	}

	w.Write([]byte(svg))
}

func handleBadgeDownloadAll(w http.ResponseWriter, r *http.Request) {
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

	types := []string{"overview", "stars", "forks", "issues", "language", "commits", "contributors", "bus-factor", "activity", "health"}
	boundary := "----GitVizBoundary"
	w.Header().Set("Content-Type", "multipart/related; boundary="+boundary)

	for _, t := range types {
		var svg string
		switch t {
		case "stars":
			svg = badgeStars(data)
		case "forks":
			svg = badgeForks(data)
		case "issues":
			svg = badgeIssues(data)
		case "language":
			svg = badgeLanguage(data)
		case "commits":
			svg = badgeCommits(data)
		case "contributors":
			svg = badgeContributors(data)
		case "bus-factor":
			svg = badgeBusFactor(data)
		case "activity":
			svg = badgeActivity(data)
		case "health":
			svg = badgeHealth(data)
		default:
			svg = badgeOverview(data)
		}
		filename := fmt.Sprintf("gitviz-%s-%s.svg", repo, t)
		fmt.Fprintf(w, "--%s\r\nContent-Type: image/svg+xml\r\nContent-Disposition: attachment; filename=\"%s\"\r\n\r\n%s\r\n", boundary, filename, svg)
	}
	fmt.Fprintf(w, "--%s--\r\n", boundary)
}

func badgeSVGTemplate(left, right, leftBg, rightBg, leftColor, rightColor string, width int, height int, glow bool, glowColor string) string {
	lw := len(left)*7 + 16
	rw := len(right)*7 + 16
	if width > 0 {
		lw = width/2
		rw = width - lw
	}
	tw := lw + rw

	glowFilter := ""
	if glow && glowColor != "" {
		glowFilter = fmt.Sprintf(`<filter id="glow" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="%s" flood-opacity="0.6" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, glowColor)
	}
	filterAttr := ""
	if glow && glowColor != "" {
		filterAttr = ` filter="url(#glow)"`
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d">
  <defs>
    <linearGradient id="lg" x2="0" y2="100%%">
      <stop offset="0" stop-color="#fff" stop-opacity=".15"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity=".05"/>
      <stop offset="1" stop-color="#000" stop-opacity=".08"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="%d" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="%d" rx="0 6 6 0" fill="%s"/>
    <rect width="%d" height="%d" rx="6" fill="url(#shine)"/>
    <rect width="%d" height="%d" rx="6" fill="url(#lg)"/>
    <text x="8" y="%d" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600" letter-spacing="0.3">%s</text>
    <text x="%d" y="%d" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700" letter-spacing="0.3">%s</text>
  </g>
</svg>`, tw, height, glowFilter, filterAttr, tw, height, leftBg, lw, rw, height, rightBg, tw, height, tw, height, height/2+4, leftColor, left, lw+rw/2, height/2+4, rightColor, right)
}

func getStarRating(count int) string {
	if count >= 10000 {
		return "\u2605\u2605\u2605\u2605\u2605"
	} else if count >= 5000 {
		return "\u2605\u2605\u2605\u2605"
	} else if count >= 1000 {
		return "\u2605\u2605\u2605"
	} else if count >= 100 {
		return "\u2605\u2605"
	} else if count > 0 {
		return "\u2605"
	}
	return "-"
}

func badgeOverview(data *RepoData) string {
	lang := data.PrimaryLang
	if lang == "" {
		lang = "N/A"
	}
	langColor := langColors[lang]
	if langColor == "" {
		langColor = "#8b949e"
	}
	starRating := getStarRating(data.Stars)

	leftBg := "#24292e"
	rightBg := langColor
	leftColor := "#ffffff"
	rightColor := "#ffffff"

	glow := data.Stars >= 100

	lw := len(data.FullName)*7 + 18
	rw := 78
	tw := lw + rw

	glowFilter := ""
	if glow {
		glowFilter = `<filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feFlood flood-color="#f0c040" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`
	}
	filterAttr := ""
	if glow {
		filterAttr = ` filter="url(#glow)"`
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".2"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity=".06"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    <linearGradient id="lg" x2="0" y2="100%%">
      <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
      <stop offset="1" stop-color="#000" stop-opacity=".08"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <rect width="%d" height="26" rx="6" fill="url(#lg)"/>
    <text x="8" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">%s</text>
    <text x="8" y="17" fill="#f0c040" font-family="'Comic Sans MS',cursive,sans-serif" font-size="9" letter-spacing="1">%s</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700">%s</text>
  </g>
</svg>`, tw, glowFilter, filterAttr, tw, leftBg, lw, rw, rightBg, tw, leftColor, escXML(data.FullName), starRating, lw+rw/2, rightColor, lang)
}

func badgeStars(data *RepoData) string {
	count := data.Stars
	rating := getStarRating(count)
	text := fmt.Sprintf("%s %s", rating, formatCount(count))
	glow := count >= 100
	glowColor := "#f0c040"

	leftBg := "#1a1f36"
	rightBg := "#b8860b"
	leftColor := "#e6edf3"
	rightColor := "#fff8dc"

	lw := 52
	rw := len(text)*7 + 16
	tw := lw + rw

	glowFilter := ""
	if glow {
		glowFilter = fmt.Sprintf(`<filter id="glow" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="%s" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, glowColor)
	}
	filterAttr := ""
	if glow {
		filterAttr = ` filter="url(#glow)"`
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <text x="8" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">Stars</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700">%s</text>
  </g>
</svg>`, tw, glowFilter, filterAttr, tw, leftBg, lw, rw, rightBg, tw, leftColor, lw+rw/2, rightColor, escXML(text))
}

func badgeForks(data *RepoData) string {
	count := data.Forks
	text := formatCount(count)
	glow := count >= 50
	glowColor := "#58a6ff"

	leftBg := "#0d1117"
	rightBg := "#1f6feb"
	leftColor := "#e6edf3"
	rightColor := "#ffffff"

	lw := 48
	rw := len(text)*7 + 16
	tw := lw + rw

	glowFilter := ""
	if glow {
		glowFilter = fmt.Sprintf(`<filter id="glow" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="%s" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, glowColor)
	}
	filterAttr := ""
	if glow {
		filterAttr = ` filter="url(#glow)"`
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <text x="8" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">Forks</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700">%s</text>
  </g>
</svg>`, tw, glowFilter, filterAttr, tw, leftBg, lw, rw, rightBg, tw, leftColor, lw+rw/2, rightColor, escXML(text))
}

func badgeIssues(data *RepoData) string {
	count := data.OpenIssues
	text := formatCount(count)
	glow := count >= 100
	glowColor := "#f85149"

	leftBg := "#0d1117"
	rightBg := "#da3633"
	if count == 0 {
		rightBg = "#238636"
		glowColor = "#238636"
	}
	leftColor := "#e6edf3"
	rightColor := "#ffffff"

	lw := 52
	rw := len(text)*7 + 16
	tw := lw + rw

	glowFilter := ""
	if glow {
		glowFilter = fmt.Sprintf(`<filter id="glow" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="%s" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, glowColor)
	}
	filterAttr := ""
	if glow {
		filterAttr = ` filter="url(#glow)"`
	}

	issueIcon := "\u26a0"
	if count == 0 {
		issueIcon = "\u2714"
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <text x="8" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">%s Issues</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700">%s</text>
  </g>
</svg>`, tw, glowFilter, filterAttr, tw, leftBg, lw, rw, rightBg, tw, leftColor, issueIcon, lw+rw/2, rightColor, escXML(text))
}

func badgeLanguage(data *RepoData) string {
	lang := data.PrimaryLang
	if lang == "" {
		lang = "N/A"
	}
	color := langColors[lang]
	if color == "" {
		color = "#8b949e"
	}

	leftBg := "#0d1117"
	rightBg := color
	leftColor := "#e6edf3"
	rightColor := "#ffffff"

	lw := 72
	rw := len(lang)*7 + 16
	tw := lw + rw

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
  </defs>
  <g>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <circle cx="16" cy="13" r="5" fill="%s"/>
    <text x="26" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">Language</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700">%s</text>
  </g>
</svg>`, tw, lw, leftBg, lw, rw, rightBg, tw, color, leftColor, lw+rw/2, rightColor, escXML(lang))
}

func badgeCommits(data *RepoData) string {
	count := data.Stats.TotalCommits
	text := formatCount(count)
	glow := count >= 1000
	glowColor := "#3fb950"

	leftBg := "#0d1117"
	rightBg := "#238636"
	leftColor := "#e6edf3"
	rightColor := "#ffffff"

	lw := 62
	rw := len(text)*7 + 16
	tw := lw + rw

	glowFilter := ""
	if glow {
		glowFilter = fmt.Sprintf(`<filter id="glow" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="%s" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, glowColor)
	}
	filterAttr := ""
	if glow {
		filterAttr = ` filter="url(#glow)"`
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <text x="8" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">Commits</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700">%s</text>
  </g>
</svg>`, tw, glowFilter, filterAttr, tw, leftBg, lw, rw, rightBg, tw, leftColor, lw+rw/2, rightColor, escXML(text))
}

func badgeContributors(data *RepoData) string {
	count := len(data.Stats.Authors)
	text := strconv.Itoa(count)
	glow := count >= 10
	glowColor := "#a371f7"

	leftBg := "#0d1117"
	rightBg := "#8957e5"
	leftColor := "#e6edf3"
	rightColor := "#ffffff"

	lw := 78
	rw := len(text)*7 + 16
	tw := lw + rw

	glowFilter := ""
	if glow {
		glowFilter = fmt.Sprintf(`<filter id="glow" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="%s" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, glowColor)
	}
	filterAttr := ""
	if glow {
		filterAttr = ` filter="url(#glow)"`
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <text x="8" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">Contributors</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700">%s</text>
  </g>
</svg>`, tw, glowFilter, filterAttr, tw, leftBg, lw, rw, rightBg, tw, leftColor, lw+rw/2, rightColor, escXML(text))
}

func badgeBusFactor(data *RepoData) string {
	bf := data.Stats.BusFactor
	text := strconv.Itoa(bf)
	var label, rightBg, rightColor string

	switch {
	case bf >= 5:
		label = "Bus Factor \u2605\u2605\u2605\u2605\u2605"
		rightBg = "#238636"
		rightColor = "#ffffff"
	case bf >= 3:
		label = "Bus Factor \u2605\u2605\u2605"
		rightBg = "#9e6a03"
		rightColor = "#ffffff"
	case bf >= 2:
		label = "Bus Factor \u2605\u2605"
		rightBg = "#d29922"
		rightColor = "#000000"
	default:
		label = "Bus Factor \u2605"
		rightBg = "#da3633"
		rightColor = "#ffffff"
	}

	leftBg := "#0d1117"
	leftColor := "#e6edf3"

	lw := len(label)*7 + 16
	rw := len(text)*7 + 16
	tw := lw + rw

	glow := bf >= 5
	glowColor := "#3fb950"
	glowFilter := ""
	if glow {
		glowFilter = fmt.Sprintf(`<filter id="glow" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="%s" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, glowColor)
	}
	filterAttr := ""
	if glow {
		filterAttr = ` filter="url(#glow)"`
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <text x="8" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">%s</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="800">%s</text>
  </g>
</svg>`, tw, glowFilter, filterAttr, tw, leftBg, lw, rw, rightBg, tw, leftColor, label, lw+rw/2, rightColor, text)
}

func badgeActivity(data *RepoData) string {
	weeks := data.Stats.WeeklyCommits
	total := 0
	recent := 0
	for i, w := range weeks {
		total += w.Commits
		if i >= len(weeks)-4 {
			recent += w.Commits
		}
	}

	freq := 0.0
	if len(weeks) > 0 {
		freq = float64(total) / float64(len(weeks))
	}
	recentFreq := 0.0
	if len(weeks) > 0 {
		n := len(weeks)
		if n > 4 {
			n = 4
		}
		recentFreq = float64(recent) / float64(n)
	}

	trend := "\u2192"
	trendColor := "#8b949e"
	if recentFreq > freq*1.2 {
		trend = "\u2191"
		trendColor = "#3fb950"
	} else if recentFreq < freq*0.8 && freq > 0 {
		trend = "\u2193"
		trendColor = "#f85149"
	}

	text := fmt.Sprintf("%.0f/wk %s", recentFreq, trend)
	glow := recentFreq >= 10
	glowColor := "#3fb950"

	leftBg := "#0d1117"
	rightBg := "#1f6feb"
	leftColor := "#e6edf3"
	rightColor := "#ffffff"

	lw := 62
	rw := len(text)*7 + 16
	tw := lw + rw

	glowFilter := ""
	if glow {
		glowFilter = fmt.Sprintf(`<filter id="glow" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="%s" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, glowColor)
	}
	filterAttr := ""
	if glow {
		filterAttr = ` filter="url(#glow)"`
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <text x="8" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">Activity</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700">%s</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="12" font-weight="800">%s</text>
  </g>
</svg>`, tw+10, glowFilter, filterAttr, tw+10, leftBg, lw, rw, rightBg, tw+10, leftColor, lw+rw/2, rightColor, escXML(fmt.Sprintf("%.0f/wk", recentFreq)), lw+rw+4, trendColor, trend)
}

func badgeHealth(data *RepoData) string {
	score := calculateHealthScore(data)
	letter := ""
	switch {
	case score >= 90:
		letter = "A+"
	case score >= 80:
		letter = "A"
	case score >= 70:
		letter = "B+"
	case score >= 60:
		letter = "B"
	case score >= 50:
		letter = "C"
	case score >= 40:
		letter = "D"
	default:
		letter = "F"
	}

	var rightBg, rightColor string
	switch {
	case score >= 80:
		rightBg = "#238636"
		rightColor = "#ffffff"
	case score >= 60:
		rightBg = "#9e6a03"
		rightColor = "#ffffff"
	case score >= 40:
		rightBg = "#d29922"
		rightColor = "#000000"
	default:
		rightBg = "#da3633"
		rightColor = "#ffffff"
	}

	text := fmt.Sprintf("%d/100 %s", score, letter)
	glow := score >= 80
	glowColor := "#3fb950"

	leftBg := "#0d1117"
	leftColor := "#e6edf3"

	lw := 56
	rw := len(text)*7 + 16
	tw := lw + rw

	glowFilter := ""
	if glow {
		glowFilter = fmt.Sprintf(`<filter id="glow" x="-20%%" y="-20%%" width="140%%" height="140%%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="%s" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`, glowColor)
	}
	filterAttr := ""
	if glow {
		filterAttr = ` filter="url(#glow)"`
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="26">
  <defs>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000" stop-opacity=".1"/>
    </linearGradient>
    %s
  </defs>
  <g%s>
    <rect width="%d" height="26" rx="6" fill="%s"/>
    <rect x="%d" width="%d" height="26" fill="%s"/>
    <rect width="%d" height="26" rx="6" fill="url(#shine)"/>
    <text x="8" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600">Health</text>
    <text x="%d" y="17" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="700">%s</text>
  </g>
</svg>`, tw, glowFilter, filterAttr, tw, leftBg, lw, rw, rightBg, tw, leftColor, lw+rw/2, rightColor, escXML(text))
}

func calculateHealthScore(data *RepoData) int {
	score := 50.0

	if data.Stars > 0 {
		score += math.Min(float64(data.Stars)/100.0, 15.0)
	}
	if data.Forks > 0 {
		score += math.Min(float64(data.Forks)/50.0, 10.0)
	}
	if data.Stats.BusFactor >= 3 {
		score += 10.0
	} else if data.Stats.BusFactor >= 2 {
		score += 5.0
	}
	if len(data.Languages) > 1 {
		score += 5.0
	}
	if data.Stats.TotalCommits > 100 {
		score += 5.0
	}
	if len(data.Releases) > 0 {
		score += 5.0
	}
	if data.OpenIssues == 0 {
		score += 5.0
	} else if data.OpenIssues < 10 {
		score += 2.0
	}

	return int(math.Min(100, math.Max(0, score)))
}

func formatCount(n int) string {
	if n >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(n)/1000000)
	} else if n >= 1000 {
		return fmt.Sprintf("%.1fK", float64(n)/1000)
	}
	return strconv.Itoa(n)
}
