# FOMO-WIDGET — CLAUDE.md
Agent build phases. Update status line after each phase.

### PHASE 1: SCAFFOLD ✅ DONE
- [x] Directory structure: electron/, src/components/, src/services/, src/utils/, ubersicht/
- [x] package.json — electron 30, react 18, react-leaflet, leaflet, lucide-react, vite 6, @vitejs/plugin-react 4.3
- [x] vite.config.js — port 5174 (strictPort: true), base './'
- [x] index.html — no CDN leaflet link (imported via npm)
- [x] electron/main.js, preload.js, ipc.js
- [x] mockData.js seeded with 10 realistic SF tech events (lat/lng, times, tags)

### PHASE 2: DATA SERVICES ✅ DONE
- [x] weatherService.js — Open-Meteo API (no key), SF coords, fallback "62°F, Partly Cloudy"
- [x] lumaService.js — returns MOCK_EVENTS directly, no API key required
- [x] eventScorer.js — keyword match (40pts) + attendee density (20pts) + time fit (30pts) + energy (10pts)
- [x] calendarService.js — stubbed, returns []

### PHASE 3: CLAUDE CODE RUNNER ✅ DONE
- [x] claudeCodeRunner.js — routeEvents() calls window.electronAPI.runClaude(prompt)
- [x] Slim event shape sent to Claude (id, name, tags, times, location, attendee_count only)
- [x] ipc.js — uses `claude -p --dangerously-skip-permissions`, prompt via stdin (NOT CLI arg)
- [x] Real 45s timeout with SIGKILL — spawn's built-in timeout option does NOT kill the process
- [x] stdio: ['pipe','pipe','pipe'] — stdin closed after write so Claude never hangs waiting for terminal
- [x] Fallback to localHeuristicRoute() when not in Electron or Claude returns no JSON
- [x] write-route IPC writes ~/.fomo-widget/route.json

### PHASE 4: CORE UI ✅ DONE
- [x] VoiceInputBox.jsx — textarea, energy selector (low/medium/high), mic (SpeechRecognition), Find My Route
- [x] App.jsx — state: events, weather, routeData, isLoading, excludedIds, calendarStatus
- [x] EventCard.jsx — score badge (green ≥80 / yellow ≥60 / red <60), time, travel mins, exclude (X) button
- [x] LiveWidget.jsx — ordered cards, afterparty prediction, share + calendar action buttons
- [x] LeaveNowTimer.jsx — live countdown to leave_first_event_at, turns red when < 10min
- [x] RouteMap.jsx — Leaflet imported via npm (not window.L), L.Icon.Default patched for Vite, numbered markers, dashed polyline
- [x] index.css — full dark theme (#0a0a0f bg), two-panel layout

### PHASE 5: LIVE DATA + CALENDAR ⬜ TODO
- [ ] Google Calendar: gapi OAuth or Calendar MCP server
- [ ] Add to Calendar button — writes to primary calendar
- [ ] Verify events appear in Google Calendar

### PHASE 6: ARA INTEGRATION ✅ DONE (wired, needs live test)
- [x] window.__fomoWidgetSetInput global in VoiceInputBox (Ara DOM injection)
- [x] window.electronAPI.onAraTranscript IPC listener wired
- [x] Electron TCP socket on 127.0.0.1:9876 (main.js) — Ara sends text here
- [x] SpeechRecognition mic fallback wired

### PHASE 7: ÜBERSICHT WIDGET ✅ DONE
- [x] ubersicht/fomo-widget.jsx — polls `$HOME/.fomo-widget/route.json` every 30s
- [x] Uses `$HOME` in shell command string (NOT process.env.HOME — undefined in Übersicht runtime)
- [x] Follows working template pattern: `import { React, css } from "uebersicht"`, css template literals, className export
- [x] Renders numbered route, score badges, travel mins, afterparty card, leave countdown
- [x] Glassmorphism: rgba(0,0,0,0.38), backdrop-filter blur(24px), SF Pro Display font
- [x] widget-template.jsx deleted (was truncated, caused Übersicht parse error at line 279)

### PHASE 8: POLISH + DEMO PREP ⬜ TODO
- [ ] Loading animation with status text during Claude processing
- [ ] Error states: no events, Claude unavailable, network offline
- [ ] Verify exclude (X) button re-routes correctly
- [ ] Share route — copies tweet-ready text (wired in App.jsx)
- [ ] Record demo video

---
CURRENT STATUS: Phases 1–4 + 6 + 7 complete. App runs. Widget live.
LAST COMPLETED: Phase 7 (Übersicht widget fixed and verified)
BLOCKING: Phase 5 (calendar) needs gapi OAuth or Calendar MCP
KEY CONSTRAINT: Claude Code subprocess is the ONLY intelligence layer. No ANTHROPIC_API_KEY anywhere.

## Quick Start
```bash
cd fomo-widget
npm install
npm run dev          # Vite on :5174 + Electron, opens window automatically
```

## Critical implementation notes

**Claude subprocess (ipc.js):**
- Flag is `-p`, not `--print`. Must include `--dangerously-skip-permissions`.
- Prompt goes to stdin, NOT as a CLI argument (arg-length limits + quoting issues).
- `stdio: ['pipe','pipe','pipe']` is mandatory — without it Claude waits for terminal input and hangs forever.
- spawn's `timeout` option does NOT kill — use `setTimeout` + `child.kill('SIGKILL')`.

**Leaflet (RouteMap.jsx):**
- Import `L from 'leaflet'` directly. Never use `window.L` (not set by npm imports).
- Must patch `L.Icon.Default` for Vite or markers show broken images.
- Import `'leaflet/dist/leaflet.css'` inside the component file.

**Übersicht widget:**
- Use `$HOME` in the shell `command` string. `process.env.HOME` is undefined in Übersicht's JS runtime.
- All styles via `css\`...\`` template literals from `"uebersicht"`. No inline style objects for layout.
- `pointer-events: none` on className — widget is display-only.

**Vite port:**
- Port is 5174 with `strictPort: true`. Port 5173 conflicts with another local service.
- `wait-on` and `main.js` loadURL both reference 5174.

## Test Claude runner (Electron devtools console)
```js
await window.electronAPI.runClaude("respond with only the word PONG")
```

## Test Ara socket injection
```bash
echo "free 7pm-midnight, AI events, want to meet investors" | nc localhost 9876
```

## Übersicht widget install
```bash
cp ubersicht/fomo-widget.jsx ~/Library/Application\ Support/Übersicht/Widgets/
```
