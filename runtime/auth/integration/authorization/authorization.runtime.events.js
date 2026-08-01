export const AUTHORIZATION_RUNTIME_EVENTS = {
  RUNTIME_AUTHORIZATION_REGISTERED: 'authorization:runtime_registered',
  RUNTIME_AUTHORIZATION_INITIALIZED: 'authorization:runtime_initialized',
  RUNTIME_AUTHORIZATION_STARTED: 'authorization:runtime_started',
  RUNTIME_AUTHORIZATION_READY: 'authorization:runtime_ready',
  RUNTIME_AUTHORIZATION_DECISION_REQUESTED: 'authorization:decision_requested',
  RUNTIME_AUTHORIZATION_DECISION_COMPLETED: 'authorization:decision_completed',
  RUNTIME_AUTHORIZATION_ERROR: 'authorization:runtime_error',
  RUNTIME_AUTHORIZATION_SHUTDOWN: 'authorization:runtime_shutdown',
}

export function createAuthorizationRuntimeEvent(event, payload = {}) {
  return {
    event,
    timestamp: Date.now(),
    source: 'authorization-runtime-integration',
    payload,
  }
}

export default AUTHORIZATION_RUNTIME_EVENTS
