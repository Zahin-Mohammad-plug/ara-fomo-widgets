# Widget Patterns

Annotated examples of common Übersicht widget patterns.

## Clock / Date Widget (Pure Frontend — Recommended)

Use `refreshFrequency: false` with React hooks for clocks. This avoids spawning a shell
process every second and gives you full control over rendering.

```jsx
import { React, css } from "uebersicht";

export const refreshFrequency = false;

export const className = css`
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 36px 52px;
  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  font-family: "SF Pro Display", "Helvetica Neue", sans-serif;
  color: #ffffff;
  text-align: center;
  pointer-events: none;
  user-select: none;
`;

const timeStyle = css`
  font-size: 72px;
  font-weight: 200;
  letter-spacing: 2px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
`;

const dateStyle = css`
  font-size: 16px;
  font-weight: 400;
  opacity: 0.55;
  margin-top: 8px;
`;

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const pad = (n) => String(n).padStart(2, "0");

const Clock = () => {
  const { useState, useEffect } = React;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className={timeStyle}>
        {pad(now.getHours())}:{pad(now.getMinutes())}
      </div>
      <div className={dateStyle}>
        {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
      </div>
    </div>
  );
};

export const render = () => <Clock />;
```

> **Note:** `React` MUST be imported from `"uebersicht"` — it is not a global variable.
> `import { React, css } from "uebersicht";` is the correct pattern.

## Clock / Date Widget (Shell-Based — Legacy)

The older approach using a shell command. Still works but spawns a process every second.

```jsx
export const refreshFrequency = 1000;
export const command = "date '+%H:%M:%S'";

export const className = `
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-family: SF Mono, monospace;
  font-size: 72px;
  font-weight: 300;
  text-shadow: 0 2px 12px rgba(0,0,0,0.6);
  text-align: center;
`;

export const render = ({ output }) => <div>{output}</div>;
```

## CPU Stats Widget

```jsx
import { css } from "uebersicht";

export const refreshFrequency = 2000;
export const command = `top -l 1 -n 0 | grep "CPU usage" | awk '{print $3, $5, $7}'`;

export const updateState = (event, prevState) => {
  if (event.error) return { ...prevState, error: event.error };
  const [user, sys, idle] = event.output.replace(/%/g, "").split(" ");
  return { user: parseFloat(user), sys: parseFloat(sys), idle: parseFloat(idle) };
};

export const initialState = { user: 0, sys: 0, idle: 0 };

const container = css`
  top: 20px;
  right: 20px;
  background: rgba(0,0,0,0.4);
  border-radius: 12px;
  padding: 12px 18px;
  color: white;
  font-family: SF Mono, monospace;
  font-size: 13px;
  backdrop-filter: blur(12px);
`;

const bar = css`
  height: 4px;
  border-radius: 2px;
  margin-top: 4px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
  width: 120px;
`;

const fill = (pct) => css`
  height: 100%;
  width: ${pct}%;
  border-radius: 2px;
  background: linear-gradient(90deg, #4facfe, #00f2fe);
`;

export const render = ({ user, sys }) => (
  <div className={container}>
    <div>CPU {(user + sys).toFixed(0)}%</div>
    <div className={bar}><div className={fill(user + sys)} /></div>
  </div>
);
```

## Weather Widget (API fetch)

```jsx
export const refreshFrequency = 600000; // 10 minutes
export const command = (dispatch) => {
  const lat = 37.7749; // your latitude
  const lon = -122.4194; // your longitude
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
    .then(r => r.json())
    .then(data => dispatch({ type: "WEATHER", data: data.current_weather }))
    .catch(err => dispatch({ type: "ERROR", error: err.message }));
};

export const updateState = (event, prevState) => {
  if (event.error) return { ...prevState, error: event.error };
  if (event.type === "WEATHER") return { ...prevState, weather: event.data };
  return prevState;
};

export const initialState = { weather: null, error: null };

export const className = {
  top: "20px",
  left: "20px",
  color: "white",
  fontFamily: "-apple-system",
  fontSize: "16px",
};

export const render = ({ weather, error }) => {
  if (error) return <div>Weather error: {error}</div>;
  if (!weather) return <div>Loading weather…</div>;
  return (
    <div>
      <div style={{fontSize:"36px",fontWeight:"200"}}>{weather.temperature}°C</div>
      <div style={{opacity:0.6}}>Wind {weather.windspeed} km/h</div>
    </div>
  );
};
```

## Now Playing (Music App via AppleScript)

```jsx
export const refreshFrequency = 2000;
export const command = `
  osascript -e '
    if application "Music" is running then
      tell application "Music"
        if player state is playing then
          return name of current track & "|" & artist of current track & "|" & album of current track
        end if
      end tell
    end if
  '
`;

export const updateState = (event, prevState) => {
  if (event.error) return { ...prevState, error: event.error };
  const output = event.output?.trim();
  if (!output) return { ...prevState, track: null, artist: null, playing: false };
  const [track, artist, album] = output.split("|");
  return { track, artist, album, playing: true, error: null };
};

export const initialState = { track: null, artist: null, album: null, playing: false };

export const className = {
  bottom: "40px",
  left: "50%",
  transform: "translateX(-50%)",
  color: "white",
  fontFamily: "-apple-system",
  textAlign: "center",
};

const pill = {
  background: "rgba(0,0,0,0.5)",
  borderRadius: "20px",
  padding: "10px 24px",
  backdropFilter: "blur(12px)",
};

export const render = ({ track, artist, playing }) => {
  if (!playing) return null; // hidden when nothing is playing
  return (
    <div style={pill}>
      <div style={{fontWeight:"600",fontSize:"14px"}}>{track}</div>
      <div style={{fontSize:"12px",opacity:0.7}}>{artist}</div>
    </div>
  );
};
```

## Interactive Widget

```jsx
import { run } from "uebersicht";

export const refreshFrequency = false; // no auto-refresh
export const command = "echo 'ready'";

export const className = {
  bottom: "20px",
  right: "20px",
  color: "white",
  fontFamily: "-apple-system",
};

export const render = (props, dispatch) => (
  <div style={{
    display: "flex",
    gap: "8px",
    pointerEvents: "auto", // enable clicks
  }}>
    <button onClick={() => run("open -a 'Music'")}
      style={{
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: "8px",
        color: "white",
        padding: "8px 16px",
        fontFamily: "inherit",
        cursor: "pointer",
      }}>
      🎵 Music
    </button>
    <button onClick={() => run("open -a 'Safari')"}
      style={{
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: "8px",
        color: "white",
        padding: "8px 16px",
        fontFamily: "inherit",
        cursor: "pointer",
      }}>
      🌐 Safari
    </button>
  </div>
);
```

## Hooks-Based Widget (No Shell Command)

For widgets that only need client-side state and timing. Always import `React` from `"uebersicht"`.

```jsx
import { React, css } from "uebersicht";

export const refreshFrequency = false;

const Counter = () => {
  const { useState, useEffect } = React;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return <div style={{ color: "white", fontSize: 48 }}>{count}</div>;
};

export const render = () => <Counter />;
```
