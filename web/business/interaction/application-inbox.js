/**
 * P15.11.1 — Business Interaction Core & Application Inbox Architecture
 *
 * Application Inbox - logical management boundary for BusinessInteractions.
 */

import { BusinessInteraction, INTERACTION_STATUS, INTERACTION_ENVIRONMENTS, INTERACTION_TYPES, extractApplicationIdentity } from './business-interaction.model.js'
import { createBusinessInteractionValidator, validateStatusTransition, validateInteractionIsolation } from './business-interaction.validator.js'
import { InteractionEventGenerator, createInteractionEventGenerator } from './business-interaction.events.js'
import { createFileInteractionPersistence, FileBusinessInteractionPersistence } from './persistence/file.business-interaction.persistence.js'
import {
  InteractionNotFoundError,
  InteractionValidationError,
  InteractionIsolationViolationError,
  InvalidStatusTransitionError,
  PreviewInProductionError
} from './business-interaction.errors.js'
import { CANONICAL_DOMAINS } from '../../application/application.identity.js'

export class ApplicationInbox {
  #persistence
  #validator
  #eventGenerator
  #options

  constructor(options = {}) {
    this.#options = Object.freeze({ ...options })
    this.#persistence = options.persistence || createFileInteractionPersistence()
    this.#validator = options.validator || createBusinessInteractionValidator()
    this.#eventGenerator = options.eventGenerator || createInteractionEventGenerator()
  }

  create(applicationId, data, context = {}) {
    const appIdentity = extractApplicationIdentity(applicationId)
    if (!appIdentity.valid) {
      throw new InteractionValidationError(appIdentity.error)
    }

    const createData = {
      ...data,
      applicationId,
      domain: appIdentity.domain,
      route: appIdentity.route,
      company: data.company || appIdentity.company,
      destination: data.destination || appIdentity.destination,
      status: data.status || INTERACTION_STATUS.NEW,
      environment: data.environment || (context.preview ? INTERACTION_ENVIRONMENTS.PREVIEW : INTERACTION_ENVIRONMENTS.PRODUCTION),
      source: data.source || context.source || 'api'
    }

    const validation = this.#validator.validateCreate(createData)
    if (!validation.valid) {
      throw new InteractionValidationError(validation.errors.join('; '))
    }

    if (createData.environment === INTERACTION_ENVIRONMENTS.PREVIEW && context.production) {
      throw new PreviewInProductionError()
    }

    const interaction = new BusinessInteraction(createData)
    const saved = this.#persistence.create(interaction.toJSON())

    const event = this.#eventGenerator.generateCreatedEvent(saved)
    this.#persistence.addHistoryEntry(saved.id, this.#eventGenerator.generateHistoryEntry('created', saved))

    return {
      interaction: saved,
      event
    }
  }

  get(applicationId, interactionId, context = {}) {
    const interaction = this.#persistence.get(interactionId)
    if (!interaction) {
      throw new InteractionNotFoundError(interactionId)
    }

    const isolation = validateInteractionIsolation(interaction, applicationId)
    if (!isolation.valid) {
      throw new InteractionIsolationViolationError(isolation.errors.join('; '))
    }

    return interaction
  }

  list(applicationId, filters = {}, context = {}) {
    const appIdentity = extractApplicationIdentity(applicationId)
    if (!appIdentity.valid) {
      throw new InteractionValidationError(appIdentity.error)
    }

    if (context.environment === INTERACTION_ENVIRONMENTS.PREVIEW) {
      filters.environment = INTERACTION_ENVIRONMENTS.PREVIEW
    }

    return this.#persistence.list(applicationId, filters)
  }

  update(applicationId, interactionId, updates, context = {}) {
    const existing = this.get(applicationId, interactionId, context)

    if (existing.environment === INTERACTION_ENVIRONMENTS.PREVIEW && context.production) {
      throw new PreviewInProductionError()
    }

    const updateData = { ...updates }
    delete updateData.id
    delete updateData.applicationId
    delete updateData.createdAt

    const validation = this.#validator.validateUpdate(updateData)
    if (!validation.valid) {
      throw new InteractionValidationError(validation.errors.join('; '))
    }

    const updated = this.#persistence.update(interactionId, updateData)

    const event = this.#eventGenerator.generateUpdatedEvent(updated, updates)
    this.#persistence.addHistoryEntry(interactionId, this.#eventGenerator.generateHistoryEntry('updated', updated, { changes: Object.keys(updates) }))

    return {
      interaction: updated,
      event
    }
  }

  updateStatus(applicationId, interactionId, newStatus, context = {}) {
    const existing = this.get(applicationId, interactionId, context)

    if (existing.environment === INTERACTION_ENVIRONMENTS.PREVIEW && context.production) {
      throw new PreviewInProductionError()
    }

    const previousStatus = existing.status

    const transitionValidation = validateStatusTransition(previousStatus, newStatus)
    if (!transitionValidation.valid) {
      throw new InvalidStatusTransitionError(previousStatus, newStatus)
    }

    const updated = this.#persistence.updateStatus(interactionId, newStatus, previousStatus)

    const event = this.#eventGenerator.generateStatusChangedEvent(updated, previousStatus, newStatus)
    this.#persistence.addHistoryEntry(interactionId, this.#eventGenerator.generateHistoryEntry('status_changed', updated, {
      previousStatus,
      newStatus
    }))

    return {
      interaction: updated,
      event
    }
  }

  delete(applicationId, interactionId, context = {}) {
    const existing = this.get(applicationId, interactionId, context)

    if (existing.environment === INTERACTION_ENVIRONMENTS.PREVIEW && context.production) {
      throw new PreviewInProductionError()
    }

    const event = this.#eventGenerator.generateDeletedEvent(existing)
    this.#persistence.delete(interactionId)

    return { event }
  }

  getHistory(applicationId, interactionId, context = {}) {
    const existing = this.get(applicationId, interactionId, context)
    return this.#persistence.getHistory(interactionId)
  }

  getByCorrelationId(correlationId) {
    return this.#persistence.getByCorrelationId(correlationId)
  }

  getStatistics(applicationId, filters = {}) {
    const interactions = this.#persistence.list(applicationId, filters)

    const stats = {
      total: interactions.length,
      byStatus: {},
      byType: {},
      byEnvironment: {},
      recent: []
    }

    for (const interaction of interactions) {
      stats.byStatus[interaction.status] = (stats.byStatus[interaction.status] || 0) + 1
      stats.byType[interaction.type] = (stats.byType[interaction.type] || 0) + 1
      stats.byEnvironment[interaction.environment] = (stats.byEnvironment[interaction.environment] || 0) + 1
    }

    stats.recent = interactions.slice(0, 10).map(i => ({
      id: i.id,
      type: i.type,
      status: i.status,
      createdAt: i.createdAt
    }))

    return stats
  }
}

export function createApplicationInbox(options = {}) {
  return new ApplicationInbox(options)
}

export default {
  ApplicationInbox,
  createApplicationInbox
}
