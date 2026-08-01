export const ROLE_EVENTS = {
  ROLE_DEFINED: 'role:defined',
  ROLE_ASSIGNED: 'role:assigned',
  ROLE_REMOVED: 'role:removed',
  ROLE_INHERITANCE_CHANGED: 'role:inheritance_changed',
}

export function createRoleEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'role-manager', payload }
}

export default ROLE_EVENTS
