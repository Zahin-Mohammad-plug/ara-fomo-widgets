# FOMO-WIDGET

**You're free tonight. SF has thirty events. You have two hours to decide. You always pick wrong.**

FOMO-WIDGET takes what you're trying to do — *"free 7pm to midnight, AI events, want to meet investors, medium energy"* — and turns it into a time-optimized route, a live map, and a countdown telling you exactly when to leave. It runs on your machine. No cloud API key required.

---

## The Aha

The routing intelligence is Claude Code — the local CLI, spawned as a child process from Electron. Not the Anthropic API. Not a hosted model endpoint. The `claude` binary on your laptop, receiving a structured prompt via stdin and returning a JSON route.

This means the app works on a plane. It means your event list and personal availability never leave your machine. And it means the AI layer is the same tool engineers use to write code — repurposed as a real-time event planner.

---

## What It Does End to End

```
User types (or speaks, or Ara injects):
  "Free 7–11pm, AI + investor events, high energy"
            │
            ▼
  App builds a routing prompt with:
    - Slim event objects (name, tags, times, location, attendee count)
    - Live SF weather from Open-Meteo (no API key)
    - Calendar blocks (stubbed; wired for Phase 5)
            │
            ▼
  Electron spawns:  claude -p --dangerously-skip-permissions
  Prompt → stdin, JSON → stdout
  45s hard-kill via SIGKILL (spawn's timeout option doesn't kill)
            │
            ▼
  Claude returns scored events + optimized route + narrative +
  leave_first_event_at + predicted_afterparty_location
            │
            ▼
  Full event data (lat/lng, descriptions) merged back in
  UI: ranked cards, live countdown, Leaflet map with numbered markers
  Widget: route.json written to ~/.fomo-widget/ → Übersicht reads it
```

If Claude isn't installed or times out, the app falls back to a local heuristic scorer that uses the same JSON output shape — so the UI and Übersicht widget never need to branch.

---

## Ara Integration

FOMO-WIDGET was built for the Ara hackathon. Ara is an AI assistant that runs on macOS and can hear you speak. The integration is deliberately low-tech:

Electron opens a raw TCP socket on `127.0.0.1:9876`. When Ara hears a voice command, it connects and pushes the transcript as a UTF-8 string. Electron forwards it to the renderer via IPC. The intent box fills with your spoken words. You hit Find My Route.

No shared library. No SDK dependency. No clipboard tricks. The protocol is: send text, get route.

Test it without Ara:
```bash
echo "free 7pm to midnight, AI events, want to meet investors" | nc localhost 9876
```

---

## Architecture

```
ara-fomo-widgets2/
└── fomo-widget/
    ├── electron/
    │   ├── main.js          # BrowserWindow + IPC handlers + TCP socket (port 9876)
    │   ├── ipc.js           # claude CLI subprocess logic — the interesting file
    │   └── preload.js       # contextBridge: exposes runClaude, writeRoute, onAraTranscript
    ├── src/
    │   ├── App.jsx          # State orchestration: events, weather, route, excludedIds
    │   ├── components/
    │   │   ├── VoiceInputBox.jsx    # Text + SpeechRecognition + Ara listener
    │   │   ├── LiveWidget.jsx       # Route cards + afterparty + share/calendar actions
    │   │   ├── EventCard.jsx        # Score badge (green ≥80 / yellow ≥60 / red <60) + exclude
    │   │   ├── LeaveNowTimer.jsx    # Live countdown, turns red under 10 minutes
    │   │   └── RouteMap.jsx         # Leaflet map, numbered div-icon markers, dashed polyline
    │   ├── services/
    │   │   ├── claudeCodeRunner.js  # Prompt builder + Claude IPC call + JSON parser + fallback
    │   │   ├── lumaService.js       # Returns mock Luma-style events (live API: add key)
    │   │   ├── weatherService.js    # Open-Meteo, no key required
    │   │   └── calendarService.js   # Stubbed (Phase 5: Google Calendar OAuth)
    │   └── utils/
    │       ├── eventScorer.js       # Local heuristic fallback, same JSON shape as Claude
    │       └── mockData.js          # 10 realistic SF tech events with real coordinates
    └── ubersicht/
        └── fomo-widget.jsx  # Übersicht desktop widget — polls route.json every 30s
```

**The shared contract:** Claude returns JSON; the heuristic returns the same JSON; both write to `~/.fomo-widget/route.json`. The Übersicht widget and the UI both consume that shape. One format, three consumers, no divergence.

---

## Scoring Model

The heuristic scorer (and the dimensions Claude uses) break a score of 0–100 into four components:

| Signal | Max pts | How |
|---|---|---|
| Keyword intent match | 40 | Overlapping goal categories (AI, investors, founders, builders, crypto…) |
| Attendee density | 20 | Linear scale to 300 attendees |
| Time fit | 30 | Overlap between event window and stated availability |
| Energy adjustment | 10 | Hackathons score up at high energy; large events score down at low |

Score ≥ 80 → green. ≥ 60 → yellow. < 60 → red.

---

## Quick Start

```bash
cd fomo-widget
npm install
npm run dev        # Vite on :5174 + Electron (opens automatically)
```

Requires the `claude` CLI for AI routing. Without it, the local heuristic runs instead.

```bash
# Test Claude subprocess directly from Electron DevTools:
await window.electronAPI.runClaude("respond with only the word PONG")
```

## Environment Variables

Copy `.env.example` → `.env` to unlock optional live data.

| Variable | Purpose |
|---|---|
| `VITE_LUMA_API_KEY` | Live Luma events (mock data used without it) |
| `VITE_MAPBOX_TOKEN` | Optional map tiles (OSM works without it) |
| `VITE_GOOGLE_CLIENT_ID` | Google Calendar OAuth (stubbed — Phase 5) |

> No `ANTHROPIC_API_KEY`. Claude runs as a local CLI subprocess.

---

## Übersicht Widget

The macOS desktop widget reads `~/.fomo-widget/route.json` every 30 seconds and renders a glassmorphism route card over your wallpaper. It's display-only (`pointer-events: none`) — meant to be glanceable while you're in other apps.

```bash
cp fomo-widget/ubersicht/fomo-widget.jsx \
   ~/Library/Application\ Support/Übersicht/Widgets/
```

Two implementation details worth knowing:

- Uses `$HOME` in the shell `command` string, not `process.env.HOME` — that's `undefined` in Übersicht's JS runtime.
- All CSS via Emotion `css` template literals from `"uebersicht"`. The widget was written against Übersicht's actual module system, not assumptions from the docs.

---

## What's Live vs. Stubbed

| Feature | Status |
|---|---|
| Claude Code routing | Live |
| Local heuristic fallback | Live |
| Weather (Open-Meteo) | Live |
| Leaflet map + markers | Live |
| Leave-now countdown | Live |
| Exclude event + re-route | Live |
| Share route (clipboard) | Live |
| Ara TCP injection | Live (wired, needs Ara running) |
| SpeechRecognition mic | Live |
| Übersicht widget | Live |
| Luma live events | Stubbed (mock data) |
| Google Calendar write | Stubbed (Phase 5) |

---

## Current Limitations

- Event data is mocked. The Luma API wiring exists; it needs a key and the fetch call plumbed through.
- Calendar integration is stubbed — `addEventsToCalendar` returns a success message but doesn't write to Google Calendar.
- Build target is macOS (DMG via electron-builder). Linux/Windows untested.
