/**
 * Communication Capability — Events
 */
import { CAPABILITY_EVENTS } from '../core/events.js'

export const COMMUNICATION_EVENTS = {
  MESSAGE_SENT: 'communication:message_sent',
  MESSAGE_FAILED: 'communication:message_failed',
  MESSAGE_READ: 'communication:message_read', // Reserved: Future extension point
  CONVERSATION_STARTED: 'communication:conversation_started', // Reserved: Future extension point
  CONVERSATION_UPDATED: 'communication:conversation_updated', // Reserved: Future extension point
  CHANNEL_REGISTERED: 'communication:channel_registered',
}
