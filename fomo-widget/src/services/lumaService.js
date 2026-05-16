import { MOCK_EVENTS } from '../utils/mockData.js';

// No API key needed — events are seeded mock data.
// Claude Code handles web-search-based event discovery inside the routing prompt.
export async function fetchLumaEvents() {
  return MOCK_EVENTS;
}
