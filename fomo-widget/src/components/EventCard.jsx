import { MapPin, Clock, Navigation, X } from 'lucide-react';

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171';
  return (
    <span className="score-badge" style={{ color, borderColor: color }}>
      {score}/100
    </span>
  );
}

export function EventCard({ event, rank, onExclude }) {
  const travelText = event.travel_minutes_from_previous > 0
    ? `${event.travel_minutes_from_previous} min`
    : 'Starting point';

  return (
    <div className="event-card">
      <div className="event-card-header">
        <div className="event-rank">{rank}</div>
        <div className="event-info">
          <div className="event-name-row">
            <h3 className="event-name">{event.name}</h3>
            <ScoreBadge score={event.score ?? 0} />
          </div>
          <div className="event-meta">
            <span><Clock size={12} /> {event.start_time}–{event.end_time}</span>
            <span><MapPin size={12} /> {event.location}</span>
            <span><Navigation size={12} /> {travelText}</span>
          </div>
        </div>
        {onExclude && (
          <button
            className="exclude-btn"
            onClick={() => onExclude(event.id)}
            title="Remove from route"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {event.score_reason && (
        <p className="event-reason">{event.score_reason}</p>
      )}
    </div>
  );
}
