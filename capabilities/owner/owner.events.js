/**
 * Owner Events — Event definitions for owner portal
 */
export const OWNER_EVENTS = {
  // Dashboard
  DASHBOARD_LOADED: 'owner:dashboard_loaded',
  DASHBOARD_UPDATED: 'owner:dashboard_updated',

  // Reservations
  RESERVATION_VIEWED: 'owner:reservation_viewed',
  RESERVATION_CONFIRMED: 'owner:reservation_confirmed',
  RESERVATION_REJECTED: 'owner:reservation_rejected',
  RESERVATION_CANCELLED: 'owner:reservation_cancelled',

  // Availability
  AVAILABILITY_UPDATED: 'owner:availability_updated',
  AVAILABILITY_BLOCKED: 'owner:availability_blocked',
  AVAILABILITY_OPENED: 'owner:availability_opened',

  // Customers
  CUSTOMER_VIEWED: 'owner:customer_viewed',
  CUSTOMER_NOTED: 'owner:customer_noted',

  // Communication
  MESSAGE_SENT: 'owner:message_sent',
  CONVERSATION_OPENED: 'owner:conversation_opened',

  // Metrics
  METRICS_LOADED: 'owner:metrics_loaded',

  // Owner
  OWNER_LOGGED_IN: 'owner:logged_in',
  OWNER_PROFILE_LOADED: 'owner:profile_loaded',
}

export const OWNER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
}
