package main

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/color/palette"
	"image/draw"
	"image/gif"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"
	"golang.org/x/image/font"
	"golang.org/x/image/font/opentype"
)

var comicSansRegular font.Face
var comicSansBold font.Face

const scale = 2

func init() {
	comicSansRegular = loadTTF("C:\\Windows\\Fonts\\comic.ttf", 11)
	comicSansBold = loadTTF("C:\\Windows\\Fonts\\comicbd.ttf", 11)
}

func loadTTF(path string, size float64) font.Face {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	ft, err := opentype.Parse(data)
	if err != nil {
		return nil
	}
	face, err := opentype.NewFace(ft, &opentype.FaceOptions{
		Size:    size,
		DPI:     144,
		Hinting: font.HintingFull,
	})
	if err != nil {
		return nil
	}
	return face
}

type gifBadge struct {
	leftLabel string
	rightText string
	leftBg    color.RGBA
	rightBg   color.RGBA
	glowColor color.RGBA
	highlight bool
}

func parseHexColor(hex string) color.RGBA {
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

func colorToRGBA(c color.Color) color.RGBA {
	r, g, b, a := c.RGBA()
	return color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), uint8(a >> 8)}
}

func hexToRGBA(hex string) color.RGBA {
	return parseHexColor(hex)
}

func lerpColor(a, b color.RGBA, t float64) color.RGBA {
	t = math.Max(0, math.Min(1, t))
	return color.RGBA{
		uint8(float64(a.R) + (float64(b.R)-float64(a.R))*t),
		uint8(float64(a.G) + (float64(b.G)-float64(a.G))*t),
		uint8(float64(a.B) + (float64(b.B)-float64(a.B))*t),
		255,
	}
}

func darken(c color.RGBA, amount float64) color.RGBA {
	return color.RGBA{
		uint8(float64(c.R) * (1 - amount)),
		uint8(float64(c.G) * (1 - amount)),
		uint8(float64(c.B) * (1 - amount)),
		255,
	}
}

func brighten(c color.RGBA, amount float64) color.RGBA {
	return color.RGBA{
		uint8(math.Min(255, float64(c.R)+(255-float64(c.R))*amount)),
		uint8(math.Min(255, float64(c.G)+(255-float64(c.G))*amount)),
		uint8(math.Min(255, float64(c.B)+(255-float64(c.B))*amount)),
		255,
	}
}

func easeInOut(t float64) float64 {
	if t < 0.5 {
		return 4 * t * t * t
	}
	return 1 - math.Pow(-2*t+2,3)/2
}

func measureTextWidth(text string, f font.Face) float64 {
	if f == nil {
		return float64(len(text) * 7)
	}
	total := 0.0
	for _, ch := range text {
		adv, _ := f.GlyphAdvance(ch)
		total += float64(adv)
	}
	return total / 64.0
}

