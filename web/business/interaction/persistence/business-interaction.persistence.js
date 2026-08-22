/**
 * P15.11.1 — Business Interaction Core & Application Inbox Architecture
 *
 * Persistence contract for BusinessInteraction.
 *
 * This is separate from Application Configuration Persistence.
 */

export class BusinessInteractionPersistence {
  create(interaction) {
    throw new Error('Not implemented')
  }

  get(interactionId) {
    throw new Error('Not implemented')
  }

  update(interactionId, updates) {
    throw new Error('Not implemented')
  }

  delete(interactionId) {
    throw new Error('Not implemented')
  }

  list(applicationId, filters = {}) {
    throw new Error('Not implemented')
  }

  getByCorrelationId(correlationId) {
    throw new Error('Not implemented')
  }

  updateStatus(interactionId, newStatus, previousStatus) {
    throw new Error('Not implemented')
  }

  getHistory(interactionId) {
    throw new Error('Not implemented')
  }

  addHistoryEntry(interactionId, entry) {
    throw new Error('Not implemented')
  }

  exists(interactionId) {
    throw new Error('Not implemented')
  }
}

export function validateInteractionId(interactionId) {
  if (!interactionId || typeof interactionId !== 'string') {
    return { valid: false, error: 'Interaction ID must be a non-empty string' }
  }

  if (interactionId.includes('..') || interactionId.includes('~') || interactionId.includes('\0')) {
    return { valid: false, error: 'Interaction ID contains invalid characters' }
  }

  if (!interactionId.startsWith('int_')) {
    return { valid: false, error: 'Invalid interaction ID format' }
  }

  return { valid: true }
}

export default {
  BusinessInteractionPersistence,
  validateInteractionId
}
