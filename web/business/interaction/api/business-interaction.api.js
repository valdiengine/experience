/**
 * P15.11.1 — Business Interaction Core & Application Inbox Architecture
 *
 * API endpoints for BusinessInteraction operations.
 */

import { createApplicationInbox, INTERACTION_TYPES, INTERACTION_STATUS } from '../index.js'
import {
  InteractionNotFoundError,
  InteractionValidationError,
  InteractionIsolationViolationError,
  InvalidStatusTransitionError,
  PreviewInProductionError
} from '../business-interaction.errors.js'

export class BusinessInteractionAPI {
  #inbox
  #options

  constructor(options = {}) {
    this.#options = Object.freeze({ ...options })
    this.#inbox = options.inbox || createApplicationInbox()
  }

  handleCreate(request) {
    const { applicationId, data, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'Data is required',
        status: 400
      }
    }

    if (!data.type) {
      return {
        success: false,
        error: 'Interaction type is required',
        status: 400
      }
    }

    if (!Object.values(INTERACTION_TYPES).includes(data.type)) {
      return {
        success: false,
        error: `Invalid interaction type: ${data.type}`,
        status: 400
      }
    }

    try {
      const result = this.#inbox.create(applicationId, data, context)
      return {
        success: true,
        data: result.interaction,
        event: result.event,
        status: 201
      }
    } catch (error) {
      if (error instanceof InteractionValidationError) {
        return { success: false, error: error.message, status: 400 }
      }
      if (error instanceof PreviewInProductionError) {
        return { success: false, error: error.message, status: 400 }
      }
      throw error
    }
  }

  handleGet(request) {
    const { applicationId, interactionId, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!interactionId) {
      return {
        success: false,
        error: 'Interaction ID is required',
        status: 400
      }
    }

    try {
      const interaction = this.#inbox.get(applicationId, interactionId, context)
      return {
        success: true,
        data: interaction,
        status: 200
      }
    } catch (error) {
      if (error instanceof InteractionNotFoundError) {
        return { success: false, error: error.message, status: 404 }
      }
      if (error instanceof InteractionIsolationViolationError) {
        return { success: false, error: error.message, status: 403 }
      }
      throw error
    }
  }

  handleList(request) {
    const { applicationId, filters = {}, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    try {
      const interactions = this.#inbox.list(applicationId, filters, context)
      return {
        success: true,
        data: interactions,
        count: interactions.length,
        status: 200
      }
    } catch (error) {
      if (error instanceof InteractionValidationError) {
        return { success: false, error: error.message, status: 400 }
      }
      throw error
    }
  }

  handleUpdate(request) {
    const { applicationId, interactionId, data, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!interactionId) {
      return {
        success: false,
        error: 'Interaction ID is required',
        status: 400
      }
    }

    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'Update data is required',
        status: 400
      }
    }

    try {
      const result = this.#inbox.update(applicationId, interactionId, data, context)
      return {
        success: true,
        data: result.interaction,
        event: result.event,
        status: 200
      }
    } catch (error) {
      if (error instanceof InteractionNotFoundError) {
        return { success: false, error: error.message, status: 404 }
      }
      if (error instanceof InteractionIsolationViolationError) {
        return { success: false, error: error.message, status: 403 }
      }
      if (error instanceof InteractionValidationError) {
        return { success: false, error: error.message, status: 400 }
      }
      if (error instanceof PreviewInProductionError) {
        return { success: false, error: error.message, status: 400 }
      }
      throw error
    }
  }

  handleStatusUpdate(request) {
    const { applicationId, interactionId, status, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!interactionId) {
      return {
        success: false,
        error: 'Interaction ID is required',
        status: 400
      }
    }

    if (!status) {
      return {
        success: false,
        error: 'New status is required',
        status: 400
      }
    }

    if (!Object.values(INTERACTION_STATUS).includes(status)) {
      return {
        success: false,
        error: `Invalid status: ${status}`,
        status: 400
      }
    }

    try {
      const result = this.#inbox.updateStatus(applicationId, interactionId, status, context)
      return {
        success: true,
        data: result.interaction,
        event: result.event,
        status: 200
      }
    } catch (error) {
      if (error instanceof InteractionNotFoundError) {
        return { success: false, error: error.message, status: 404 }
      }
      if (error instanceof InteractionIsolationViolationError) {
        return { success: false, error: error.message, status: 403 }
      }
      if (error instanceof InvalidStatusTransitionError) {
        return { success: false, error: error.message, status: 400 }
      }
      if (error instanceof PreviewInProductionError) {
        return { success: false, error: error.message, status: 400 }
      }
      throw error
    }
  }

  handleDelete(request) {
    const { applicationId, interactionId, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!interactionId) {
      return {
        success: false,
        error: 'Interaction ID is required',
        status: 400
      }
    }

    try {
      const result = this.#inbox.delete(applicationId, interactionId, context)
      return {
        success: true,
        event: result.event,
        status: 200
      }
    } catch (error) {
      if (error instanceof InteractionNotFoundError) {
        return { success: false, error: error.message, status: 404 }
      }
      if (error instanceof InteractionIsolationViolationError) {
        return { success: false, error: error.message, status: 403 }
      }
      if (error instanceof PreviewInProductionError) {
        return { success: false, error: error.message, status: 400 }
      }
      throw error
    }
  }

  handleHistory(request) {
    const { applicationId, interactionId, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!interactionId) {
      return {
        success: false,
        error: 'Interaction ID is required',
        status: 400
      }
    }

    try {
      const history = this.#inbox.getHistory(applicationId, interactionId, context)
      return {
        success: true,
        data: history,
        status: 200
      }
    } catch (error) {
      if (error instanceof InteractionNotFoundError) {
        return { success: false, error: error.message, status: 404 }
      }
      if (error instanceof InteractionIsolationViolationError) {
        return { success: false, error: error.message, status: 403 }
      }
      throw error
    }
  }

  handleStatistics(request) {
    const { applicationId, filters = {}, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    try {
      const stats = this.#inbox.getStatistics(applicationId, filters, context)
      return {
        success: true,
        data: stats,
        status: 200
      }
    } catch (error) {
      if (error instanceof InteractionValidationError) {
        return { success: false, error: error.message, status: 400 }
      }
      throw error
    }
  }

  handleCorrelationId(correlationId) {
    if (!correlationId) {
      return {
        success: false,
        error: 'Correlation ID is required',
        status: 400
      }
    }

    try {
      const interactions = this.#inbox.getByCorrelationId(correlationId)
      return {
        success: true,
        data: interactions,
        count: interactions.length,
        status: 200
      }
    } catch (error) {
      throw error
    }
  }
}

export function createBusinessInteractionAPI(options = {}) {
  return new BusinessInteractionAPI(options)
}

export default {
  BusinessInteractionAPI,
  createBusinessInteractionAPI
}
