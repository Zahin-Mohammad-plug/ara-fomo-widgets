# Ara FOMO Widget (YC × Ara Hackathon)

An Electron + React app that turns “what I want to do tonight” into an optimized SF tech event route. It pairs **local Claude Code routing** with a live map, a “leave now” countdown, and an optional **Ubersicht** desktop widget.

## Problem → Solution
**Problem:** SF has too many overlapping events; picking a high‑value route is time‑consuming and error‑prone.  
**Solution:** FOMO Widget ingests your intent (text/voice/Ara), scores events, and outputs a time‑optimized route with a live map + widget so you can go, not plan.

## Why this wins (what judges should notice)
- **Clear user value:** removes friction in going from “I’m free tonight” to a concrete route.
- **AI + deterministic fallback:** Claude Code handles routing; a local heuristic scorer keeps the app functional offline.
- **Multi‑surface UX:** full app UI + lightweight Ubersicht widget fed by `~/.fomo-widget/route.json`.
- **Local‑first privacy:** no Claude API keys; routing runs via a local CLI subprocess.

## Demo script (2–3 minutes)
1. **Start app:** `npm run dev` (from `fomo-widget/`).
2. **Paste intent:** “Free 7–11pm, AI + investor events, medium energy.”
3. **Show outputs:** scored list, route narrative, leave‑now timer, and map.
4. **Exclude an event:** click “This event sucks” to re‑route.
5. **Share:** click “Share Route” (copies tweet‑ready text).
6. **Optional widget:** open Ubersicht to show the live route summary card.

## How it works
1. **Input:** text or voice (SpeechRecognition), plus Ara injection on port `9876`.
2. **Events:** mocked Luma‑style data by default (live API planned).
3. **Routing:** Claude Code prompt → JSON route; fallback heuristic when Claude is unavailable.
4. **Outputs:** route cards, map markers, countdown timer, and widget JSON.

## Project layout
The app lives in `fomo-widget/`.

```
ara-fomo-widgets/
└─ fomo-widget/
```

## Quick start
```bash
cd fomo-widget
npm install
npm run dev
```

## Scripts
From `fomo-widget/`:
- `npm run dev` — Vite + Electron (development)
- `npm run start` — launch Electron using built assets
- `npm run build` — Vite build + electron-builder packaging (macOS DMG target configured)

## Environment variables
Copy `.env.example` → `.env` to enable optional services.

- `VITE_LUMA_API_KEY` — live Luma events (optional; mocked data used without it)
- `VITE_MAPBOX_TOKEN` — optional map tiles (Leaflet + OSM works without it)
- `VITE_GOOGLE_CLIENT_ID` — planned Google Calendar OAuth (stubbed)

> No `ANTHROPIC_API_KEY` is used. Claude runs as a local CLI subprocess.

## Optional integrations
### Claude Code CLI
Install the `claude` CLI so Electron can spawn it. If unavailable, the app falls back to the local heuristic scorer (`src/utils/eventScorer.js`).

### Ara transcript injection
Send transcripts into the app via localhost:
```bash
echo "I'm free 7–11pm, AI events, medium energy" | nc localhost 9876
```

### Ubersicht widget (macOS)
Copy `fomo-widget/ubersicht/fomo-widget.jsx` to:

```
~/Library/Application Support/Ubersicht/Widgets/
```

If your system shows the folder name with an umlaut, use `~/Library/Application Support/Übersicht/Widgets/` instead.

The app writes `~/.fomo-widget/route.json`, which the widget reads and refreshes every 30 seconds.

## Technical highlights
- **Scoring model:** keyword intent match (40pts), attendance density (20pts), time fit (30pts), energy tweaks (10pts).
- **Route output:** ordered events + travel minutes + narrative + leave‑by time.
- **Local JSON contract:** UI and widget read the same `route.json` shape for consistency.

## Current limitations
- Calendar integration is stubbed (Phase 5 in `CLAUDE.md`).
- Live Luma API wiring is not yet enabled by default.
- Packaging is macOS‑targeted (DMG) in `electron-builder` config.

## Next steps (post‑hackathon)
- Integrate live Luma API + Google Calendar OAuth.
- Add richer error states + loading UX polish.
- Ship a signed macOS build.
