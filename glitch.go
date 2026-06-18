package main

import (
	"image"
	"image/color"
	"math"
	"math/rand"
)

func addScanlines(img *image.RGBA, frameIdx int) {
	bounds := img.Bounds()
	offset := (frameIdx * 3) % 6
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		if (y+offset)%4 == 0 {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				r, g, b, a := img.At(x, y).RGBA()
				img.Set(x, y, color.RGBA{
					uint8(float64(r>>8) * 0.6),
					uint8(float64(g>>8) * 0.6),
					uint8(float64(b>>8) * 0.6),
					uint8(a >> 8),
				})
			}
		}
	}
}

func addRGBSplit(img *image.RGBA, frameIdx int, intensity float64) {
	bounds := img.Bounds()
	offsetX := int(math.Sin(float64(frameIdx)*0.8)*3*intensity) + 1
	offsetY := int(math.Cos(float64(frameIdx)*1.2)*1*intensity)

	orig := image.NewRGBA(bounds)
	drawCopy(orig, img)

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Red channel shifted right
			rx := x - offsetX
			if rx >= bounds.Min.X && rx < bounds.Max.X {
				r, _, _, a := orig.At(rx, y).RGBA()
				_, g, b, _ := img.At(x, y).RGBA()
				img.Set(x, y, color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), uint8(a >> 8)})
			}
			// Blue channel shifted left+down
			bx := x + offsetX
			by := y + offsetY
			if bx >= bounds.Min.X && bx < bounds.Max.X && by >= bounds.Min.Y && by < bounds.Max.Y {
				_, g, _, _ := img.At(x, y).RGBA()
				r, _, _, a := img.At(x, y).RGBA()
				_, _, nb, _ := orig.At(bx, by).RGBA()
				img.Set(x, y, color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(nb >> 8), uint8(a >> 8)})
			}
		}
	}
}

func addFlicker(img *image.RGBA, frameIdx int, probability float64) {
	if rand.Float64() > probability {
		return
	}
	bounds := img.Bounds()
	brightness := 0.7 + rand.Float64()*0.6
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := img.At(x, y).RGBA()
			img.Set(x, y, color.RGBA{
				uint8(math.Min(255, float64(r>>8)*brightness)),
				uint8(math.Min(255, float64(g>>8)*brightness)),
				uint8(math.Min(255, float64(b>>8)*brightness)),
				uint8(a >> 8),
			})
		}
	}
}

func addNoise(img *image.RGBA, intensity uint8) {
	bounds := img.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		if rand.Intn(10) > 7 {
			continue
		}
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			if rand.Intn(8) > 5 {
				continue
			}
			r, g, b, a := img.At(x, y).RGBA()
			n := int16(rand.Intn(int(intensity)*2)) - int16(intensity)
			img.Set(x, y, color.RGBA{
				uint8(clamp255(int(int16(r>>8) + n))),
				uint8(clamp255(int(int16(g>>8) + n))),
				uint8(clamp255(int(int16(b>>8) + n))),
				uint8(a >> 8),
			})
		}
	}
}

func addGlitchSlices(img *image.RGBA, frameIdx int, maxSlices int) {
	bounds := img.Bounds()
	h := bounds.Dy()
	w := bounds.Dx()
	numSlices := rand.Intn(maxSlices + 1)
	for i := 0; i < numSlices; i++ {
		sliceY := rand.Intn(h)
		sliceH := 1 + rand.Intn(4)
		offsetX := (rand.Intn(10) - 5) * scale
		if sliceY+sliceH > h {
			sliceH = h - sliceY
		}
		orig := image.NewRGBA(image.Rect(0, 0, w, sliceH))
		for sy := 0; sy < sliceH; sy++ {
			for sx := 0; sx < w; sx++ {
				srcX := bounds.Min.X + sx
				srcY := bounds.Min.Y + sliceY + sy
				r, g, b, a := img.At(srcX, srcY).RGBA()
				orig.Set(sx, sy, color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), uint8(a >> 8)})
			}
		}
		for sy := 0; sy < sliceH; sy++ {
			for sx := 0; sx < w; sx++ {
				srcX := sx - offsetX
				if srcX >= 0 && srcX < w {
					r, g, b, a := orig.At(srcX, sy).RGBA()
					dstX := bounds.Min.X + sx
					dstY := bounds.Min.Y + sliceY + sy
					img.Set(dstX, dstY, color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), uint8(a >> 8)})
				}
			}
		}
	}
}

func drawCopy(dst, src *image.RGBA) {
	bounds := src.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := src.At(x, y).RGBA()
			dst.Set(x, y, color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), uint8(a >> 8)})
		}
	}
}

func clamp255(v int) int {
	if v < 0 {
		return 0
	}
	if v > 255 {
		return 255
	}
	return v
}

func applyAllGlitch(img *image.RGBA, frameIdx int, totalFrames int) {
	t := float64(frameIdx) / float64(totalFrames)
	glitchIntensity := 0.3 + 0.7*math.Abs(math.Sin(t*math.Pi*4))

	// Scanlines always
	addScanlines(img, frameIdx)

	// RGB split pulsing
	if frameIdx%2 == 0 {
		addRGBSplit(img, frameIdx, glitchIntensity)
	}

	// Occasional flicker
	addFlicker(img, frameIdx, 0.15*glitchIntensity)

	// Light noise
	addNoise(img, uint8(8*glitchIntensity))

	// Rare glitch slices
	if rand.Float64() < 0.25*glitchIntensity {
		addGlitchSlices(img, frameIdx, 3)
	}
}
