/**
 * P15.11.4 — Notification Capability Core
 *
 * Notification API for application inbox integration.
 */

import { createNotificationService, NotificationService } from '../notification.service.js'
import { createInMemoryNotificationPersistence } from '../persistence/memory.notification.persistence.js'
import { createTestAdapterSet } from '../adapters/notification.adapter.js'
import {
  NotificationValidationError,
  NotificationNotFoundError
} from '../notification.errors.js'

export class NotificationAPI {
  #service
  #options

  constructor(options = {}) {
    this.#options = Object.freeze({ ...options })

    const persistence = options.persistence || createInMemoryNotificationPersistence()
    const adapters = options.adapters || createTestAdapterSet()

    this.#service = new NotificationService({
      persistence,
      adapters,
      maxAttempts: options.maxAttempts || 3
    })
  }

  getService() {
    return this.#service
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

    try {
      const notification = this.#service.createNotification({ ...data, applicationId }, context)
      return {
        success: true,
        data: notification,
        status: 201
      }
    } catch (error) {
      if (error instanceof NotificationValidationError) {
        return { success: false, error: error.message, errors: error.errors, status: 400 }
      }
      throw error
    }
  }

  handleGet(request) {
    const { applicationId, notificationId, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!notificationId) {
      return {
        success: false,
        error: 'Notification ID is required',
        status: 400
      }
    }

    try {
      const notification = this.#service.get(notificationId)

      if (!notification) {
        return { success: false, error: 'Notification not found', status: 404 }
      }

      if (notification.applicationId !== applicationId) {
        return { success: false, error: 'Notification not found', status: 404 }
      }

      return {
        success: true,
        data: notification,
        status: 200
      }
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        return { success: false, error: error.message, status: 404 }
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
      const notifications = this.#service.list(applicationId, filters)
      return {
        success: true,
        data: notifications,
        count: notifications.length,
        status: 200
      }
    } catch (error) {
      throw error
    }
  }

  handleProcess(request) {
    const { applicationId, notificationId, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!notificationId) {
      return {
        success: false,
        error: 'Notification ID is required',
        status: 400
      }
    }

    try {
      const notification = this.#service.processNotification(notificationId, context)

      if (!notification) {
        return { success: false, error: 'Notification not found', status: 404 }
      }

      return {
        success: true,
        data: notification,
        status: 200
      }
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        return { success: false, error: error.message, status: 404 }
      }
      throw error
    }
  }

  handleRetry(request) {
    const { applicationId, notificationId, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!notificationId) {
      return {
        success: false,
        error: 'Notification ID is required',
        status: 400
      }
    }

    try {
      const notification = this.#service.retry(notificationId, context)

      return {
        success: true,
        data: notification,
        status: 200
      }
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        return { success: false, error: error.message, status: 404 }
      }
      throw error
    }
  }

  handleCancel(request) {
    const { applicationId, notificationId, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!notificationId) {
      return {
        success: false,
        error: 'Notification ID is required',
        status: 400
      }
    }

    try {
      const notification = this.#service.cancel(notificationId, context)

      return {
        success: true,
        data: notification,
        status: 200
      }
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        return { success: false, error: error.message, status: 404 }
      }
      throw error
    }
  }

  handleStatistics(request) {
    const { applicationId, context = {} } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    try {
      const statistics = this.#service.getStatistics(applicationId)
      return {
        success: true,
        data: statistics,
        status: 200
      }
    } catch (error) {
      throw error
    }
  }

  handleHealth() {
    return {
      success: true,
      data: this.#service.health(),
      status: 200
    }
  }
}

export function createNotificationAPI(options = {}) {
  return new NotificationAPI(options)
}

export default {
  NotificationAPI,
  createNotificationAPI
}
