import { React, css } from "uebersicht";

// ── Config ────────────────────────────────────────────────────────────

// Poll every 30s — fast enough to feel live after a re-route, slow enough
// that the shell cat command doesn't create noticeable CPU load.
export const refreshFrequency = 30000;

// Reading a local file via shell command is Übersicht's standard data-fetch
// pattern. The 2>/dev/null + fallback '{}' means the widget renders its
// empty state gracefully when no route has been planned yet.
export const command = `cat "$HOME/.fomo-widget/route.json" 2>/dev/null || echo '{}'`;

// ── Container ─────────────────────────────────────────────────────────

export const className = css`
  top: 100px;
  right: 28px;
  width: 300px;
  padding: 22px 24px 20px;
  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(24px) saturate(175%);
  -webkit-backdrop-filter: blur(24px) saturate(175%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 20px 56px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.04) inset;
  font-family: "SF Pro Display", "Helvetica Neue", -apple-system, sans-serif;
  color: #ffffff;
  pointer-events: none;
  user-select: none;
`;

// ── Styles ────────────────────────────────────────────────────────────

const headerStyle = css`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const logoStyle = css`
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #c4b5fd;
`;

const logoSubStyle = css`
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
  opacity: 0.28;
`;

const summaryStyle = css`
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.28;
  margin-bottom: 14px;
`;

const sectionLabelStyle = css`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.28;
  margin-bottom: 10px;
`;

const eventRowStyle = css`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
`;

const rankStyle = css`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(167, 139, 250, 0.9);
  color: #000;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
`;

const eventNameStyle = css`
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(255, 255, 255, 0.9);
`;

const eventMetaStyle = css`
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.32);
  margin-top: 3px;
  line-height: 1.4;
`;

const dividerStyle = css`
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 12px 0;
`;

const afterpartyStyle = css`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(244, 114, 182, 0.06);
  border-radius: 10px;
  border: 1px solid rgba(244, 114, 182, 0.12);
`;

const afterpartyLabelStyle = css`
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(244, 114, 182, 0.7);
  margin-bottom: 2px;
`;

const afterpartyVenueStyle = css`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
`;

const timerStyle = css`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(167, 139, 250, 0.07);
  border-radius: 10px;
  border: 1px solid rgba(167, 139, 250, 0.12);
  font-size: 11px;
  font-weight: 500;
  color: rgba(167, 139, 250, 0.85);
`;

const timerCountStyle = css`
  margin-left: auto;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: #c4b5fd;
`;

const emptyStyle = css`
  font-size: 12px;
  opacity: 0.3;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
`;

// ── Helpers ───────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, "0");

// The countdown recomputes from wall clock on every 1s tick (via setInterval
// in the component). Übersicht doesn't re-run the shell command that often,
// so the timer stays accurate even between file-system polls.
const formatCountdown = (leaveAt) => {
  if (!leaveAt) return null;
  const [h, m] = leaveAt.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) return null;
  const diff = Math.max(0, Math.floor((target - now) / 1000));
  return `${pad(Math.floor(diff / 60))}:${pad(diff % 60)}`;
};

const scoreColor = (score) => {
  if (score >= 80) return "rgba(74, 222, 128, 0.8)";
  if (score >= 60) return "rgba(250, 204, 21, 0.8)";
  return "rgba(248, 113, 113, 0.8)";
};

// ── Component ─────────────────────────────────────────────────────────

const FomoWidget = ({ output }) => {
  const { useState, useEffect } = React;

  const [data, setData] = useState({});
  // tick drives the countdown re-render every second without needing to
  // re-fetch the file — the route data is stable between 30s refreshes.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    try { setData(JSON.parse(output || "{}")); } catch {}
  }, [output]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const {
    optimized_route = [],
    scored_events = [],
    predicted_afterparty_location,
    leave_first_event_at,
    widget_summary,
  } = data;

  const routeEvents = optimized_route
    .map((id) => scored_events.find((e) => e.id === id))
    .filter(Boolean);

  const firstEvent = routeEvents[0];
  const countdown = formatCountdown(leave_first_event_at);

  return (
    <div>
      <div className={headerStyle}>
        <span className={logoStyle}>◉ FOMO-WIDGET</span>
        <span className={logoSubStyle}>by Ara</span>
      </div>

      {widget_summary && (
        <div className={summaryStyle}>{widget_summary}</div>
      )}

      {routeEvents.length === 0 ? (
        <div className={emptyStyle}>No route yet — plan your night in FOMO-WIDGET</div>
      ) : (
        <div>
          <div className={sectionLabelStyle}>Tonight's Route</div>

          {routeEvents.map((event, i) => (
            <div key={event.id} className={eventRowStyle}>
              <div className={rankStyle}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={eventNameStyle}>{event.name}</div>
                <div className={eventMetaStyle}>
                  📍 {event.location} · {event.start_time}
                  {event.score != null && (
                    <span style={{ color: scoreColor(event.score), marginLeft: 6 }}>
                      {event.score}/100
                    </span>
                  )}
                  {event.travel_minutes_from_previous > 0 && (
                    <span> · 🚶 {event.travel_minutes_from_previous}min</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {predicted_afterparty_location && (
            <div>
              <div className={dividerStyle} />
              <div className={afterpartyStyle}>
                <span style={{ fontSize: 16 }}>🔮</span>
                <div>
                  <div className={afterpartyLabelStyle}>Afterparty</div>
                  <div className={afterpartyVenueStyle}>{predicted_afterparty_location}</div>
                </div>
              </div>
            </div>
          )}

          {countdown && firstEvent && (
            <div className={timerStyle}>
              <span>⏱</span>
              <span>Leave in</span>
              <span className={timerCountStyle}>{countdown}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const render = ({ output }) => <FomoWidget output={output} />;
