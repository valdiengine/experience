/**
 * P15.11.1 — Business Interaction Core & Application Inbox Architecture
 *
 * Event generation for BusinessInteraction operations.
 */

import { INTERACTION_EVENT_TYPES } from './business-interaction.model.js'

export class InteractionEventGenerator {
  #generateEventId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `evt_${timestamp}${random}`
  }

  generateCreatedEvent(interaction) {
    return {
      id: this.#generateEventId(),
      type: INTERACTION_EVENT_TYPES.CREATED,
      source: interaction.source || 'business-interaction-core',
      applicationId: interaction.applicationId,
      domain: interaction.domain,
      route: interaction.route,
      company: interaction.company,
      destination: interaction.destination,
      timestamp: new Date().toISOString(),
      correlationId: interaction.correlationId,
      payload: {
        interactionId: interaction.id,
        interactionType: interaction.type,
        status: interaction.status,
        environment: interaction.environment,
        source: interaction.source,
        ...(interaction.payload || {})
      }
    }
  }

  generateUpdatedEvent(interaction, changes = {}) {
    return {
      id: this.#generateEventId(),
      type: INTERACTION_EVENT_TYPES.UPDATED,
      source: interaction.source || 'business-interaction-core',
      applicationId: interaction.applicationId,
      domain: interaction.domain,
      route: interaction.route,
      company: interaction.company,
      destination: interaction.destination,
      timestamp: new Date().toISOString(),
      correlationId: interaction.correlationId,
      payload: {
        interactionId: interaction.id,
        interactionType: interaction.type,
        status: interaction.status,
        environment: interaction.environment,
        changes: Object.keys(changes)
      }
    }
  }

  generateStatusChangedEvent(interaction, previousStatus, newStatus) {
    return {
      id: this.#generateEventId(),
      type: INTERACTION_EVENT_TYPES.STATUS_CHANGED,
      source: interaction.source || 'business-interaction-core',
      applicationId: interaction.applicationId,
      domain: interaction.domain,
      route: interaction.route,
      company: interaction.company,
      destination: interaction.destination,
      timestamp: new Date().toISOString(),
      correlationId: interaction.correlationId,
      payload: {
        interactionId: interaction.id,
        interactionType: interaction.type,
        previousStatus,
        newStatus,
        environment: interaction.environment
      }
    }
  }

  generateDeletedEvent(interaction) {
    return {
      id: this.#generateEventId(),
      type: INTERACTION_EVENT_TYPES.DELETED,
      source: interaction.source || 'business-interaction-core',
      applicationId: interaction.applicationId,
      domain: interaction.domain,
      route: interaction.route,
      company: interaction.company,
      destination: interaction.destination,
      timestamp: new Date().toISOString(),
      correlationId: interaction.correlationId,
      payload: {
        interactionId: interaction.id,
        interactionType: interaction.type,
        status: interaction.status,
        environment: interaction.environment
      }
    }
  }

  generateHistoryEntry(action, interaction, metadata = {}) {
    return {
      id: this.#generateEventId(),
      timestamp: new Date().toISOString(),
      action,
      interactionId: interaction.id,
      interactionType: interaction.type,
      applicationId: interaction.applicationId,
      domain: interaction.domain,
      route: interaction.route,
      status: interaction.status,
      environment: interaction.environment,
      metadata
    }
  }
}

export function createInteractionEventGenerator() {
  return new InteractionEventGenerator()
}

export default {
  InteractionEventGenerator,
  createInteractionEventGenerator
}
