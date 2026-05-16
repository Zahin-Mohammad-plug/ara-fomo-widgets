---
name: uebersicht-widget
description: >
  Write, edit, debug, and design Übersicht widgets — the macOS desktop overlay app
  that renders live JSX/React widgets on the desktop. Use this skill whenever the user
  mentions Übersicht, wants a macOS desktop widget, asks for a .jsx widget file,
  wants to show live data on their desktop (CPU stats, weather, clocks, system info,
  music now-playing, etc), or asks you to build or fix a widget. Even if they just
  say "write me a widget" or "make a desktop overlay" on macOS, use this skill.
---

# Übersicht Widget Skill

Übersicht is a macOS app that renders React/JSX widgets directly on the desktop as
transparent overlays. Widgets are single `.jsx` files placed in `~/Library/Application Support/Übersicht/widgets/`.
The app watches for file changes and live-reloads them.

## Critical: JSX Compilation & React Import

Übersicht compiles JSX with a **custom `html` pragma**, not `React.createElement`. This means:

```jsx
// This JSX:
<div>Hello</div>

// Compiles to:
html('div', null, 'Hello')

// NOT to:
// React.createElement('div', null, 'Hello')
```

**Therefore:** React hooks (`useState`, `useEffect`, etc.) still come from the `React` object,
but you **must import it from `"uebersicht"`** — it is NOT available as a global variable.

```jsx
// ✅ CORRECT:
import { React, css } from "uebersicht";
const { useState, useEffect } = React;

// ❌ WRONG — "can't find react" error:
import { css } from "uebersicht";
const { useState } = React; // React is undefined!
```

### Complete list of `"uebersicht"` exports

| Export | What it is |
|---|---|
| `React` | React with hooks (`useState`, `useEffect`, `useRef`, etc.) |
| `css` | Emotion CSS-in-JS tagged template literal |
| `styled` | Emotion styled components factory |
| `run` | Shell command runner (`run("cmd").then(...)`) |
| `request` | Superagent HTTP client (`request.get(url)`) |

```jsx
import { React, css, styled, run, request } from "uebersicht";
```

---

## Core Widget Structure

Every widget is a `.jsx` file that exports a set of named constants and functions.
None are strictly required — export only what you need.

```jsx
// minimal widget
export const command = "date";
export const refreshFrequency = 5000;
export const className = `top: 20px; left: 20px; color: white; font-size: 14px;`;
export const render = ({ output }) => <div>{output}</div>;
```

Widgets are `position: absolute` relative to the screen (below the menu bar).
Top-left corner is `top: 0; left: 0`.

## Exported APIs

### `command` — Data Source
Three forms:
```jsx
// 1. Shell string — output becomes props.output
export const command = "echo hello";

// 2. Function with dispatch — for fetch/async flows
export const command = (dispatch) =>
  fetch("https://api.example.com/data")
    .then(r => r.json())
    .then(data => dispatch({ type: "DATA_LOADED", data }))
    .catch(err => dispatch({ type: "ERROR", error: err }));

// 3. Undefined — no automatic refresh (use init or hooks instead)
export const command = undefined;
```

Watch out for shell quoting — escape inner quotes:
```jsx
export const command = `ps axo "rss,pid,ucomm" | sort -nr | head -n5`;
```

### `refreshFrequency`
Milliseconds between command runs. `false` = no auto-refresh.
```jsx
export const refreshFrequency = 10000; // every 10s
export const refreshFrequency = false;  // manual only — use for pure frontend widgets
```
Default: `1000` (1 second).

### `className` — Root Element Styling
Positions and styles the widget's outermost element.
```jsx
// Object form
export const className = {
  top: "20px",
  right: "20px",
  color: "white",
  fontFamily: "SF Mono, monospace",
};

// Template literal form (recommended for Emotion integration)
export const className = `
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.85);
`;

// Emotion css`` form (allows full CSS including pseudo-selectors)
import { css } from "uebersicht";
export const className = css`
  top: 10px;
  right: 20px;
  color: white;
  h1 { font-size: 20px; }
`;
```

