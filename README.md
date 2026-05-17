# FOMO-WIDGET

> *SF has too many good events on any given night. The real problem isn't finding them — it's deciding which three to attend, in what order, and when to leave the first one to make the second.*

FOMO-WIDGET solves that in one natural-language sentence. Tell it your goals, your energy level, and your window. It hands you a scored, time-optimized route, draws it on a map, and starts a countdown to your leave time — all powered by a local Claude Code subprocess, no API key anywhere in the stack.

---

## The Aha

The interesting architectural choice isn't using an LLM for event ranking. It's *how* the LLM runs.

Claude Code is invoked as a subprocess — `spawn('claude', ['-p', '--dangerously-skip-permissions'])` — with the routing prompt piped to stdin and structured JSON collected from stdout. No Anthropic API key. No cloud round-trip. The full Claude model runs on the user's machine, inside the Electron app, with a 45-second hard-kill timeout.

This means the "AI layer" is actually a local binary that happens to be a capable reasoning engine. The app works offline (via a deterministic heuristic fallback) and degrades gracefully if Claude isn't installed. The intelligence is optional; the utility is not.

---

## What It Does

1. **Intent in** — type or speak your goals: "Free 7–11pm, high energy, AI and investor events, want to meet founders." Ara can inject intent directly via a local TCP socket on port 9876.

2. **Claude routes** — the prompt is built, sent to the Claude CLI subprocess, and the JSON response is parsed. Claude scores each event (0–100), selects the optimal sequence, estimates travel time between venues, predicts an afterparty location, and writes a one-line widget summary.

3. **Output rendered** — scored event cards with color-coded badges, a Leaflet/OSM map with numbered markers and a dashed route polyline, and a live countdown to when you need to leave the first event.

4. **Widget synced** — the route JSON is written to `~/.fomo-widget/route.json`. The Übersicht desktop widget reads it every 30 seconds and stays current on your macOS wallpaper without any extra setup.

5. **Re-route on demand** — hit the × on any event card to exclude it and trigger an immediate re-route through Claude with the slimmed event list.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Electron Shell                  │
│                                                 │
│  ┌──────────────┐     IPC       ┌────────────┐  │
│  │  React/Vite  │ ◄──────────► │  main.js   │  │
│  │  Renderer    │  contextBridge│            │  │
│  │              │               │  ┌────────┐│  │
│  │  VoiceInput  │               │  │ ipc.js ││  │
│  │  LiveWidget  │               │  │        ││  │
│  │  RouteMap    │               │  │ spawn  ││  │
│  │  LeaveTimer  │               │  │ claude ││  │
│  └──────────────┘               │  └────────┘│  │
│                                 │            │  │
│                                 │  TCP :9876 │  │  ◄── Ara transcript injection
│                                 └────────────┘  │
└─────────────────────────────────────────────────┘
         │ writes
         ▼
~/.fomo-widget/route.json
         │ reads (every 30s)
         ▼
┌─────────────────────┐
│  Übersicht Widget   │  (macOS desktop overlay)
└─────────────────────┘
```

**Key design decisions:**

- **Subprocess over API** — `ipc.js` spawns the Claude CLI with `-p` (print/non-interactive) and pipes the prompt via stdin. This avoids shell argument length limits on large event payloads and keeps the prompt construction in JavaScript where it belongs.

- **Slim prompt, fat merge** — only 7 fields per event are sent to Claude (`id`, `name`, `tags`, `start_time`, `end_time`, `location`, `attendee_count`). After parsing the response, full event data (lat/lng, descriptions, luma URLs) is merged back in. This keeps the prompt token-efficient without losing UI data.

- **File-system contract** — the route JSON is the only interface between the Electron app and the Übersicht widget. Both sides can evolve independently as long as they honor the same schema. The widget doesn't know Electron exists; it just reads a file.

- **Deterministic fallback** — `eventScorer.js` runs a weighted scoring model (keyword match 40pts, attendance density 20pts, time overlap 30pts, energy modifier 10pts) when Claude is unavailable. The app never goes blank.

- **Ara over TCP** — Electron opens a local TCP server on port 9876 at startup. Ara pushes transcript text as raw strings. Main process forwards them to the renderer via `webContents.send`. The renderer appends them to the input box. No keyboard simulation, no focus manipulation.

---

## Running It

```bash
cd fomo-widget
npm install
NODE_ENV=development npm run dev
```

This starts Vite on port 5174 and Electron concurrently. Electron loads the Vite dev server when `NODE_ENV=development`; otherwise it expects `dist/index.html` from a prior build.

**Test the Claude runner from DevTools:**
```js
await window.electronAPI.runClaude("respond with the word PONG")
```

**Test Ara injection:**
```bash
echo "I'm free 7–11pm, AI events, high energy" | nc localhost 9876
```

**Install the Übersicht widget:**
```bash
cp fomo-widget/ubersicht/fomo-widget.jsx \
   ~/Library/Application\ Support/Übersicht/Widgets/
