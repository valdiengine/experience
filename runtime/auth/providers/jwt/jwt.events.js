export const JWT_EVENTS = {
  JWT_LOGIN: 'jwt:login',
  JWT_LOGOUT: 'jwt:logout',
  JWT_REFRESH: 'jwt:refresh',
  JWT_REVOKED: 'jwt:revoked',
  JWT_SESSION_CREATED: 'jwt:session_created',
  JWT_SESSION_RESTORED: 'jwt:session_restored',
  JWT_SESSION_EXPIRED: 'jwt:session_expired',
  JWT_DEVICE_TRUSTED: 'jwt:device_trusted',
  JWT_DEVICE_REVOKED: 'jwt:device_revoked',
  JWT_TOKEN_ROTATED: 'jwt:token_rotated',
  JWT_TOKEN_REUSED: 'jwt:token_reused',
  JWT_AUTH_FAILURE: 'jwt:auth_failure',
}

export function createJwtEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'jwt-provider', payload }
}

export default JWT_EVENTS
