import { createSchema } from '../core/schema.js'
import { AVAILABILITY_STATUS_LIST } from './availability.status.js'

export const AVAILABILITY_SCHEMA = createSchema({
  id: 'availability',
  name: 'Availability',
  description: 'Calendar availability for an accommodation',
  fields: {
    id: { type: 'string', required: false },
    tenantId: { type: 'string', required: true },
    accommodationId: { type: 'string', required: true },
    date: { type: 'string', required: true },
    status: { type: 'string', required: false, values: AVAILABILITY_STATUS_LIST },
    capacity: { type: 'number', required: false, min: 0 },
    available: { type: 'number', required: false, min: 0 },
    price: { type: 'number', required: false },
    currency: { type: 'string', required: false },
    notes: { type: 'string', required: false },
    metadata: { type: 'object', required: false },
    createdAt: { type: 'string', required: false },
    updatedAt: { type: 'string', required: false },
  },
})

export const AVAILABILITY_WINDOW_SCHEMA = createSchema({
  id: 'availability_window',
  name: 'AvailabilityWindow',
  description: 'A date range with availability state',
  fields: {
    id: { type: 'string', required: false },
    tenantId: { type: 'string', required: true },
    accommodationId: { type: 'string', required: true },
    startDate: { type: 'string', required: true },
    endDate: { type: 'string', required: true },
    status: { type: 'string', required: false, values: AVAILABILITY_STATUS_LIST },
    reason: { type: 'string', required: false },
    metadata: { type: 'object', required: false },
    createdAt: { type: 'string', required: false },
    updatedAt: { type: 'string', required: false },
  },
})

export const AVAILABILITY_RULE_SCHEMA = createSchema({
  id: 'availability_rule',
  name: 'AvailabilityRule',
  description: 'A booking rule applied to an accommodation',
  fields: {
    id: { type: 'string', required: false },
    tenantId: { type: 'string', required: true },
    accommodationId: { type: 'string', required: true },
    type: { type: 'string', required: true },
    value: { type: 'object', required: true },
    priority: { type: 'number', required: false },
    active: { type: 'boolean', required: false },
    metadata: { type: 'object', required: false },
    createdAt: { type: 'string', required: false },
    updatedAt: { type: 'string', required: false },
  },
})

export const AVAILABILITY_SEASON_SCHEMA = createSchema({
  id: 'availability_season',
  name: 'AvailabilitySeason',
  description: 'A seasonal period with specific rules',
  fields: {
    id: { type: 'string', required: false },
    tenantId: { type: 'string', required: true },
    accommodationId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    startDate: { type: 'string', required: true },
    endDate: { type: 'string', required: true },
    minStay: { type: 'number', required: false },
    maxStay: { type: 'number', required: false },
    priceMultiplier: { type: 'number', required: false },
    metadata: { type: 'object', required: false },
    createdAt: { type: 'string', required: false },
    updatedAt: { type: 'string', required: false },
  },
})

export const AVAILABILITY_BLOCK_SCHEMA = createSchema({
  id: 'availability_block',
  name: 'AvailabilityBlock',
  description: 'A manually blocked period',
  fields: {
    id: { type: 'string', required: false },
    tenantId: { type: 'string', required: true },
    accommodationId: { type: 'string', required: true },
    startDate: { type: 'string', required: true },
    endDate: { type: 'string', required: true },
    type: { type: 'string', required: true },
    reason: { type: 'string', required: false },
    metadata: { type: 'object', required: false },
    createdAt: { type: 'string', required: false },
    updatedAt: { type: 'string', required: false },
  },
})

export function validateAvailability(data) {
  return AVAILABILITY_SCHEMA.validate(data)
}

export function validateWindow(data) {
  return AVAILABILITY_WINDOW_SCHEMA.validate(data)
}

export function validateRule(data) {
  return AVAILABILITY_RULE_SCHEMA.validate(data)
}

export function validateSeason(data) {
  return AVAILABILITY_SEASON_SCHEMA.validate(data)
}

export function validateBlock(data) {
  return AVAILABILITY_BLOCK_SCHEMA.validate(data)
}
