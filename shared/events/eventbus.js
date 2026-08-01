export function createEventBus() {
  const listeners = new Map()

  const on = (event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event).add(handler)
    return () => listeners.get(event)?.delete(handler)
  }

  const off = (event, handler) => listeners.get(event)?.delete(handler)

  const emit = (event, data) => {
    listeners.get(event)?.forEach(h => {
      try { h(data) } catch (e) { console.error(`[EventBus:${event}]`, e) }
    })
  }

  const once = (event, handler) => {
    const unsub = on(event, (data) => { unsub(); handler(data) })
    return unsub
  }

  const clear = () => listeners.clear()

  return { on, off, emit, once, clear }
}