### `render` — JSX Output
Receives `props` (the current state) and optionally `dispatch` for event-driven updates.
Default props are `{ output, error }`.
```jsx
export const render = ({ output, error }) => {
  if (error) return <div style={{color:"red"}}>Error: {String(error)}</div>;
  return <div>{output}</div>;
};

// With dispatch for interactive widgets:
export const render = ({ output }, dispatch) => (
  <button onClick={() => dispatch({ type: "CLICKED" })}>
    {output}
  </button>
);
```

### `updateState` — State Transform
Called on every command result. Must return the next state (passed as props to render).
```jsx
export const updateState = (event, previousState) => {
  if (event.error) return { ...previousState, error: event.error };
  const lines = event.output.trim().split("\n");
  return { items: lines, error: null };
};
```
Use `event.type` for multi-source widgets:
```jsx
export const updateState = (event, previousState) => {
  switch (event.type) {
    case "WEATHER_LOADED": return { ...previousState, weather: event.data };
    case "TIME_TICK":      return { ...previousState, time: event.output };
    default: return previousState;
  }
};
```

### `initialState`
The state before any command runs. Important when using `updateState`.
```jsx
export const initialState = { items: [], error: null, loading: true };
```
Default: `{ output: "" }`.

### `init` — One-Time Setup
Runs once on load. Use for WebSockets, subscriptions, or one-off async work.
```jsx
export const init = (dispatch) => {
  const ws = new WebSocket("ws://localhost:8080");
  ws.addEventListener("message", (e) => {
    dispatch({ type: "MESSAGE", data: JSON.parse(e.data) });
  });
};
```

---

## Pure Frontend Widgets (No Shell Command)

For widgets that only need client-side timing (clocks, timers, animations), use
`refreshFrequency: false` with React hooks to manage updates. This is more efficient
than spawning a shell process every second.

```jsx
import { React, css } from "uebersicht";

export const refreshFrequency = false; // no shell command needed

export const className = css`
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-family: "SF Pro Display", sans-serif;
  text-align: center;
`;

const BeautifulClock = () => {
  const { useState, useEffect } = React;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");

  return (
    <div>
      <div style={{ fontSize: "72px", fontWeight: 200 }}>{h}:{m}</div>
      <div style={{ fontSize: "22px", opacity: 0.5 }}>{s}</div>
    </div>
  );
};

export const render = () => <BeautifulClock />;
```

> **Important:** Hooks (`useState`, `useEffect`) MUST be called inside a component function
> that is invoked from `render`, not directly inside `render` itself. Always wrap hook-using
> code in a separate component function.

### Rule: Never call hooks directly inside `render`

```jsx
// ❌ WRONG:
export const render = () => {
  const [n, setN] = React.useState(0); // error!
  return <div>{n}</div>;
};

// ✅ CORRECT:
const Widget = () => {
  const [n, setN] = React.useState(0);
  return <div>{n}</div>;
};
export const render = () => <Widget />;
```

---

## Styling

Übersicht bundles **Emotion v9**. Import `css` or `styled` from `"uebersicht"`:

```jsx
import { React, css, styled } from "uebersicht";

const card = css`
  background: rgba(0,0,0,0.5);
  border-radius: 10px;
  padding: 12px 16px;
  backdrop-filter: blur(10px);
`;

const Label = styled("span")`
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.6;
  letter-spacing: 0.08em;
`;

export const render = ({ value }) => (
  <div className={card}>
    <Label>CPU</Label>
    <div>{value}%</div>
  </div>
);
```