func drawBadgeFrame(
	b gifBadge,
	frameIdx int,
	totalFrames int,
) *image.RGBA {
	const (
		paddingH   = 10
		paddingV   = 6
		separatorW = 4
		radius     = 5
		height     = 40
	)

	leftFace := comicSansBold
	rightFace := comicSansRegular
	if leftFace == nil {
		leftFace = rightFace
	}

	leftTextW := measureTextWidth(b.leftLabel, leftFace)
	rightTextW := measureTextWidth(b.rightText, rightFace)

	leftContentW := leftTextW + paddingH*2
	rightContentW := rightTextW + paddingH*2
	totalW := leftContentW + separatorW + rightContentW

	minW := 160.0
	if totalW < minW {
		totalW = minW
		leftContentW = minW * 0.4
		rightContentW = minW - leftContentW - separatorW
	}

	w := int(totalW) + 4
	h := height
	t := float64(frameIdx) / float64(totalFrames)
	sinT := math.Sin(t * math.Pi * 2)
	_ = sinT

	dc := gg.NewContext(w*scale, h*scale)

	dc.SetColor(color.RGBA{0, 0, 0, 0})
	dc.Clear()

	lft := float64(2 * scale)
	top := float64(2 * scale)
	lfW := leftContentW * float64(scale)
	rtW := rightContentW * float64(scale)
	sW := separatorW * float64(scale)
	ht := float64(h-4) * float64(scale)
	totalWs := lfW + sW + rtW

	dc.DrawRoundedRectangle(lft, top, lfW, ht, float64(radius*scale))
	dc.SetColor(b.leftBg)
	dc.Fill()

	dc.DrawRoundedRectangle(lft+lfW+sW, top, rtW, ht, float64(radius*scale))
	gradT := float64(frameIdx) / float64(totalFrames) * 0.3
	rightBgAnim := lerpColor(b.rightBg, brighten(b.rightBg, 0.2), (math.Sin(gradT*math.Pi*2)+1)/2)
	dc.SetColor(rightBgAnim)
	dc.Fill()

	dc.DrawRectangle(lft+lfW, top, sW, ht)
	dc.SetColor(darken(b.leftBg, 0.3))
	dc.Fill()

	shimmerProgress := easeInOut(math.Mod(t*1.5+0.5, 1.0))
	shimmerX := lft + totalWs*shimmerProgress
	shimmerW := float64(50 * scale)
	for i := 0; i < 20; i++ {
		sx := shimmerX - shimmerW/2 + float64(i)*shimmerW/20
		alpha := 0.3 * (1.0 - math.Abs(float64(i)-10)/10.0)
		dc.DrawRectangle(sx, top, shimmerW/20, ht)
		dc.SetColor(color.NRGBA{255, 255, 255, uint8(alpha * 255)})
		dc.Fill()
	}

	if b.highlight {
		glowPhase := (math.Sin(t*math.Pi*2) + 1) / 2
		glowAlpha := glowPhase * 0.15
		dc.DrawRoundedRectangle(lft-2, top-2, totalWs+4, ht+4, float64((radius+2)*scale))
		dc.SetColor(color.NRGBA{b.glowColor.R, b.glowColor.G, b.glowColor.B, uint8(glowAlpha * 255)})
		dc.Fill()
	}

	leftTextX := lft + paddingH*float64(scale)/2
	textY := top + ht/2 - 2*float64(scale)
	dc.SetColor(color.RGBA{255, 255, 255, 255})
	if leftFace != nil {
		dc.SetFontFace(leftFace)
	}
	dc.DrawStringAnchored(b.leftLabel, leftTextX+paddingH*float64(scale)/2, textY, 0, 0.5)

	rightTextX := lft + lfW + sW + paddingH*float64(scale)/2
	dc.SetColor(color.RGBA{255, 255, 255, 255})
	if rightFace != nil {
		dc.SetFontFace(rightFace)
	}
	dc.DrawStringAnchored(b.rightText, rightTextX, textY, 0, 0.5)

	dc.DrawRoundedRectangle(lft, top, lfW, ht, float64(radius*scale))
	dc.SetColor(color.RGBA{0, 0, 0, 0})
	dc.SetLineWidth(0.5 * float64(scale))
	dc.Stroke()

	dc.DrawRoundedRectangle(lft+lfW+sW, top, rtW, ht, float64(radius*scale))
	dc.SetColor(color.RGBA{0, 0, 0, 0})
	dc.Stroke()

	return dc.Image().(*image.RGBA)
}

func quantizeToPaletted(img *image.RGBA) *image.Paletted {
	bounds := img.Bounds()
	pal := palette.Plan9[:256]

	paletted := image.NewPaletted(bounds, pal)
	draw.FloydSteinberg.Draw(paletted, bounds, img, image.Point{})
	return paletted
}

