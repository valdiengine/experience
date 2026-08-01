export const AUTHORIZATION_EVENTS = {
  AUTHORIZATION_ALLOWED: 'authorization:allowed',
  AUTHORIZATION_DENIED: 'authorization:denied',
  POLICY_REGISTERED: 'authorization:policy_registered',
  ROLE_ASSIGNED: 'authorization:role_assigned',
  ROLE_REMOVED: 'authorization:role_removed',
  PERMISSION_GRANTED: 'authorization:permission_granted',
  PERMISSION_REVOKED: 'authorization:permission_revoked',
  SCOPE_EVALUATED: 'authorization:scope_evaluated',
  POLICY_CACHE_HIT: 'authorization:policy_cache_hit',
  POLICY_CACHE_MISS: 'authorization:policy_cache_miss',
}

export function createAuthorizationEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'authorization-engine', payload }
}

export default AUTHORIZATION_EVENTS
