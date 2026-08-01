export const PERMISSION_EVENTS = {
  PERMISSION_GRANTED: 'permission:granted',
  PERMISSION_REVOKED: 'permission:revoked',
  PERMISSION_RESOLVED: 'permission:resolved',
  PERMISSION_DENIED: 'permission:denied',
}

export function createPermissionEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'permission-resolver', payload }
}

export default PERMISSION_EVENTS
