export const POLICY_EVENTS = {
  POLICY_REGISTERED: 'policy:registered',
  POLICY_UNREGISTERED: 'policy:unregistered',
  POLICY_EVALUATED: 'policy:evaluated',
  POLICY_EVALUATION_SKIPPED: 'policy:evaluation_skipped',
  POLICY_COMPILED: 'policy:compiled',
  POLICY_COMPILE_ERROR: 'policy:compile_error',
}

export function createPolicyEvent(event, payload = {}) {
  return {
    event,
    timestamp: Date.now(),
    source: 'policy-engine',
    payload,
  }
}

export default POLICY_EVENTS
