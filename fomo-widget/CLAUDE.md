# FOMO-WIDGET — CLAUDE.md
Agent build phases. Update status line after each phase.

### PHASE 1: SCAFFOLD ✅ DONE
- [x] Directory structure: electron/, src/components/, src/services/, src/utils/, ubersicht/
- [x] package.json with all deps (electron 30, react 18, react-leaflet, leaflet, lucide-react)
- [x] vite.config.js, index.html
- [x] electron/main.js, preload.js, ipc.js from PRD Section 4
- [x] mockData.js seeded with 10 realistic SF tech events (lat/lng, times, tags)

### PHASE 2: DATA SERVICES ✅ DONE
- [x] weatherService.js — Open-Meteo API (no key), SF coords, fallback "62°F, Partly Cloudy"
- [x] lumaService.js — Luma public API with mock fallback when no VITE_LUMA_API_KEY
- [x] eventScorer.js — keyword match (40pts) + attendee density (20pts) + time fit (30pts) + energy (10pts)
- [x] calendarService.js — stubbed, logs "calendar stubbed"

### PHASE 3: CLAUDE CODE RUNNER ✅ DONE
- [x] claudeCodeRunner.js — routeEvents() calls window.electronAPI.runClaude(prompt)
- [x] ipc.js — runClaudeCode() spawns claude CLI, captures stdout
- [x] Fallback to localHeuristicRoute() when not in Electron or Claude unavailable
- [x] write-route IPC writes ~/.fomo-widget/route.json

### PHASE 4: CORE UI ✅ DONE
- [x] VoiceInputBox.jsx — textarea, energy selector, mic button (SpeechRecognition), Find My Route
- [x] App.jsx — full state machine: events, weather, routeData, excludedIds, calendarStatus
- [x] EventCard.jsx — score badge (green/yellow/red), time, travel mins, exclude button
- [x] LiveWidget.jsx — ordered cards, afterparty prediction, share + calendar buttons
- [x] LeaveNowTimer.jsx — live countdown to leave_first_event_at, turns red when < 10min
- [x] RouteMap.jsx — Leaflet OSM, numbered circle markers, dashed polyline route
- [x] index.css — full dark theme, layout system

### PHASE 5: LIVE DATA + CALENDAR ⬜ TODO
- [ ] Wire Luma live API with VITE_LUMA_API_KEY
- [ ] Google Calendar: gapi OAuth or Calendar MCP server
- [ ] Add to Calendar button — writes to primary calendar
- [ ] Verify events appear in Google Calendar
- Commit: "phase-5: live data + calendar sync"

### PHASE 6: ARA INTEGRATION ✅ DONE (wired, needs live test)
- [x] window.araTranscriptCallback global in VoiceInputBox
- [x] window.__fomoWidgetSetInput exposed globally
- [x] Electron IPC socket on port 9876 (main.js)
- [x] SpeechRecognition fallback wired
- [ ] Live test: nc localhost 9876 <<< "hello from ara"

### PHASE 7: ÜBERSICHT WIDGET ✅ DONE
- [x] ubersicht/fomo-widget.jsx polling ~/.fomo-widget/route.json every 60s
- [x] Renders numbered route, scores, travel mins, afterparty, countdown timer
- [x] Glassmorphism dark theme matching main app

### PHASE 8: POLISH + DEMO PREP ⬜ TODO
- [ ] Loading animation with status text
- [ ] Error states: no events, Claude unavailable, network offline
- [ ] "This event sucks" button already wired as onExclude — verify re-route works
- [ ] Share route — copies tweet-ready text (wired in App.jsx)
- [ ] Record demo video

---
CURRENT STATUS: Phases 1–4 + 6 + 7 complete. Run `npm install && npm run dev` to launch.
LAST COMPLETED: Phase 7 (Übersicht widget)
BLOCKING: Phase 5 (calendar) needs gapi OAuth or Calendar MCP setup
KEY CONSTRAINT: Claude Code subprocess is the ONLY intelligence layer. No ANTHROPIC_API_KEY anywhere.

## Quick Start
```bash
cd fomo-widget
npm install
npm run dev          # launches Vite + Electron concurrently
```

## Test Claude Code Runner in devtools
```js
await window.electronAPI.runClaude("respond with the word PONG")
```

## Test Ara socket injection
```bash
echo "I'm free 7pm-midnight, AI events, want to meet investors" | nc localhost 9876
```

## Übersicht widget install
Copy `ubersicht/fomo-widget.jsx` to `~/Library/Application Support/Übersicht/Widgets/`
