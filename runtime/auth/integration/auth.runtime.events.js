export const AUTH_RUNTIME_EVENTS = {
  RUNTIME_AUTH_REGISTERED: 'auth:runtime_registered',
  RUNTIME_AUTH_INITIALIZED: 'auth:runtime_initialized',
  RUNTIME_AUTH_PROVIDER_CHANGED: 'auth:runtime_provider_changed',
  RUNTIME_AUTH_HEALTH_CHANGED: 'auth:runtime_health_changed',
  RUNTIME_AUTH_ERROR: 'auth:runtime_error',
  RUNTIME_AUTH_SHUTDOWN: 'auth:runtime_shutdown',
}

export function createAuthRuntimeEvent(event, payload = {}) {
  return {
    event,
    timestamp: Date.now(),
    source: 'auth-runtime-integration',
    payload,
  }
}

export default AUTH_RUNTIME_EVENTS
