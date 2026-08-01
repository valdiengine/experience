/**
 * Capability Events — Standard event definitions
 *
 * All capabilities use these events for communication.
 * Pattern: {domain}:{action}
 */
export const CAPABILITY_EVENTS = {
  // Capability lifecycle
  REGISTERED: 'capability:registered',
  ACTIVATED: 'capability:activated',
  DEACTIVATED: 'capability:deactivated',
  ERROR: 'capability:error',
  STATE_CHANGED: 'capability:state_changed',

  // Dependency events
  DEPENDENCY_MISSING: 'capability:dependency_missing',
  DEPENDENCY_READY: 'capability:dependency_ready',
  ACTIVATION_BLOCKED: 'capability:activation_blocked',

  // Booking events (business-agnostic)
  BOOKING_CREATED: 'booking:created',
  BOOKING_UPDATED: 'booking:updated',
  BOOKING_CANCELLED: 'booking:cancelled',
  BOOKING_CONFIRMED: 'booking:confirmed',
  BOOKING_COMPLETED: 'booking:completed',

  // Notification events
  NOTIFICATION_SENT: 'notification:sent',
  NOTIFICATION_FAILED: 'notification:failed',
  NOTIFICATION_QUEUED: 'notification:queued',

  // PWA events
  PWA_INSTALL_PROMPT: 'pwa:install_prompt',
  PWA_INSTALLED: 'pwa:installed',
  PWA_UPDATE_AVAILABLE: 'pwa:update_available',

  // Data events (from DataManager)
  DATA_LOADED: 'data.loaded',
  DATA_CHANGED: 'data.changed',
  PROVIDER_ERROR: 'provider.error',
}

/**
 * Create event data wrapper
 * @param {string} source - Source capability ID
 * @param {string} type - Event type
 * @param {object} payload - Event payload
 * @returns {object}
 */
export function createCapabilityEvent(source, type, payload = {}) {
  return {
    source,
    type,
    payload,
    timestamp: Date.now(),
  }
}
