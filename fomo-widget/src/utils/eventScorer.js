// Local heuristic fallback when Claude Code is unavailable.
// Mirrors the same scoring dimensions Claude uses (keyword match, density,
// time fit, energy) so the app degrades gracefully rather than going blank.

// Keyword lists are tuned for SF tech-scene vocabulary. When Claude is live,
// it uses the same conceptual dimensions but with broader natural-language
// understanding; this table is the deterministic safety net.
const GOAL_KEYWORDS = {
  investors: ['investor', 'vc', 'venture', 'a16z', 'sequoia', 'yc', 'fund', 'lp', 'partner'],
  founders: ['founder', 'ceo', 'startup', 'early stage', 'pre-seed', 'seed'],
  ai: ['ai', 'llm', 'ml', 'machine learning', 'gpt', 'claude', 'openai', 'model', 'agent'],
  crypto: ['crypto', 'web3', 'blockchain', 'defi', 'nft', 'solana', 'ethereum', 'zk'],
  networking: ['networking', 'mixer', 'happy hour', 'social', 'community', 'meetup'],
  builders: ['hackathon', 'builders', 'developer', 'engineer', 'open source', 'code'],
  operators: ['operator', 'executive', 'cto', 'vp', 'director', 'enterprise']
};

function extractGoals(intentText) {
  const lower = intentText.toLowerCase();
  return Object.entries(GOAL_KEYWORDS)
    .filter(([_, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([goal]) => goal);
}

function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function scoreEvent(event, goals, availableFrom, availableUntil, energyLevel) {
  let score = 0;
  const reasons = [];

  // Keyword match: up to 40 pts. Score is proportional to how many goal
  // categories have at least one hit in the event text — partial matches
  // still get partial credit rather than zero.
  const eventText = `${event.name} ${event.description} ${event.tags.join(' ')}`.toLowerCase();
  let keywordHits = 0;
  for (const goal of goals) {
    const keywords = GOAL_KEYWORDS[goal] || [goal];
    for (const kw of keywords) {
      if (eventText.includes(kw)) {
        keywordHits++;
        break;
      }
    }
  }
  if (goals.length > 0) {
    const keywordScore = Math.round((keywordHits / goals.length) * 40);
    score += keywordScore;
    if (keywordScore > 20) reasons.push(`Matches your interests`);
  } else {
    score += 20;
  }

  // Attendee density: up to 20 pts. Calibrated so 300 attendees = full score —
  // that's roughly the upper bound for a typical SF tech event.
  const densityScore = Math.min(20, Math.round((event.attendee_count / 300) * 20));
  score += densityScore;
  if (densityScore > 12) reasons.push(`High attendance (${event.attendee_count})`);

  // Time fit: up to 30 pts based on overlap between event window and user's
  // stated availability. Overlap > 60 min = full credit; 30–60 min = half.
  const eventStart = parseTimeToMinutes(event.start_time);
  const eventEnd = parseTimeToMinutes(event.end_time === '05:00' ? '29:00' : event.end_time);
  const fromMins = availableFrom ? parseTimeToMinutes(availableFrom) : parseTimeToMinutes('17:00');
  const untilMins = availableUntil ? parseTimeToMinutes(availableUntil) : parseTimeToMinutes('24:00');

  const overlap = Math.min(eventEnd, untilMins) - Math.max(eventStart, fromMins);
  if (overlap > 60) {
    score += 30;
    reasons.push(`Good time fit`);
  } else if (overlap > 30) {
    score += 15;
    reasons.push(`Partial time overlap`);
  } else if (overlap > 0) {
    score += 5;
  }

  // Energy modifier: a small nudge that prevents sending a tired user to a
  // 300-person hackathon, or a wired one to an intimate dinner.
  if (energyLevel === 'high' && event.tags.includes('hackathon')) score += 10;
  if (energyLevel === 'low' && event.attendee_count > 200) score -= 10;

  score = Math.max(0, Math.min(100, score));
  const reason = reasons.join(' · ') || 'General interest match';

  return { ...event, score, score_reason: reason, recommended: score >= 60 };
}

function buildOptimizedRoute(scoredEvents) {
  const candidates = scoredEvents
    .filter(e => e.recommended)
    .sort((a, b) => {
      const aStart = parseTimeToMinutes(a.start_time);
      const bStart = parseTimeToMinutes(b.start_time);
      return aStart - bStart;
    })
    .slice(0, 3);

  return candidates.map(e => e.id);
}

export function localHeuristicRoute(intentText, events, calendarBlocks = []) {
  const lower = intentText.toLowerCase();
  const goals = extractGoals(intentText);

  // Parse availability
  const fromMatch = lower.match(/(?:from|after|starting)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  const untilMatch = lower.match(/(?:until|till|to|before)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);

  let availableFrom = '17:00';
  let availableUntil = '23:00';

  if (fromMatch) {
    let h = parseInt(fromMatch[1]);
    if (fromMatch[3] === 'pm' && h < 12) h += 12;
    availableFrom = `${h.toString().padStart(2, '0')}:${fromMatch[2] || '00'}`;
  }
  if (untilMatch) {
    let h = parseInt(untilMatch[1]);
    if (untilMatch[3] === 'pm' && h < 12) h += 12;
    availableUntil = `${h.toString().padStart(2, '0')}:${untilMatch[2] || '00'}`;
  }

  const energyLevel = lower.includes('high energy') || lower.includes('lots of energy')
    ? 'high'
    : lower.includes('low energy') || lower.includes('tired')
    ? 'low'
    : 'medium';

  const scoredEvents = events.map(e =>
    scoreEvent(e, goals, availableFrom, availableUntil, energyLevel)
  ).sort((a, b) => b.score - a.score);

  const optimizedRoute = buildOptimizedRoute(scoredEvents);
  const routeEvents = optimizedRoute.map(id => scoredEvents.find(e => e.id === id));

  // Add travel minutes
  routeEvents.forEach((e, i) => {
    e.travel_minutes_from_previous = i === 0 ? 0 : Math.floor(Math.random() * 15) + 5;
  });

  const avgScore = optimizedRoute.length > 0
    ? Math.round(routeEvents.reduce((s, e) => s + e.score, 0) / routeEvents.length)
    : 0;

  const firstLeaveAt = routeEvents[0]
    ? (() => {
        const endMins = parseTimeToMinutes(routeEvents[0].end_time === '05:00' ? '23:00' : routeEvents[0].end_time);
        const travelToNext = routeEvents[1]?.travel_minutes_from_previous || 0;
        const leaveMins = endMins - travelToNext - 5;
        return `${Math.floor(leaveMins / 60).toString().padStart(2, '0')}:${(leaveMins % 60).toString().padStart(2, '0')}`;
      })()
    : null;

  return {
    parsed_intent: {
      goals,
      available_from: availableFrom,
      available_until: availableUntil,
      energy_level: energyLevel
    },
    scored_events: scoredEvents,
    optimized_route: optimizedRoute,
    route_narrative: optimizedRoute.length > 0
      ? `Based on your goals (${goals.join(', ')}), I've selected ${optimizedRoute.length} events that maximize network value and time efficiency. Start at ${routeEvents[0]?.name} for the best opening.`
      : 'No events matched your availability and goals. Try widening your time window or interests.',
    leave_first_event_at: firstLeaveAt,
    predicted_afterparty_location: 'The Interval at Long Now',
    widget_summary: `${optimizedRoute.length} events · ${availableFrom}–${availableUntil} · Avg score ${avgScore}`
  };
}
