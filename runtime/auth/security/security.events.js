export const SECURITY_EVENTS = {
  RATE_LIMIT_EXCEEDED: 'security:rate_limit_exceeded',
  RATE_LIMIT_RESET: 'security:rate_limit_reset',
  BRUTE_FORCE_DETECTED: 'security:brute_force_detected',
  BRUTE_FORCE_LOCKOUT: 'security:brute_force_lockout',
  BRUTE_FORCE_RESET: 'security:brute_force_reset',
  SUSPICIOUS_ACTIVITY: 'security:suspicious_activity',
  SECURITY_ERROR: 'security:error',
}

export function createSecurityEvent(event, payload = {}) {
  return {
    event,
    timestamp: Date.now(),
    source: 'auth-security',
    payload,
  }
}

export default SECURITY_EVENTS
