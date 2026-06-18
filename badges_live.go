package main

import (
	"fmt"
	"image/color"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func handleLiveBadge(w http.ResponseWriter, r *http.Request) {
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

	cfg := buildLiveBadge(data, badgeType)
	svg := liveBadgeSVG(cfg)

	w.Header().Set("Content-Type", "image/svg+xml;charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=300")

	if download {
		filename := fmt.Sprintf("gitviz-%s-%s.svg", repo, badgeType)
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	}

	w.Write([]byte(svg))
}

func liveBadgeSVG(cfg liveBadgeConfig) string {
	var b strings.Builder

	leftW := measureLiveText(cfg.LeftLabel, 11, true) + 24
	rightW := measureLiveText(cfg.RightText, 12, false) + 28
	if cfg.ShowBar {
		rightW += 40
	}
	if cfg.Icon != "" {
		leftW += 20
	}
	totalW := leftW + rightW
	h := 32
	if cfg.Large {
		h = 40
	}

	tNow := time.Now().Unix()
	gradID := fmt.Sprintf("grd%d", tNow)
	shineID := fmt.Sprintf("shn%d", tNow)
	shimmerID := fmt.Sprintf("shm%d", tNow)
	glowID := fmt.Sprintf("glw%d", tNow)

	b.WriteString(fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">`, totalW, h, totalW, h))
	b.WriteString(`<defs>`)

	b.WriteString(fmt.Sprintf(`<linearGradient id="%s" x1="0" y1="0" x2="1" y2="1"><stop offset="0%%" stop-color="%s"/><stop offset="100%%" stop-color="%s"/></linearGradient>`,
		gradID, rgbToHex(cfg.LeftBg), rgbToHex(darkenLive(cfg.LeftBg, 0.15))))

	b.WriteString(fmt.Sprintf(`<linearGradient id="%s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%%" stop-color="#fff" stop-opacity=".2"/><stop offset="40%%" stop-color="#fff" stop-opacity=".05"/><stop offset="100%%" stop-color="#000" stop-opacity=".1"/></linearGradient>`, shineID))

	b.WriteString(fmt.Sprintf(`<linearGradient id="%s" x1="0" y1="0" x2="1" y2="0">`+
		`<stop offset="0%%" stop-color="#fff" stop-opacity="0"><animate attributeName="offset" values="0;1;0" dur="2.5s" repeatCount="indefinite"/></stop>`+
		`<stop offset="15%%" stop-color="#fff" stop-opacity=".25"><animate attributeName="offset" values=".15;1.15;.15" dur="2.5s" repeatCount="indefinite"/></stop>`+
		`<stop offset="30%%" stop-color="#fff" stop-opacity="0"><animate attributeName="offset" values=".3;1.3;.3" dur="2.5s" repeatCount="indefinite"/></stop>`+
		`</linearGradient>`, shimmerID))

	if cfg.Glow {
		b.WriteString(fmt.Sprintf(`<filter id="%s" x="-20%%" y="-30%%" width="140%%" height="160%%">`+
			`<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>`+
			`<feFlood flood-color="%s" flood-opacity="0.6" result="color"/>`+
			`<feComposite in="color" in2="blur" operator="in" result="shadow"/>`+
			`<feOffset dx="0" dy="1" result="offsetShadow"/>`+
			`<feMerge><feMergeNode in="offsetShadow"/><feMergeNode in="SourceGraphic"/></feMerge>`+
			`</filter>`, glowID, rgbToHex(cfg.GlowColor)))
	}
	b.WriteString(`</defs>`)

	filterAttr := ""
	if cfg.Glow {
		filterAttr = fmt.Sprintf(` filter="url(#%s)"`, glowID)
	}
	b.WriteString(fmt.Sprintf(`<g%s>`, filterAttr))

	b.WriteString(fmt.Sprintf(`<rect width="%d" height="%d" rx="8" fill="url(#%s)"/>`, totalW, h, gradID))
	b.WriteString(fmt.Sprintf(`<rect x="%d" width="%d" height="%d" fill="%s"/>`, leftW, rightW, h, rgbToHex(cfg.RightBg)))
	b.WriteString(fmt.Sprintf(`<rect width="%d" height="%d" rx="8" fill="url(#%s)"/>`, totalW, h, shineID))
	b.WriteString(fmt.Sprintf(`<rect width="%d" height="%d" rx="8" fill="url(#%s)"/>`, totalW, h, shimmerID))

	if cfg.Icon != "" {
		b.WriteString(fmt.Sprintf(`<g transform="translate(10,%d) scale(0.9)" opacity="0.9">`, h/2-6))
		b.WriteString(`<animateTransform attributeName="transform" type="translate" values="`)
		b.WriteString(fmt.Sprintf("%d,%d;%d,%d;%d,%d", 10, h/2-6, 10, h/2-8, 10, h/2-6))
		b.WriteString(`" dur="3s" repeatCount="indefinite" additive="sum"/>`)
		b.WriteString(cfg.Icon)
		b.WriteString(`</g>`)
	}

	b.WriteString(fmt.Sprintf(`<line x1="%d" y1="4" x2="%d" y2="%d" stroke="%s" stroke-width="1" opacity="0.3"/>`,
		leftW, leftW, h-4, rgbToHex(darkenLive(cfg.LeftBg, 0.2))))

	leftTextX := 18
	if cfg.Icon == "" {
		leftTextX = 10
	}
	b.WriteString(fmt.Sprintf(`<text x="%d" y="%d" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="11" font-weight="600" letter-spacing="0.3">`, leftTextX, h/2+4, rgbToHex(cfg.LeftColor)))
	if cfg.AnimateTitle {
		b.WriteString(`<animate attributeName="opacity" values="0;1" dur="0.5s" fill="freeze"/>`)
	}
	b.WriteString(escXML(cfg.LeftLabel))
	b.WriteString(`</text>`)

	rightTextX := leftW + 12
	if cfg.AnimateCounter && cfg.RightValue > 0 {
		digits := strconv.Itoa(cfg.RightValue)
		charW := 8
		for i, ch := range digits {
			digitDelay := float64(i) * 0.15
			digitX := rightTextX + i*charW
			b.WriteString(fmt.Sprintf(`<text x="%d" y="%d" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="14" font-weight="700">`, digitX, h/2+4, rgbToHex(cfg.RightColor)))
			b.WriteString(fmt.Sprintf(`<animate attributeName="y" values="%d;%d" dur="0.5s" begin="%.1fs" fill="freeze"/>`, h/2+15, h/2+4, digitDelay))
			b.WriteString(fmt.Sprintf(`<animate attributeName="opacity" values="0;1" dur="0.3s" begin="%.1fs" fill="freeze"/>`, digitDelay))
			b.WriteString(string(ch))
			b.WriteString(`</text>`)
		}
		rightTextX += len(digits)*charW + 8
	} else if cfg.RightText != "" {
		b.WriteString(fmt.Sprintf(`<text x="%d" y="%d" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="12" font-weight="600" letter-spacing="0.5">`, rightTextX, h/2+4, rgbToHex(cfg.RightColor)))
		b.WriteString(`<animate attributeName="opacity" values="0;1" dur="0.4s" fill="freeze"/>`)
		b.WriteString(escXML(cfg.RightText))
		b.WriteString(`</text>`)
		rightTextX += measureLiveText(cfg.RightText, 12, false) + 8
	}

	if cfg.Trend != "" {
		trendColor := "#8b949e"
		trendSymbol := "\u2192"
		if cfg.Trend == "up" {
			trendColor = "#3fb950"
			trendSymbol = "\u2191"
		} else if cfg.Trend == "down" {
			trendColor = "#f85149"
			trendSymbol = "\u2193"
		}
		b.WriteString(fmt.Sprintf(`<text x="%d" y="%d" fill="%s" font-size="14" font-weight="800">`, rightTextX, h/2+4, trendColor))
		b.WriteString(`<animate attributeName="opacity" values="0;1" dur="0.3s" begin="1s" fill="freeze"/>`)
		b.WriteString(`<animateTransform attributeName="transform" type="translate" values="0,3;0,0" dur="0.4s" begin="1s" fill="freeze"/>`)
		b.WriteString(trendSymbol)
		b.WriteString(`</text>`)
		rightTextX += 16
	}

	if cfg.ShowBar {
		barX := rightTextX
		barW := 50
		barH := 6
		barY := h/2 - barH/2
		fillW := int(float64(barW) * cfg.BarValue)

		b.WriteString(fmt.Sprintf(`<rect x="%d" y="%d" width="%d" height="%d" rx="3" fill="%s" opacity="0.2"/>`, barX, barY, barW, barH, rgbToHex(darkenLive(cfg.RightBg, 0.3))))
		b.WriteString(fmt.Sprintf(`<rect x="%d" y="%d" width="0" height="%d" rx="3" fill="%s">`, barX, barY, barH, rgbToHex(cfg.RightBg)))
		b.WriteString(fmt.Sprintf(`<animate attributeName="width" from="0" to="%d" dur="1.5s" begin="0.3s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>`, fillW))
		b.WriteString(`</rect>`)
		b.WriteString(fmt.Sprintf(`<text x="%d" y="%d" fill="%s" font-family="'Comic Sans MS',cursive,sans-serif" font-size="9" font-weight="600" opacity="0">`, barX+barW+6, h/2+3, rgbToHex(cfg.RightColor)))
		b.WriteString(fmt.Sprintf(`<animate attributeName="opacity" values="0;1" dur="0.3s" begin="1.5s" fill="freeze"/>%s</text>`, cfg.BarLabel))
	}

	b.WriteString(`</g></svg>`)
	return b.String()
}

type liveBadgeConfig struct {
	LeftLabel      string
	LeftBg         color.RGBA
	LeftColor      color.RGBA
	RightText      string
	RightValue     int
	RightBg        color.RGBA
	RightColor     color.RGBA
	Glow           bool
	GlowColor      color.RGBA
	Icon           string
	AnimateCounter bool
	AnimateTitle   bool
	ShowBar        bool
	BarValue       float64
	BarLabel       string
	Trend          string
	Large          bool
}

func buildLiveBadge(data *RepoData, badgeType string) liveBadgeConfig {
	switch badgeType {
	case "stars":
		return liveBadgeConfig{
			LeftLabel: "STARS", LeftBg: parseHex("#1a1f36"), LeftColor: parseHex("#c9d1d9"),
			RightValue: data.Stars, RightBg: parseHex("#b8860b"), RightColor: parseHex("#fff8dc"),
			Glow: data.Stars >= 50, GlowColor: parseHex("#f0c040"),
			AnimateCounter: true, AnimateTitle: true, Icon: starIconSVG(),
		}
	case "forks":
		return liveBadgeConfig{
			LeftLabel: "FORKS", LeftBg: parseHex("#0d1117"), LeftColor: parseHex("#c9d1d9"),
			RightValue: data.Forks, RightBg: parseHex("#1f6feb"), RightColor: parseHex("#ffffff"),
			Glow: data.Forks >= 25, GlowColor: parseHex("#58a6ff"),
			AnimateCounter: true, AnimateTitle: true, Icon: forkIconSVG(),
		}
	case "issues":
		issueColor := parseHex("#da3633")
		if data.OpenIssues == 0 {
			issueColor = parseHex("#238636")
		}
		return liveBadgeConfig{
			LeftLabel: "ISSUES", LeftBg: parseHex("#0d1117"), LeftColor: parseHex("#c9d1d9"),
			RightValue: data.OpenIssues, RightBg: issueColor, RightColor: parseHex("#ffffff"),
			Glow: data.OpenIssues >= 50, GlowColor: issueColor,
			AnimateCounter: true, AnimateTitle: true, Icon: issueIconSVG(data.OpenIssues),
		}
	case "language":
		lang := data.PrimaryLang
		if lang == "" {
			lang = "N/A"
		}
		lc := langColors[lang]
		if lc == "" {
			lc = "#8b949e"
		}
		topPct := 0.0
		if len(data.Languages) > 0 {
			topPct = data.Languages[0].Pct / 100.0
		}
		return liveBadgeConfig{
			LeftLabel: "LANGUAGE", LeftBg: parseHex("#0d1117"), LeftColor: parseHex("#c9d1d9"),
			RightText: strings.ToUpper(lang), RightBg: parseHex(lc), RightColor: parseHex("#ffffff"),
			Glow: true, GlowColor: parseHex(lc), AnimateTitle: true, Icon: langIconSVG(lang),
			ShowBar: len(data.Languages) > 1, BarValue: topPct, BarLabel: fmt.Sprintf("%.0f%%", topPct*100),
		}
	case "commits":
		return liveBadgeConfig{
			LeftLabel: "COMMITS", LeftBg: parseHex("#0d1117"), LeftColor: parseHex("#c9d1d9"),
			RightValue: data.Stats.TotalCommits, RightBg: parseHex("#238636"), RightColor: parseHex("#ffffff"),
			Glow: data.Stats.TotalCommits >= 500, GlowColor: parseHex("#3fb950"),
			AnimateCounter: true, AnimateTitle: true, Icon: commitIconSVG(),
		}
	case "contributors":
		count := len(data.Stats.Authors)
		return liveBadgeConfig{
			LeftLabel: "CONTRIBUTORS", LeftBg: parseHex("#0d1117"), LeftColor: parseHex("#c9d1d9"),
			RightValue: count, RightBg: parseHex("#8957e5"), RightColor: parseHex("#ffffff"),
			Glow: count >= 10, GlowColor: parseHex("#a371f7"),
			AnimateCounter: true, AnimateTitle: true, Icon: contribIconSVG(),
		}
	case "bus-factor":
		bf := data.Stats.BusFactor
		var bgColor, glow color.RGBA
		switch {
		case bf >= 5:
			bgColor = parseHex("#238636"); glow = parseHex("#3fb950")
		case bf >= 3:
			bgColor = parseHex("#9e6a03"); glow = parseHex("#d29922")
		case bf >= 2:
			bgColor = parseHex("#d29922"); glow = parseHex("#d29922")
		default:
			bgColor = parseHex("#da3633"); glow = parseHex("#f85149")
		}
		return liveBadgeConfig{
			LeftLabel: "BUS FACTOR", LeftBg: parseHex("#0d1117"), LeftColor: parseHex("#c9d1d9"),
			RightValue: bf, RightBg: bgColor, RightColor: parseHex("#ffffff"),
			Glow: bf >= 5, GlowColor: glow,
			AnimateCounter: true, AnimateTitle: true, Icon: busIconSVG(bf),
			ShowBar: true, BarValue: math.Min(float64(bf)/5.0, 1.0), BarLabel: "/5",
		}
	case "activity":
		weeks := data.Stats.WeeklyCommits
		recent := 0
		for i := len(weeks) - 4; i < len(weeks); i++ {
			if i >= 0 {
				recent += weeks[i].Commits
			}
		}
		freq := 0.0
		if len(weeks) > 0 {
			n := len(weeks)
			if n > 4 {
				n = 4
			}
			freq = float64(recent) / float64(n)
		}
		return liveBadgeConfig{
			LeftLabel: "ACTIVITY", LeftBg: parseHex("#0d1117"), LeftColor: parseHex("#c9d1d9"),
			RightText: fmt.Sprintf("%.0f/WK", freq), RightBg: parseHex("#1f6feb"), RightColor: parseHex("#ffffff"),
			Glow: freq >= 10, GlowColor: parseHex("#58a6ff"),
			AnimateTitle: true, Icon: activityIconSVG(),
		}
	case "health":
		score := calculateHealthScore(data)
		var bgColor, glow color.RGBA
		letter := "F"
		switch {
		case score >= 90:
			bgColor = parseHex("#238636"); glow = parseHex("#3fb950"); letter = "A+"
		case score >= 80:
			bgColor = parseHex("#238636"); glow = parseHex("#3fb950"); letter = "A"
		case score >= 70:
			bgColor = parseHex("#9e6a03"); glow = parseHex("#d29922"); letter = "B+"
		case score >= 60:
			bgColor = parseHex("#9e6a03"); glow = parseHex("#d29922"); letter = "B"
		case score >= 50:
			bgColor = parseHex("#d29922"); glow = parseHex("#d29922"); letter = "C"
		case score >= 40:
			bgColor = parseHex("#da3633"); glow = parseHex("#f85149"); letter = "D"
		default:
			bgColor = parseHex("#da3633"); glow = parseHex("#f85149")
		}
		return liveBadgeConfig{
			LeftLabel: "HEALTH", LeftBg: parseHex("#0d1117"), LeftColor: parseHex("#c9d1d9"),
			RightText: fmt.Sprintf("%d/100 %s", score, letter), RightBg: bgColor, RightColor: parseHex("#ffffff"),
			Glow: score >= 80, GlowColor: glow,
			AnimateTitle: true, Icon: healthIconSVG(score),
			ShowBar: true, BarValue: float64(score) / 100.0, BarLabel: fmt.Sprintf("%d%%", score),
		}
	default:
		lang := data.PrimaryLang
		if lang == "" {
			lang = "N/A"
		}
		lc := langColors[lang]
		if lc == "" {
			lc = "#8b949e"
		}
		return liveBadgeConfig{
			LeftLabel: data.FullName, LeftBg: parseHex("#24292e"), LeftColor: parseHex("#ffffff"),
			RightText: fmt.Sprintf("%s %s %s", lang, starFmt(data.Stars), forkFmt(data.Forks)),
			RightBg: parseHex(lc), RightColor: parseHex("#ffffff"),
			Glow: data.Stars >= 100, GlowColor: parseHex("#f0c040"), AnimateTitle: true,
		}
	}
}

func getTopLangPct(langs []LangEntry) float64 {
	if len(langs) == 0 {
		return 0
	}
	return langs[0].Pct / 100.0
}

func getStarTrend(data *RepoData) string {
	weeks := data.Stats.WeeklyCommits
	if len(weeks) < 8 {
		return ""
	}
	recent, older := 0, 0
	for i := len(weeks) - 4; i < len(weeks); i++ {
		recent += weeks[i].Commits
	}
	for i := len(weeks) - 8; i < len(weeks)-4; i++ {
		older += weeks[i].Commits
	}
	if recent > older {
		return "up"
	} else if recent < older {
		return "down"
	}
	return "flat"
}

func starFmt(n int) string {
	if n >= 1000 {
		return fmt.Sprintf("%.1fK\u2605", float64(n)/1000)
	}
	return fmt.Sprintf("%d\u2605", n)
}

func forkFmt(n int) string {
	if n >= 1000 {
		return fmt.Sprintf("%.1fK\u2500", float64(n)/1000)
	}
	return fmt.Sprintf("%d\u2500", n)
}

func measureLiveText(text string, fontSize int, bold bool) int {
	avgWidth := 6.5
	if bold {
		avgWidth = 7.2
	}
	if fontSize >= 14 {
		avgWidth = 8.0
	}
	return int(float64(len(text)) * avgWidth)
}

func parseHex(hex string) color.RGBA {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) == 3 {
		hex = string([]byte{hex[0], hex[0], hex[1], hex[1], hex[2], hex[2]})
	}
	if len(hex) < 6 {
		return color.RGBA{128, 128, 128, 255}
	}
	r, _ := strconv.ParseUint(hex[0:2], 16, 8)
	g, _ := strconv.ParseUint(hex[2:4], 16, 8)
	b, _ := strconv.ParseUint(hex[4:6], 16, 8)
	return color.RGBA{uint8(r), uint8(g), uint8(b), 255}
}

func rgbToHex(c color.RGBA) string {
	return fmt.Sprintf("#%02x%02x%02x", c.R, c.G, c.B)
}

func darkenLive(c color.RGBA, amount float64) color.RGBA {
	return color.RGBA{uint8(float64(c.R) * (1 - amount)), uint8(float64(c.G) * (1 - amount)), uint8(float64(c.B) * (1 - amount)), 255}
}

func brightenLive(c color.RGBA, amount float64) color.RGBA {
	return color.RGBA{
		uint8(math.Min(255, float64(c.R)+(255-float64(c.R))*amount)),
		uint8(math.Min(255, float64(c.G)+(255-float64(c.G))*amount)),
		uint8(math.Min(255, float64(c.B)+(255-float64(c.B))*amount)),
		255,
	}
}

func starIconSVG() string {
	return `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f0c040" stroke="#d4a017" stroke-width="0.5">` +
		`<animateTransform attributeName="transform" type="rotate" values="0 12 12;5 12 12;-5 12 12;0 12 12" dur="4s" repeatCount="indefinite"/>` +
		`<animate attributeName="opacity" values="1;0.8;1" dur="2s" repeatCount="indefinite"/>` +
		`</path>`
}

func forkIconSVG() string {
	return `<path d="M12 2C9.24 2 7 4.24 7 7c0 1.77.93 3.32 2.33 4.2L8 14h2l1-2.8V19l-1 1H7v2h5c2.76 0 5-2.24 5-5 0-1.77-.93-3.32-2.33-4.2L16 5h-2l-1 2.8V5h2v2.2C15.07 6.32 13.77 6 12 6V2z" fill="#58a6ff" stroke="#1f6feb" stroke-width="0.3">` +
		`<animateTransform attributeName="transform" type="translate" values="0,0;0,-1;0,0" dur="2s" repeatCount="indefinite"/>` +
		`</path>`
}

func issueIconSVG(open int) string {
	c := "#da3633"
	if open == 0 {
		c = "#3fb950"
		return `<circle cx="12" cy="12" r="8" fill="none" stroke="` + c + `" stroke-width="2"><animate attributeName="r" values="7;8;7" dur="2s" repeatCount="indefinite"/></circle>` +
			`<path d="M8 12l3 3 5-6" fill="none" stroke="` + c + `" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="stroke-dasharray" values="0,20;20,0" dur="0.8s" fill="freeze"/></path>`
	}
	return `<circle cx="12" cy="12" r="8" fill="none" stroke="` + c + `" stroke-width="2"><animate attributeName="r" values="7;8;7" dur="1.5s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite"/></circle>` +
		`<line x1="12" y1="7" x2="12" y2="13" stroke="` + c + `" stroke-width="2" stroke-linecap="round"/>` +
		`<circle cx="12" cy="16" r="1" fill="` + c + `"/>`
}

func langIconSVG(lang string) string {
	lc := langColors[lang]
	if lc == "" {
		lc = "#8b949e"
	}
	return `<circle cx="12" cy="12" r="7" fill="` + lc + `" opacity="0.8"><animate attributeName="r" values="6;7;6" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite"/></circle>` +
		`<circle cx="12" cy="12" r="3" fill="#fff" opacity="0.9"/>`
}

func commitIconSVG() string {
	return `<circle cx="12" cy="12" r="8" fill="none" stroke="#3fb950" stroke-width="2"><animate attributeName="stroke-dasharray" values="0,50;50,0" dur="1.5s" fill="freeze"/></circle>` +
		`<circle cx="12" cy="12" r="3" fill="#3fb950"><animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite"/></circle>`
}

func contribIconSVG() string {
	return `<circle cx="9" cy="8" r="3" fill="#a371f7" opacity="0.8"><animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/></circle>` +
		`<path d="M3 18c0-3.31 2.69-6 6-6s6 2.69 6 6" fill="#a371f7" opacity="0.5"/>` +
		`<circle cx="16" cy="9" r="2.5" fill="#d2a8ff" opacity="0.7"><animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.5s" repeatCount="indefinite"/></circle>`
}

func busIconSVG(bf int) string {
	c := "#3fb950"
	if bf <= 1 {
		c = "#f85149"
	} else if bf <= 3 {
		c = "#d29922"
	}
	return `<circle cx="12" cy="8" r="4" fill="` + c + `" opacity="0.9"><animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/></circle>` +
		`<path d="M4 20c0-4.42 3.58-8 8-8s8 3.58 8 8" fill="` + c + `" opacity="0.5"/>`
}

func activityIconSVG() string {
	return `<polyline points="3,16 7,10 11,14 15,6 19,12 22,8" fill="none" stroke="#58a6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="stroke-dasharray" values="0,40;40,0" dur="1.5s" fill="freeze"/></polyline>` +
		`<circle cx="22" cy="8" r="2" fill="#58a6ff"><animate attributeName="r" values="1.5;2.5;1.5" dur="1.5s" repeatCount="indefinite"/></circle>`
}

func healthIconSVG(score int) string {
	c := "#3fb950"
	if score < 60 {
		c = "#d29922"
	}
	if score < 40 {
		c = "#f85149"
	}
	return `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="` + c + `"><animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite"/></path>`
}
