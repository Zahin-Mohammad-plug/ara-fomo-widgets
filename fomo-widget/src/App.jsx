import { useState, useEffect, useCallback } from 'react';
import { VoiceInputBox } from './components/VoiceInputBox.jsx';
import { RouteMap } from './components/RouteMap.jsx';
import { LiveWidget } from './components/LiveWidget.jsx';
import { routeEvents } from './services/claudeCodeRunner.js';
import { fetchLumaEvents } from './services/lumaService.js';
import { getCalendarBlocks, addEventsToCalendar } from './services/calendarService.js';
import { getWeather } from './services/weatherService.js';

export default function App() {
  const [events, setEvents] = useState([]);
  const [weather, setWeather] = useState('Loading...');
  const [routeData, setRouteData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [excludedIds, setExcludedIds] = useState([]);
  const [calendarStatus, setCalendarStatus] = useState(null);

  useEffect(() => {
    fetchLumaEvents().then(setEvents).catch(console.error);
    getWeather().then(setWeather).catch(() => setWeather('62°F, Partly Cloudy'));
  }, []);

  const handleSubmit = useCallback(async (intentText, energyLevel) => {
    setIsLoading(true);
    setError(null);
    setExcludedIds([]);

    try {
      const [calendarBlocks] = await Promise.all([getCalendarBlocks()]);
      const filteredEvents = events.filter(e => !excludedIds.includes(e.id));
      const intentWithEnergy = `${intentText} [energy: ${energyLevel}]`;

      const result = await routeEvents(intentWithEnergy, filteredEvents, calendarBlocks, weather);
      setRouteData(result);

      // Write route.json for Übersicht widget
      if (window.electronAPI?.writeRoute) {
        await window.electronAPI.writeRoute(result).catch(console.warn);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [events, weather, excludedIds]);

  const handleExclude = useCallback(async (eventId) => {
    setExcludedIds(prev => [...prev, eventId]);
    if (!routeData) return;
    setIsLoading(true);
    try {
      const calendarBlocks = await getCalendarBlocks();
      const filteredEvents = events.filter(e => !excludedIds.includes(e.id) && e.id !== eventId);
      const result = await routeEvents(
        `Re-route excluding event ${eventId}`,
        filteredEvents,
        calendarBlocks,
        weather
      );
      setRouteData(result);
    } catch (err) {
      console.warn('Re-route failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [events, weather, excludedIds, routeData]);

  const handleAddToCalendar = useCallback(async () => {
    if (!routeData?.optimized_route?.length) return;
    const routeEvents_ = routeData.optimized_route
      .map(id => routeData.scored_events?.find(e => e.id === id))
      .filter(Boolean);
    const result = await addEventsToCalendar(routeEvents_);
    setCalendarStatus(result.message);
    setTimeout(() => setCalendarStatus(null), 4000);
  }, [routeData]);

  const handleShare = useCallback(() => {
    if (!routeData) return;
    const { optimized_route, scored_events, widget_summary, predicted_afterparty_location } = routeData;
    const names = (optimized_route || [])
      .map(id => scored_events?.find(e => e.id === id)?.name)
      .filter(Boolean);
    const tweet = `Tonight's SF tech route (via FOMO-WIDGET 🗺️):\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}\nAfterparty: ${predicted_afterparty_location || '?'}\n\n${widget_summary || ''}\n\nPowered by Claude Code (local, no API key)`;
    navigator.clipboard?.writeText(tweet).then(() => {
      setCalendarStatus('Route copied to clipboard!');
      setTimeout(() => setCalendarStatus(null), 3000);
    });
  }, [routeData]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">◉</span>
          <span className="logo-text">FOMO-WIDGET</span>
          <span className="logo-sub">by Ara</span>
        </div>
        <div className="weather-badge">
          <span>SF · {weather}</span>
        </div>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <VoiceInputBox onSubmit={handleSubmit} isLoading={isLoading} />

          {error && (
            <div className="error-banner">
              <strong>Error:</strong> {error}
            </div>
          )}

          {calendarStatus && (
            <div className="status-banner">{calendarStatus}</div>
          )}

          <LiveWidget
            routeData={routeData}
            onExclude={handleExclude}
            onAddToCalendar={handleAddToCalendar}
            onShare={handleShare}
          />
        </div>

        <div className="right-panel">
          <RouteMap routeData={routeData} allEvents={events} />
        </div>
      </main>
    </div>
  );
}
