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
	"sort"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"
)

type pieSegment struct {
	Name  string
	Pct   float64
	Color color.RGBA
}

type pieChart struct {
	Segments []pieSegment
	Title    string
}

func buildPieChart(data *RepoData) pieChart {
	type langInfo struct {
		name  string
		bytes int
		pct   float64
		color string
	}
	var langs []langInfo
	for _, l := range data.Languages {
		langs = append(langs, langInfo{l.Name, l.Bytes, l.Pct, l.Color})
	}
	sort.Slice(langs, func(i, j int) bool { return langs[i].pct > langs[j].pct })

	var segments []pieSegment
	otherPct := 0.0
	shown := 0
	for _, l := range langs {
		if l.pct <= 0 {
			continue
		}
		if shown < 6 {
			c := parseHexColor(l.color)
			segments = append(segments, pieSegment{
				Name:  l.name,
				Pct:   l.pct,
				Color: c,
			})
			shown++
		} else {
			otherPct += l.pct
		}
	}
	if otherPct > 0.1 {
		segments = append(segments, pieSegment{
			Name:  "Other",
			Pct:   otherPct,
			Color: color.RGBA{128, 128, 128, 255},
		})
	}

	total := 0.0
	for _, s := range segments {
		total += s.Pct
	}
	if total > 0 {
		for i := range segments {
			segments[i].Pct = segments[i].Pct / total * 100
		}
	}

	return pieChart{
		Segments: segments,
		Title:    data.FullName,
	}
}

func drawPieSlice(dc *gg.Context, cx, cy, r, startAngle, endAngle float64, c color.RGBA) {
	if endAngle-startAngle < 0.001 {
		return
	}
	dc.SetColor(c)
	dc.MoveTo(cx, cy)
	dc.DrawArc(cx, cy, r, startAngle, endAngle)
	dc.ClosePath()
	dc.Fill()
}

func generatePieChartGIF(chart pieChart) ([]byte, error) {
	const (
		pieFrames = 24
		pieDelay  = 4
		pieScale  = 2
		pieWidth  = 320
		pieHeight = 100
	)

	w := pieWidth * pieScale
	h := pieHeight * pieScale

	pieR := float64(34 * pieScale)
	pieCX := float64(42 * pieScale)
	pieCY := float64(h / 2)

	legendX := float64(88 * pieScale)

	face := comicSansRegular
	faceSmall := comicSansBold

	frames := make([]*image.Paletted, pieFrames)
	delays := make([]int, pieFrames)

	for frame := 0; frame < pieFrames; frame++ {
		t := float64(frame) / float64(pieFrames)
		animT := easeInOut(t)

		dc := gg.NewContext(w, h)
		dc.SetColor(color.RGBA{13, 17, 23, 255})
		dc.Clear()

		totalAngle := 0.0
		for _, seg := range chart.Segments {
			totalAngle += seg.Pct / 100.0 * math.Pi * 2
		}

		currentAngle := -math.Pi / 2
		maxAngle := -math.Pi/2 + totalAngle*animT

		for _, seg := range chart.Segments {
			sliceAngle := seg.Pct / 100.0 * math.Pi * 2
			endAngle := currentAngle + sliceAngle

			if currentAngle >= maxAngle {
				break
			}

			drawEnd := endAngle
			if drawEnd > maxAngle {
				drawEnd = maxAngle
			}

			dc.SetColor(seg.Color)
			dc.MoveTo(pieCX, pieCY)
			dc.DrawArc(pieCX, pieCY, pieR, currentAngle, drawEnd)
			dc.ClosePath()
			dc.Fill()

			if drawEnd == endAngle && sliceAngle > 0.15 {
				midAngle := currentAngle + sliceAngle/2
				labelR := pieR + float64(10*pieScale)
				lx := pieCX + math.Cos(midAngle)*labelR
				ly := pieCY + math.Sin(midAngle)*labelR

				if seg.Pct >= 5 {
					dc.SetColor(color.RGBA{255, 255, 255, 200})
					if face != nil {
						dc.SetFontFace(faceSmall)
					}
					dc.DrawStringAnchored(fmt.Sprintf("%.0f%%", seg.Pct), lx, ly, 0.5, 0.5)
				}
			}

			currentAngle = endAngle
		}

		dc.SetColor(color.RGBA{13, 17, 23, 255})
		dc.DrawCircle(pieCX, pieCY, pieR*0.45)
		dc.Fill()

		dc.SetColor(color.RGBA{255, 255, 255, 230})
		if face != nil {
			dc.SetFontFace(face)
		}
		totalLangs := len(chart.Segments)
		dc.DrawStringAnchored(fmt.Sprintf("%d langs", totalLangs), pieCX, pieCY-float64(6*pieScale), 0.5, 0.5)

		dc.SetColor(color.RGBA{130, 130, 140, 200})
		if face != nil {
			dc.SetFontFace(faceSmall)
		}
		dc.DrawStringAnchored("languages", pieCX, pieCY+float64(8*pieScale), 0.5, 0.5)

		legendY := float64(14 * pieScale)
		legendItemH := float64(13 * pieScale)

		for i, seg := range chart.Segments {
			y := legendY + float64(i)*legendItemH
			if y+legendItemH > float64(h-8*pieScale) {
				break
			}

			dc.SetColor(seg.Color)
			dc.DrawRoundedRectangle(legendX, y, float64(8*pieScale), float64(8*pieScale), float64(2*pieScale))
			dc.Fill()

			dc.SetColor(color.RGBA{255, 255, 255, 230})
			if face != nil {
				dc.SetFontFace(face)
			}
			dc.DrawStringAnchored(seg.Name, legendX+float64(12*pieScale), y+float64(1*pieScale), 0, 0)

			dc.SetColor(color.RGBA{150, 150, 160, 200})
			if faceSmall != nil {
				dc.SetFontFace(faceSmall)
			}
			dc.DrawStringAnchored(fmt.Sprintf("%.1f%%", seg.Pct), legendX+float64(12*pieScale), y+float64(8*pieScale), 0, 0)
		}

		hiRes := dc.Image().(*image.RGBA)
		downscaled := imaging.Resize(hiRes, w/pieScale, h/pieScale, imaging.Lanczos)

		bounds := downscaled.Bounds()
		rgba := image.NewRGBA(bounds)
		draw.Draw(rgba, bounds, downscaled, bounds.Min, draw.Src)

		pal := palette.Plan9[:256]
		paletted := image.NewPaletted(bounds, pal)
		draw.FloydSteinberg.Draw(paletted, bounds, rgba, image.Point{})

		frames[frame] = paletted
		delays[frame] = pieDelay
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

func handlePieChart(w http.ResponseWriter, r *http.Request) {
	repoURL := r.URL.Query().Get("url")
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

	chart := buildPieChart(data)
	gifBytes, err := generatePieChartGIF(chart)
	if err != nil {
		writeError(w, "pie chart generation failed: "+err.Error(), 500)
		return
	}

	w.Header().Set("Content-Type", "image/gif")
	w.Header().Set("Cache-Control", "public, max-age=300")

	if download {
		filename := fmt.Sprintf("gitviz-%s-pie.gif", repo)
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	}

	w.Write(gifBytes)
}
