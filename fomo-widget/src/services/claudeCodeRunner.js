import { localHeuristicRoute } from '../utils/eventScorer.js';

// Strip fields Claude doesn't need for routing. lat/lng, descriptions, and
// luma_url are UI concerns — sending them wastes ~40% of prompt space.
function slimEvent(e) {
  return { id: e.id, name: e.name, tags: e.tags, start_time: e.start_time, end_time: e.end_time, location: e.location, attendee_count: e.attendee_count };
}

// The JSON schema in the prompt is load-bearing: Claude is constrained to
// this exact shape so JSON.parse has a guaranteed structure to work against.
// Any new UI field must be added to the schema here first — Claude won't
// invent fields it wasn't asked to produce.
function buildRoutingPrompt(intentText, events, calendarBlocks, weather) {
  return `FOMO-WIDGET event router. Return ONLY valid JSON, no markdown, no explanation.

INTENT: ${intentText}
WEATHER: ${weather}
EVENTS: ${JSON.stringify(events.slice(0, 10).map(slimEvent))}

JSON schema (respond with this exact structure):
{"parsed_intent":{"goals":[],"available_from":"HH:MM","available_until":"HH:MM","energy_level":"low|medium|high"},"scored_events":[{"id":"","name":"","score":0,"score_reason":"","location":"","start_time":"","end_time":"","travel_minutes_from_previous":0,"recommended":true}],"optimized_route":["id1","id2"],"route_narrative":"2-3 sentences","leave_first_event_at":"HH:MM","predicted_afterparty_location":"venue name","widget_summary":"one line"}`;
}

export async function routeEvents(intentText, events, calendarBlocks, weather) {
  const prompt = buildRoutingPrompt(intentText, events, calendarBlocks, weather);

  // contextBridge exposes electronAPI in the renderer; its absence means we're
  // running in a browser dev environment or a unit-test harness.
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.runClaude;

  if (!isElectron) {
    console.warn('Not in Electron — using local heuristic');
    return localHeuristicRoute(intentText, events, calendarBlocks);
  }

  try {
    const raw = await window.electronAPI.runClaude(prompt);
    // Claude occasionally wraps output in ```json fences despite the prompt
    // saying not to. Strip defensively rather than trying to prompt-engineer
    // this away — it's not worth the prompt complexity.
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Claude output');
    const result = JSON.parse(jsonMatch[0]);

    // Claude received slim event shapes (no lat/lng, no descriptions). Re-merge
    // the full event objects so the map and UI have coordinates and display data.
    // Spread order: full data first, Claude's scored fields overwrite on conflict.
    if (result.scored_events) {
      result.scored_events = result.scored_events.map(se => {
        const full = events.find(e => e.id === se.id);
        return full ? { ...full, ...se } : se;
      });
    }

    return result;
  } catch (err) {
    // Claude not installed, timed out, or returned unparseable output — fall
    // back silently so the app stays functional without a Claude CLI install.
    console.warn('Claude Code unavailable, falling back to local scorer:', err.message);
    return localHeuristicRoute(intentText, events, calendarBlocks);
  }
}
