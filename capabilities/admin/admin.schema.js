/**
 * Admin Schema — Business-agnostic admin data definitions
 *
 * Defines schemas for users, roles, permissions, plans, tenants
 */
import { createSchema } from '../core/schema.js'

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_OWNER: 'tenant_owner',
  MANAGER: 'manager',
  STAFF: 'staff',
  CUSTOMER_SUPPORT: 'customer_support',
}

export const ADMIN_PERMISSIONS = {
  TENANT_READ: 'tenant.read',
  TENANT_WRITE: 'tenant.write',
  RESERVATION_READ: 'reservation.read',
  RESERVATION_WRITE: 'reservation.write',
  AVAILABILITY_WRITE: 'availability.write',
  CONTENT_WRITE: 'content.write',
  ANALYTICS_READ: 'analytics.read',
  USER_READ: 'user.read',
  USER_WRITE: 'user.write',
  PLAN_READ: 'plan.read',
  PLAN_WRITE: 'plan.write',
  PWA_READ: 'pwa.read',
  PWA_WRITE: 'pwa.write',
  SEO_READ: 'seo.read',
  SEO_WRITE: 'seo.write',
  SYSTEM_READ: 'system.read',
  SYSTEM_WRITE: 'system.write',
}

export const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(ADMIN_PERMISSIONS),
  [ADMIN_ROLES.TENANT_OWNER]: [
    ADMIN_PERMISSIONS.TENANT_READ,
    ADMIN_PERMISSIONS.TENANT_WRITE,
    ADMIN_PERMISSIONS.RESERVATION_READ,
    ADMIN_PERMISSIONS.RESERVATION_WRITE,
    ADMIN_PERMISSIONS.AVAILABILITY_WRITE,
    ADMIN_PERMISSIONS.CONTENT_WRITE,
    ADMIN_PERMISSIONS.ANALYTICS_READ,
    ADMIN_PERMISSIONS.USER_READ,
    ADMIN_PERMISSIONS.PWA_READ,
    ADMIN_PERMISSIONS.PWA_WRITE,
    ADMIN_PERMISSIONS.SEO_READ,
    ADMIN_PERMISSIONS.SEO_WRITE,
  ],
  [ADMIN_ROLES.MANAGER]: [
    ADMIN_PERMISSIONS.TENANT_READ,
    ADMIN_PERMISSIONS.RESERVATION_READ,
    ADMIN_PERMISSIONS.RESERVATION_WRITE,
    ADMIN_PERMISSIONS.AVAILABILITY_WRITE,
    ADMIN_PERMISSIONS.CONTENT_WRITE,
    ADMIN_PERMISSIONS.ANALYTICS_READ,
  ],
  [ADMIN_ROLES.STAFF]: [
    ADMIN_PERMISSIONS.TENANT_READ,
    ADMIN_PERMISSIONS.RESERVATION_READ,
    ADMIN_PERMISSIONS.RESERVATION_WRITE,
  ],
  [ADMIN_ROLES.CUSTOMER_SUPPORT]: [
    ADMIN_PERMISSIONS.TENANT_READ,
    ADMIN_PERMISSIONS.RESERVATION_READ,
  ],
}

export const SAAS_PLANS = {
  FREE: 'free',
  BUSINESS: 'business',
  SAAS: 'saas',
}

export const PLAN_LIMITS = {
  [SAAS_PLANS.FREE]: {
    maxReservations: 50,
    maxPages: 5,
    maxUsers: 1,
    capabilities: ['cms', 'pwa'],
  },
  [SAAS_PLANS.BUSINESS]: {
    maxReservations: 500,
    maxPages: 25,
    maxUsers: 5,
    capabilities: ['cms', 'pwa', 'reservation', 'availability', 'communication', 'notifications'],
  },
  [SAAS_PLANS.SAAS]: {
    maxReservations: -1,
    maxPages: -1,
    maxUsers: -1,
    capabilities: ['cms', 'pwa', 'reservation', 'availability', 'communication', 'notifications', 'intelligence', 'seo-intelligence', 'pwa-engine', 'engagement', 'conversion'],
  },
}

export const ADMIN_USER_SCHEMA = createSchema({
  id: 'admin_user',
  name: 'Admin User',
  description: 'A user in the admin platform',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    email: { type: 'string', required: true },
    name: { type: 'string', required: true },
    role: { type: 'string', required: true, values: Object.values(ADMIN_ROLES) },
    permissions: { type: 'array', required: true },
    createdAt: { type: 'string', required: true },
    lastLogin: { type: 'string', required: false },
    active: { type: 'boolean', required: true },
  },
})

export const ADMIN_TENANT_SCHEMA = createSchema({
  id: 'admin_tenant',
  name: 'Admin Tenant',
  description: 'Tenant administration configuration',
  fields: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    slug: { type: 'string', required: true },
    plan: { type: 'string', required: true, values: Object.values(SAAS_PLANS) },
    capabilities: { type: 'array', required: true },
    status: { type: 'string', required: true, values: ['active', 'suspended', 'trial'] },
    createdAt: { type: 'string', required: true },
  },
})

export function validateAdminUser(data) {
  return ADMIN_USER_SCHEMA.validate(data)
}

export function validateAdminTenant(data) {
  return ADMIN_TENANT_SCHEMA.validate(data)
}
