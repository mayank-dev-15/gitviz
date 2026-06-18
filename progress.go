package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type ProgressEvent struct {
	Stage   string `json:"stage"`
	Message string `json:"message"`
	Percent int    `json:"percent"`
	Done    bool   `json:"done"`
	Error   string `json:"error,omitempty"`
}

type ProgressBroker struct {
	mu      sync.Mutex
	clients map[chan ProgressEvent]struct{}
}

var broker = &ProgressBroker{
	clients: make(map[chan ProgressEvent]struct{}),
}

func (b *ProgressBroker) Subscribe() chan ProgressEvent {
	ch := make(chan ProgressEvent, 16)
	b.mu.Lock()
	b.clients[ch] = struct{}{}
	b.mu.Unlock()
	return ch
}

func (b *ProgressBroker) Unsubscribe(ch chan ProgressEvent) {
	b.mu.Lock()
	delete(b.clients, ch)
	b.mu.Unlock()
	close(ch)
}

func (b *ProgressBroker) Publish(event ProgressEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for ch := range b.clients {
		select {
		case ch <- event:
		default:
		}
	}
}

func publishProgress(stage, message string, percent int) {
	broker.Publish(ProgressEvent{
		Stage:   stage,
		Message: message,
		Percent: percent,
	})
}

func publishDone() {
	broker.Publish(ProgressEvent{
		Stage:   "done",
		Message: "Analysis complete!",
		Percent: 100,
		Done:    true,
	})
}

func publishError(msg string) {
	broker.Publish(ProgressEvent{
		Stage:   "error",
		Message: msg,
		Error:   msg,
	})
}

func handleProgressSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", 500)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch := broker.Subscribe()
	defer broker.Unsubscribe(ch)

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-ch:
			if !ok {
				return
			}
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
			if event.Done || event.Error != "" {
				return
			}
		case <-time.After(30 * time.Second):
			fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}
