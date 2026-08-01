/**
 * Onboarding Schema — Business profile definitions
 *
 * Business-agnostic: generic business profile, no business logic
 */
import { createSchema } from '../core/schema.js'
import { BUSINESS_TYPES } from './business.types.js'
import { PLAN_TYPES } from './plans.js'
import { BUSINESS_STATUS } from './onboarding.events.js'

export const BUSINESS_PROFILE_SCHEMA = createSchema({
  id: 'business_profile',
  name: 'Business Profile',
  description: 'A registered business on the platform',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    ownerId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    type: { type: 'string', required: true, values: Object.values(BUSINESS_TYPES) },
    category: { type: 'string', required: false },
    contact: { type: 'object', required: true },
    location: { type: 'object', required: false },
    plan: { type: 'string', required: true, values: Object.values(PLAN_TYPES) },
    capabilities: { type: 'array', required: false },
    createdAt: { type: 'string', required: true },
    status: { type: 'string', required: true, values: Object.values(BUSINESS_STATUS) },
  },
})

export const TENANT_CONFIG_SCHEMA = createSchema({
  id: 'tenant_config',
  name: 'Tenant Configuration',
  description: 'Configuration for a tenant',
  fields: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    type: { type: 'string', required: true },
    plan: { type: 'string', required: true },
    capabilities: { type: 'array', required: true },
    config: { type: 'object', required: false },
    createdAt: { type: 'string', required: true },
    status: { type: 'string', required: true },
  },
})

export function validateBusinessProfile(data) {
  return BUSINESS_PROFILE_SCHEMA.validate(data)
}

export function validateTenantConfig(data) {
  return TENANT_CONFIG_SCHEMA.validate(data)
}