### Styling Tips
- Use `rgba()` colors for glassy/transparent looks
- `backdrop-filter: blur(Npx)` for frosted glass (works in Übersicht's WebView)
- Widgets are rendered over the desktop wallpaper — design for variable backgrounds
- System fonts: `-apple-system`, `"SF Pro Display"`, `"SF Mono"`, `"Helvetica Neue"`
- Use `pointer-events: none` on non-interactive widgets to let clicks pass through
- Default to dark translucent cards with `border-radius: 14px–20px`
- Use `tabular-nums` font-variant for clocks/numbers to avoid layout jitter

---

## Running Shell Commands from Render

```jsx
import { run } from "uebersicht";

export const render = ({ output }, dispatch) => (
  <button onClick={() =>
    run("open -a 'Music'").then(() => dispatch({ type: "OPENED" }))
  }>
    Open Music
  </button>
);
```
> Requires Übersicht to have Accessibility access for click events to work.

---

## Geolocation

Use `window.geolocation` (not `navigator.geolocation`):
```jsx
export const init = (dispatch) => {
  window.geolocation.getCurrentPosition((pos) => {
    dispatch({ type: "LOCATION", lat: pos.coords.latitude, lng: pos.coords.longitude });
  });
};
```
Provides standard `Position` object plus an `address` property with Street, City, ZIP,
Country, State, CountryCode.

---

## Built-in Proxy Server

For cross-origin API requests without CORS issues:
```
http://127.0.0.1:41417/https://api.example.com/endpoint
```
Prepend the proxy URL to the full target URL.

---

## AppleScript Control

```applescript
tell application id "tracesOf.Uebersicht" to refresh
tell application id "tracesOf.Uebersicht" to refresh widget id "my-widget"
tell application id "tracesOf.Uebersicht" to set hidden of widget id "my-widget" to true
```

---

## File & Module Conventions

- Widget files go in `~/Library/Application Support/Übersicht/widgets/my-widget.jsx`
- Shared modules: place in subdirectories named `/node_modules`, `/lib`, or `/src` within the widgets directory
- Import with ESM: `import { helper } from "./lib/helpers.jsx"`
- Übersicht re-exports: `import { React, css, styled, run, request } from "uebersicht"`

---

## Troubleshooting

### "Can't find react" / "React is not defined"
You forgot to import `React` from `"uebersicht"`. Add it to your import:
```jsx
// ❌ Missing React import:
import { css } from "uebersicht";

// ✅ Fixed:
import { React, css } from "uebersicht";
```

### Widget doesn't appear
- Check the Übersicht menu bar icon — the widget may be hidden. Use the "Show/Hide" menu.
- Verify the file has a `.jsx` extension.
- Check for syntax errors — open Console.app and filter for "Übersicht".
- Widgets use `position: absolute` — make sure you're not positioning offscreen.
- Run `pgrep -l Übersicht` to verify the app is running.

### Hooks error ("Invalid hook call")
Make sure you're calling hooks inside a component function, not directly in `render`:
```jsx
// ✅ Correct pattern:
const MyWidget = () => {
  const [state, setState] = React.useState(0); // OK — inside component
  return <div>{state}</div>;
};
export const render = () => <MyWidget />;
```

### Styling not applying
- Use `className={myCss}` (Emotion `css` generates a class name string).
- Do NOT use `class` or `style` for Emotion styles; use `className`.
- For inline styles, use the `style={{...}}` prop as usual with React.

---

## Widget Design Best Practices

1. **Always handle errors** — `output` and `error` can both be present; show a fallback.
2. **Start with `className` positioning** — get placement right before polishing style.
3. **Keep shell commands fast** — slow commands block the refresh cycle.
4. **Use `refreshFrequency: false` with React hooks** for pure frontend widgets (clocks, timers).
5. **Avoid magic numbers** — define layout constants at the top for easy tweaking.
6. **Use `refreshFrequency: false` with `init`** for event-driven widgets (WebSocket etc.).
7. **Test with different wallpapers** — light and dark; use contrast-safe colors.
8. **Escape shell args** — backtick template literals help avoid quote-nesting bugs.
9. **`initialState` is your loading state** — show a skeleton or "loading…" message.
10. **Never import React from `"react"`** — always use `import { React } from "uebersicht"`.

---

## Quick Reference

| Export | Type | Purpose |
|---|---|---|
| `command` | string \| function \| undefined | Data source |
| `refreshFrequency` | number \| false | Refresh interval (ms) |
| `className` | string \| object | Root element CSS |
| `render` | function(props, dispatch?) → JSX | UI output |
| `updateState` | function(event, prevState) → state | State transform |
| `initialState` | object | State before first command |
| `init` | function(dispatch) | One-time setup |

### `"uebersicht"` module exports

| Export | Description |
|---|---|
| `React` | React with hooks (`useState`, `useEffect`, etc.) |
| `css` | Emotion CSS tagged template |
| `styled` | Emotion styled-components factory |
| `run` | Shell command executor |
| `request` | Superagent HTTP client |
