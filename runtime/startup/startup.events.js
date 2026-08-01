export const STARTUP_EVENTS = {
  STARTED: 'startup:started',
  RUNTIME_READY: 'startup:runtime_ready',
  REPOSITORIES_READY: 'startup:repositories_ready',
  CAPABILITIES_READY: 'startup:capabilities_ready',
  CONTEXTS_READY: 'startup:contexts_ready',
  HEALTH_READY: 'startup:health_ready',
  COMPLETED: 'startup:completed',
  FAILED: 'startup:failed',
}

export function createStartupEvent(event, payload = {}) {
  return {
    event,
    timestamp: Date.now(),
    source: 'application-start',
    payload,
  }
}

export default STARTUP_EVENTS
