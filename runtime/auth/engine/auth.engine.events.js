export const AUTH_ENGINE_EVENTS = {
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_AUTHENTICATED: 'auth:authenticated',
  AUTH_UNAUTHORIZED: 'auth:unauthorized',
  AUTH_PERMISSION_GRANTED: 'auth:permission_granted',
  AUTH_PERMISSION_REVOKED: 'auth:permission_revoked',
  AUTH_ROLE_ASSIGNED: 'auth:role_assigned',
  AUTH_ROLE_REMOVED: 'auth:role_removed',
  AUTH_SESSION_STARTED: 'auth:session_started',
  AUTH_SESSION_RESTORED: 'auth:session_restored',
  AUTH_SESSION_EXPIRED: 'auth:session_expired',
  AUTH_SESSION_REVOKED: 'auth:session_revoked',
  AUTH_TRUST_CHANGED: 'auth:trust_changed',
  AUTH_MFA_ENABLED: 'auth:mfa_enabled',
  AUTH_MFA_DISABLED: 'auth:mfa_disabled',
  AUTH_ANONYMOUS_CREATED: 'auth:anonymous_created',
  AUTH_ANONYMOUS_UPGRADED: 'auth:anonymous_upgraded',
  AUTH_ERROR: 'auth:error',
}

export function createAuthEngineEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'auth-engine', payload }
}

export default AUTH_ENGINE_EVENTS