func generateGIFBadge(b gifBadge) ([]byte, error) {
	const (
		gifFrames = 20
		gifDelay  = 5
	)

	frames := make([]*image.Paletted, gifFrames)
	delays := make([]int, gifFrames)

	for frame := 0; frame < gifFrames; frame++ {
		hiRes := drawBadgeFrame(b, frame, gifFrames)
		finalW := hiRes.Bounds().Dx() / scale
		finalH := hiRes.Bounds().Dy() / scale
		downscaled := imaging.Resize(hiRes, finalW, finalH, imaging.Lanczos)

		bounds := downscaled.Bounds()
		rgba := image.NewRGBA(bounds)
		draw.Draw(rgba, bounds, downscaled, bounds.Min, draw.Src)

		applyAllGlitch(rgba, frame, gifFrames)

		paletted := quantizeToPaletted(rgba)
		frames[frame] = paletted
		delays[frame] = gifDelay
	}

	var buf bytes.Buffer
	g := gif.GIF{LoopCount: 0}
	for i, frame := range frames {
		g.Image = append(g.Image, frame)
		g.Delay = append(g.Delay, delays[i])
		g.Disposal = append(g.Disposal, gif.DisposalBackground)
	}

	if err := gif.EncodeAll(&buf, &g); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func handleGIFBadge(w http.ResponseWriter, r *http.Request) {
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

	badge := buildGIFBadge(data, badgeType)
	gifBytes, err := generateGIFBadge(badge)
	if err != nil {
		writeError(w, "gif generation failed: "+err.Error(), 500)
		return
	}

	w.Header().Set("Content-Type", "image/gif")
	w.Header().Set("Cache-Control", "public, max-age=300")

	if download {
		filename := fmt.Sprintf("gitviz-%s-%s.gif", repo, badgeType)
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	}

	w.Write(gifBytes)
}

func buildGIFBadge(data *RepoData, badgeType string) gifBadge {
	switch badgeType {
	case "stars":
		return gifBadge{
			leftLabel: "STARS",
			rightText: formatCount(data.Stars),
			leftBg:    parseHexColor("#1a1f36"),
			rightBg:   parseHexColor("#b8860b"),
			glowColor: parseHexColor("#f0c040"),
			highlight: data.Stars >= 50,
		}
	case "forks":
		return gifBadge{
			leftLabel: "FORKS",
			rightText: formatCount(data.Forks),
			leftBg:    parseHexColor("#0d1117"),
			rightBg:   parseHexColor("#1f6feb"),
			glowColor: parseHexColor("#58a6ff"),
			highlight: data.Forks >= 25,
		}
	case "issues":
		issueColor := parseHexColor("#da3633")
		if data.OpenIssues == 0 {
			issueColor = parseHexColor("#238636")
		}
		return gifBadge{
			leftLabel: "ISSUES",
			rightText: formatCount(data.OpenIssues),
			leftBg:    parseHexColor("#0d1117"),
			rightBg:   issueColor,
			glowColor: issueColor,
			highlight: data.OpenIssues >= 50,
		}
	case "language":
		lang := data.PrimaryLang
		if lang == "" {
			lang = "N/A"
		}
		langColor := langColors[lang]
		if langColor == "" {
			langColor = "#8b949e"
		}
		return gifBadge{
			leftLabel: "LANGUAGE",
			rightText: lang,
			leftBg:    parseHexColor("#0d1117"),
			rightBg:   parseHexColor(langColor),
			glowColor: parseHexColor(langColor),
			highlight: true,
		}
	case "commits":
		return gifBadge{
			leftLabel: "COMMITS",
			rightText: formatCount(data.Stats.TotalCommits),
			leftBg:    parseHexColor("#0d1117"),
			rightBg:   parseHexColor("#238636"),
			glowColor: parseHexColor("#3fb950"),
			highlight: data.Stats.TotalCommits >= 500,
		}
	case "contributors":
		count := len(data.Stats.Authors)
		return gifBadge{
			leftLabel: "CONTRIBUTORS",
			rightText: strconv.Itoa(count),
			leftBg:    parseHexColor("#0d1117"),
			rightBg:   parseHexColor("#8957e5"),
			glowColor: parseHexColor("#a371f7"),
			highlight: count >= 10,
		}
	case "bus-factor":
		bf := data.Stats.BusFactor
		var bgColor, glow color.RGBA
		switch {
		case bf >= 5:
			bgColor = parseHexColor("#238636")
			glow = parseHexColor("#3fb950")
		case bf >= 3:
			bgColor = parseHexColor("#9e6a03")
			glow = parseHexColor("#d29922")
		case bf >= 2:
			bgColor = parseHexColor("#d29922")
			glow = parseHexColor("#d29922")
		default:
			bgColor = parseHexColor("#da3633")
			glow = parseHexColor("#f85149")
		}
		return gifBadge{
			leftLabel: "BUS FACTOR",
			rightText: strconv.Itoa(bf),
			leftBg:    parseHexColor("#0d1117"),
			rightBg:   bgColor,
			glowColor: glow,
			highlight: bf >= 5,
		}
	case "activity":
		weeks := data.Stats.WeeklyCommits
		recent := 0
		for i, w := range weeks {
			if i >= len(weeks)-4 {
				recent += w.Commits
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
		return gifBadge{
			leftLabel: "ACTIVITY",
			rightText: fmt.Sprintf("%.0f/WK", freq),
			leftBg:    parseHexColor("#0d1117"),
			rightBg:   parseHexColor("#1f6feb"),
			glowColor: parseHexColor("#58a6ff"),
			highlight: freq >= 10,
		}
	case "health":
		score := calculateHealthScore(data)
		var bgColor, glow color.RGBA
		switch {
		case score >= 80:
			bgColor = parseHexColor("#238636")
			glow = parseHexColor("#3fb950")
		case score >= 60:
			bgColor = parseHexColor("#9e6a03")
			glow = parseHexColor("#d29922")
		case score >= 40:
			bgColor = parseHexColor("#d29922")
			glow = parseHexColor("#d29922")
		default:
			bgColor = parseHexColor("#da3633")
			glow = parseHexColor("#f85149")
		}
		letter := "F"
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
		}
		return gifBadge{
			leftLabel: "HEALTH",
			rightText: fmt.Sprintf("%d/100 %s", score, letter),
			leftBg:    parseHexColor("#0d1117"),
			rightBg:   bgColor,
			glowColor: glow,
			highlight: score >= 80,
		}
	default:
		lang := data.PrimaryLang
		if lang == "" {
			lang = "N/A"
		}
		langColor := langColors[lang]
		if langColor == "" {
			langColor = "#8b949e"
		}
		rightText := fmt.Sprintf("★%s ⑂%s %s", formatCount(data.Stars), formatCount(data.Forks), lang)
		return gifBadge{
			leftLabel: data.FullName,
			rightText: rightText,
			leftBg:    parseHexColor("#24292e"),
			rightBg:   parseHexColor(langColor),
			glowColor: parseHexColor("#f0c040"),
			highlight: data.Stars >= 100,
		}
	}
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func drawRoundedRect(img *image.Paletted, x0, y0, x1, y1 int, c color.Color, radius int) {
	for y := y0; y <= y1; y++ {
		for x := x0; x <= x1; x++ {
			inCorner := false
			if x < x0+radius && y < y0+radius {
				dx := float64(x - (x0 + radius))
				dy := float64(y - (y0 + radius))
				if dx*dx+dy*dy > float64(radius*radius) {
					inCorner = true
				}
			} else if x > x1-radius && y < y0+radius {
				dx := float64(x - (x1 - radius))
				dy := float64(y - (y0 + radius))
				if dx*dx+dy*dy > float64(radius*radius) {
					inCorner = true
				}
			} else if x < x0+radius && y > y1-radius {
				dx := float64(x - (x0 + radius))
				dy := float64(y - (y1 - radius))
				if dx*dx+dy*dy > float64(radius*radius) {
					inCorner = true
				}
			} else if x > x1-radius && y > y1-radius {
				dx := float64(x - (x1 - radius))
				dy := float64(y - (y1 - radius))
				if dx*dx+dy*dy > float64(radius*radius) {
					inCorner = true
				}
			}
			if !inCorner && x >= 0 && x < img.Rect.Dx() && y >= 0 && y < img.Rect.Dy() {
				img.SetColorIndex(x, y, uint8(findNearestPaletteIndex(img, c)))
			}
		}
	}
}

func findNearestPaletteIndex(img *image.Paletted, target color.Color) int {
	tr, tg, tb, _ := target.RGBA()
	bestIdx := 0
	bestDist := float64(1e9)
	for i, c := range img.Palette {
		r, g, b, _ := c.RGBA()
		dist := float64(int(tr)-int(r))*float64(int(tr)-int(r)) +
			float64(int(tg)-int(g))*float64(int(tg)-int(g)) +
			float64(int(tb)-int(b))*float64(int(tb)-int(b))
		if dist < bestDist {
			bestDist = dist
			bestIdx = i
		}
	}
	return bestIdx
}
