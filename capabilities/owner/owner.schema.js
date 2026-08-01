/**
 * Owner Schema — Business-agnostic owner management data
 *
 * Defines data structures for owner profile, conversation, and dashboard
 * All fields are generic — no business-specific concepts
 */
import { createSchema } from '../core/schema.js'

export const OWNER_PROFILE_SCHEMA = createSchema({
  id: 'owner_profile',
  name: 'Owner Profile',
  description: 'Business owner profile information',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    email: { type: 'string', required: false },
    phone: { type: 'string', required: false },
    avatarUrl: { type: 'string', required: false },
    role: { type: 'string', required: true, values: ['owner', 'admin', 'staff'] },
    createdAt: { type: 'string', required: true },
    lastLoginAt: { type: 'string', required: false },
  },
})

export const OWNER_CONVERSATION_SCHEMA = createSchema({
  id: 'owner_conversation',
  name: 'Owner Conversation',
  description: 'Conversation between owner and customer',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    customerId: { type: 'string', required: true },
    customerName: { type: 'string', required: true },
    channel: { type: 'string', required: true },
    lastMessage: { type: 'string', required: false },
    lastMessageAt: { type: 'string', required: false },
    unreadCount: { type: 'number', required: false },
    status: { type: 'string', required: true, values: ['active', 'archived'] },
    createdAt: { type: 'string', required: true },
  },
})

export const OWNER_DASHBOARD_SCHEMA = createSchema({
  id: 'owner_dashboard',
  name: 'Owner Dashboard',
  description: 'Dashboard configuration and layout',
  fields: {
    tenantId: { type: 'string', required: true },
    widgets: { type: 'array', required: false, items: { type: 'object' } },
    layout: { type: 'string', required: false },
    theme: { type: 'string', required: false },
    updatedAt: { type: 'string', required: false },
  },
})

export const AVAILABILITY_BLOCK_SCHEMA = createSchema({
  id: 'availability_block',
  name: 'Availability Block',
  description: 'A date block or availability entry',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    date: { type: 'string', required: true },
    status: { type: 'string', required: true, values: ['available', 'blocked', 'occupied'] },
    resourceId: { type: 'string', required: false },
    notes: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export function validateOwnerProfile(data) {
  return OWNER_PROFILE_SCHEMA.validate(data)
}

export function validateOwnerConversation(data) {
  return OWNER_CONVERSATION_SCHEMA.validate(data)
}

export function validateAvailabilityBlock(data) {
  return AVAILABILITY_BLOCK_SCHEMA.validate(data)
}
