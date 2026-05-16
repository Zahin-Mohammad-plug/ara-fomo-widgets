// Calendar service — stubbed. Returns empty array.
// Phase 5: wire Google Calendar via gapi OAuth or Calendar MCP.

export async function getCalendarBlocks() {
  console.info('calendarService: stubbed, returning []');
  return [];
}

export async function addEventsToCalendar(routeEvents) {
  // Phase 5: implement Google Calendar write
  console.info('calendarService: addEventsToCalendar called with', routeEvents.length, 'events');
  return { success: true, message: 'Calendar sync stubbed — wire gapi in Phase 5' };
}
