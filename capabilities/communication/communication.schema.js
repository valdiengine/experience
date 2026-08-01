/**
 * Communication Capability — Schemas
 *
 * Business-agnostic: messages, channels, conversations
 */
import { createSchema } from '../core/schema.js'

export const COMMUNICATION_CHANNELS = {
  WHATSAPP: 'whatsapp',
  CHAT: 'chat',
  EMAIL: 'email',
  PUSH: 'push',
}

export const MESSAGE_STATUS = {
  DRAFT: 'draft',
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
}

export const MESSAGE_SCHEMA = createSchema({
  id: 'communication_message',
  name: 'Communication Message',
  description: 'A message sent via any channel',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    channel: { type: 'string', required: true, values: Object.values(COMMUNICATION_CHANNELS) },
    recipient: { type: 'string', required: true },
    sender: { type: 'string', required: false },
    subject: { type: 'string', required: false },
    body: { type: 'string', required: true },
    metadata: { type: 'object', required: false },
    status: { type: 'string', required: true, values: Object.values(MESSAGE_STATUS) },
    createdAt: { type: 'string', required: true },
    sentAt: { type: 'string', required: false },
    readAt: { type: 'string', required: false },
  },
})

export const CONVERSATION_SCHEMA = createSchema({
  id: 'communication_conversation',
  name: 'Communication Conversation',
  description: 'A conversation thread with a recipient',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    channel: { type: 'string', required: true, values: Object.values(COMMUNICATION_CHANNELS) },
    recipient: { type: 'string', required: true },
    messages: { type: 'array', required: true, items: { type: 'object' } },
    status: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
  },
})

export function validateMessage(data) {
  return MESSAGE_SCHEMA.validate(data)
}

export function validateConversation(data) {
  return CONVERSATION_SCHEMA.validate(data)
}
