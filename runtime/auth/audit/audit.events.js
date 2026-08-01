export const AUDIT_EVENTS = {
  AUDIT_RECORDED: 'audit:recorded',
  AUDIT_EXPORTED: 'audit:exported',
  AUDIT_PURGED: 'audit:purged',
}

export function createAuditEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'authorization-audit', payload }
}

export default AUDIT_EVENTS
