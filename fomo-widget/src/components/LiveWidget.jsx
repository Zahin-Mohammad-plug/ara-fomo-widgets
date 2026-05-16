import { Cloud, Sparkles, Share2, CalendarPlus } from 'lucide-react';
import { EventCard } from './EventCard.jsx';
import { LeaveNowTimer } from './LeaveNowTimer.jsx';

export function LiveWidget({ routeData, onExclude, onAddToCalendar, onShare }) {
  if (!routeData) return null;

  const { scored_events, optimized_route, route_narrative, leave_first_event_at,
    predicted_afterparty_location, widget_summary, parsed_intent } = routeData;

  const routeEvents = (optimized_route || [])
    .map(id => scored_events?.find(e => e.id === id))
    .filter(Boolean);

  const firstEvent = routeEvents[0];

  return (
    <div className="live-widget">
      {widget_summary && (
        <div className="widget-summary-bar">
          <Cloud size={14} />
          <span>{widget_summary}</span>
        </div>
      )}

      {leave_first_event_at && firstEvent && (
        <LeaveNowTimer leaveAt={leave_first_event_at} eventName={firstEvent.name} />
      )}

      {route_narrative && (
        <div className="route-narrative">
          <Sparkles size={14} />
          <p>{route_narrative}</p>
        </div>
      )}

      <div className="route-events">
        <h3 className="section-label">Tonight's Route</h3>
        {routeEvents.length === 0 ? (
          <p className="empty-state">No events matched your goals. Try different parameters.</p>
        ) : (
          routeEvents.map((event, i) => (
            <EventCard
              key={event.id}
              event={event}
              rank={i + 1}
              onExclude={onExclude}
            />
          ))
        )}
      </div>

      {predicted_afterparty_location && (
        <div className="afterparty-card">
          <span className="afterparty-icon">🔮</span>
          <div>
            <div className="afterparty-label">Predicted Afterparty</div>
            <div className="afterparty-venue">{predicted_afterparty_location}</div>
          </div>
        </div>
      )}

      <div className="widget-actions">
        <button className="action-btn calendar-btn" onClick={onAddToCalendar}>
          <CalendarPlus size={15} /> Add to Calendar
        </button>
        <button className="action-btn share-btn" onClick={onShare}>
          <Share2 size={15} /> Share Route
        </button>
      </div>
    </div>
  );
}
