/**
 * SaaS Events — Product, Plan, Subscription, Feature, Limit, Upgrade
 */

export const SAAS_EVENTS = {
  PRODUCT_CREATED: 'saas:product_created',
  PRODUCT_UPDATED: 'saas:product_updated',
  PRODUCT_DELETED: 'saas:product_deleted',

  PLAN_CREATED: 'saas:plan_created',
  PLAN_UPDATED: 'saas:plan_updated',
  PLAN_ASSIGNED: 'saas:plan_assigned',
  PLAN_CHANGED: 'saas:plan_changed',

  SUBSCRIPTION_CREATED: 'saas:subscription_created',
  SUBSCRIPTION_ACTIVATED: 'saas:subscription_activated',
  SUBSCRIPTION_SUSPENDED: 'saas:subscription_suspended',
  SUBSCRIPTION_CANCELLED: 'saas:subscription_cancelled',
  SUBSCRIPTION_EXPIRED: 'saas:subscription_expired',
  SUBSCRIPTION_RENEWED: 'saas:subscription_renewed',

  FEATURE_ENABLED: 'saas:feature_enabled',
  FEATURE_DISABLED: 'saas:feature_disabled',
  FEATURE_CHANGED: 'saas:feature_changed',

  LIMIT_REACHED: 'saas:limit_reached',
  LIMIT_WARNING: 'saas:limit_warning',
  LIMIT_RESET: 'saas:limit_reset',

  UPGRADE_RECOMMENDED: 'saas:upgrade_recommended',
  UPGRADE_COMPLETED: 'saas:upgrade_completed',

  ENTITLEMENT_CHANGED: 'saas:entitlement_changed',
}
