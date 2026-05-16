# Ara FOMO Widget

Electron + React desktop app that turns your “what I want to do tonight” into an optimized SF tech event route. It pairs local Claude Code routing with a live map, a “leave now” countdown, and an optional Übersicht widget.

## What’s inside
- **Intent → route**: text or voice input is routed through Claude Code (local CLI) with a heuristic fallback.
- **Event data**: mocked Luma-style events by default; live API wiring is planned.
- **Weather**: Open‑Meteo (no API key) for SF conditions.
- **Map + widgets**: Leaflet map in-app and a glassmorphism Übersicht widget.
- **Ara integration**: local socket injection for transcripts on port `9876`.

## Project layout
This repo’s app lives in `fomo-widget/`.

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
- `npm run build` — Vite build + electron-builder packaging

## Environment variables
Copy `.env.example` → `.env` if you want to configure optional services.

- `VITE_LUMA_API_KEY` — live Luma events (optional; mocked data used without it)
- `VITE_MAPBOX_TOKEN` — optional map tiles (Leaflet + OSM works without it)
- `VITE_GOOGLE_CLIENT_ID` — planned Google Calendar OAuth (stubbed)

> No `ANTHROPIC_API_KEY` is used. Claude runs as a local CLI subprocess.

## Optional integrations
### Claude Code CLI
For full routing, install the `claude` CLI so Electron can spawn it. If unavailable, the app falls back to the local heuristic scorer.

### Ara transcript injection
Ara can send transcripts into the app via localhost:
```bash
echo "I'm free 7–11pm, AI events, medium energy" | nc localhost 9876
```

### Übersicht widget
Copy `fomo-widget/ubersicht/fomo-widget.jsx` to:

```
~/Library/Application Support/Übersicht/Widgets/
```

The app writes `~/.fomo-widget/route.json`, which the widget reads and refreshes every 30 seconds.

## Current limitations
- Calendar integration is stubbed (Phase 5 in `CLAUDE.md`).
- Live Luma API wiring is not yet enabled by default.

