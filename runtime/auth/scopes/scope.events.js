export const SCOPE_EVENTS = {
  SCOPE_DEFINED: 'scope:defined',
  SCOPE_VALIDATED: 'scope:validated',
  SCOPE_EVALUATED: 'scope:evaluated',
}

export function createScopeEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'scope-manager', payload }
}

export default SCOPE_EVENTS
