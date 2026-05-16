import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

function parseTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

export function LeaveNowTimer({ leaveAt, eventName }) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    const target = parseTime(leaveAt);
    if (!target) return;

    function tick() {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsLeft(diff);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [leaveAt]);

  if (secondsLeft === null) return null;

  const hours = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;

  const pad = n => n.toString().padStart(2, '0');
  const display = hours > 0
    ? `${hours}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`;

  const isUrgent = secondsLeft < 600;

  return (
    <div className={`leave-timer ${isUrgent ? 'urgent' : ''}`}>
      <Timer size={16} />
      <span className="timer-label">Leave {eventName ? `"${eventName}"` : 'first event'} in</span>
      <span className="timer-display">{display}</span>
    </div>
  );
}