```

---

## What's Live vs. Planned

| Feature | Status |
|---|---|
| Claude Code subprocess routing | ✅ Live |
| Local heuristic fallback (offline) | ✅ Live |
| Live weather via Open-Meteo (no key) | ✅ Live |
| Voice input (SpeechRecognition API) | ✅ Live |
| Ara TCP injection (port 9876) | ✅ Wired — live test pending |
| Übersicht desktop widget | ✅ Live (requires Übersicht install) |
| Leaflet/OSM map with route polyline | ✅ Live |
| Re-route on event exclusion | ✅ Live |
| Share route (tweet-ready clipboard) | ✅ Live |
| Live Luma API events | ⬜ Scaffolded — mocked by default |
| Google Calendar sync | ⬜ Stubbed — logs to console |
| Mapbox tile layer | ⬜ Env var only — OSM used |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 30 |
| UI | React 18 + Vite 6 |
| Map | Leaflet + OpenStreetMap |
| AI routing | Claude Code CLI (local subprocess) |
| Weather | Open-Meteo (no key required) |
| Desktop widget | Übersicht (macOS) |
| Icons | lucide-react |
| Packaging | electron-builder (macOS DMG) |

---

## Ara Integration

Ara is the hackathon's AI assistant layer. FOMO-WIDGET integrates at the input level: Ara listens to ambient voice, transcribes it, and pushes the text to port 9876. Electron forwards it to the React renderer, which appends it to the intent box. From there, the normal routing flow takes over.

The implementation is intentionally minimal — a TCP socket, an IPC relay, and an appending string handler. Ara doesn't need to know anything about FOMO-WIDGET's internal state; it just sends text. FOMO-WIDGET doesn't need to know anything about Ara; it just listens on a port.

---

## Project Structure

```
ara-fomo-widgets2/
└── fomo-widget/
    ├── electron/
    │   ├── main.js          # App entry, IPC handlers, Ara TCP server
    │   ├── preload.js       # contextBridge: exposes 3 methods to renderer
    │   └── ipc.js           # Claude subprocess spawn + route.json writer
    ├── src/
    │   ├── App.jsx           # State machine: events, route, exclusions
    │   ├── components/
    │   │   ├── VoiceInputBox.jsx   # Intent input, voice, Ara hooks
    │   │   ├── LiveWidget.jsx      # Route cards + actions
    │   │   ├── EventCard.jsx       # Scored event with exclude button
    │   │   ├── LeaveNowTimer.jsx   # Live countdown, turns red at <10min
    │   │   └── RouteMap.jsx        # Leaflet map, numbered markers, polyline
    │   ├── services/
    │   │   ├── claudeCodeRunner.js # Prompt builder + IPC call + fallback
    │   │   ├── lumaService.js      # Mock events (live API scaffolded)
    │   │   ├── weatherService.js   # Open-Meteo, no key
    │   │   └── calendarService.js  # Stubbed
    │   └── utils/
    │       ├── eventScorer.js      # Heuristic fallback scoring
    │       └── mockData.js         # 10 realistic SF tech events
    └── ubersicht/
        └── fomo-widget.jsx   # Standalone desktop widget, polls route.json
```
