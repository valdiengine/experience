/**
 * Admin Events — Event definitions for admin platform
 */
export const ADMIN_EVENTS = {
  // Users
  USER_CREATED: 'admin:user_created',
  USER_UPDATED: 'admin:user_updated',
  USER_DELETED: 'admin:user_deleted',
  USER_LOGIN: 'admin:user_login',
  USER_LOGOUT: 'admin:user_logout',

  // Tenants
  TENANT_CREATED: 'admin:tenant_created',
  TENANT_UPDATED: 'admin:tenant_updated',
  TENANT_SUSPENDED: 'admin:tenant_suspended',
  TENANT_ACTIVATED: 'admin:tenant_activated',

  // Plans
  PLAN_CHANGED: 'admin:plan_changed',
  PLAN_UPGRADED: 'admin:plan_upgraded',
  PLAN_DOWNGRADED: 'admin:plan_downgraded',

  // Capabilities
  CAPABILITY_ENABLED: 'admin:capability_enabled',
  CAPABILITY_DISABLED: 'admin:capability_disabled',

  // Reservations
  RESERVATION_CONFIRMED: 'admin:reservation_confirmed',
  RESERVATION_REJECTED: 'admin:reservation_rejected',
  RESERVATION_CANCELLED: 'admin:reservation_cancelled',

  // Content
  CONTENT_PUBLISHED: 'admin:content_published',
  CONTENT_UPDATED: 'admin:content_updated',

  // Analytics
  ANALYTICS_VIEWED: 'admin:analytics_viewed',
}
