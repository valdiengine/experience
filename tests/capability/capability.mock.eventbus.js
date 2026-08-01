/**
 * MockEventBus — recording wrapper (P13.5.7)
 *
 * Wraps the real (synchronous) event bus from shared/events/eventbus.js and
 * records every emitted event so suites can assert on event traffic without
 * interfering with the real dispatch (capability handlers still fire).
 */

export function createMockEventBus(realBus) {
  const recorded = []

  const wrapper = {
    real: realBus,
    recorded,
    on: (event, handler) => realBus.on(event, handler),
    off: (event, handler) => realBus.off(event, handler),
    once: (event, handler) => realBus.once(event, handler),
    clear: () => { recorded.length = 0; return realBus.clear() },
    emit: (event, data = {}) => {
      recorded.push({ event, data, timestamp: Date.now() })
      return realBus.emit(event, data)
    },
    events: () => recorded.slice(),
    has: (event) => recorded.some((r) => r.event === event),
    count: (event) => recorded.filter((r) => r.event === event).length,
    byEvent: () => {
      const grouped = {}
      for (const r of recorded) {
        if (!grouped[r.event]) grouped[r.event] = []
        grouped[r.event].push(r.data)
      }
      return grouped
    },
  }

  return wrapper
}

export default createMockEventBus
