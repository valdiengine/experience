import { NOTIFICATION_EVENTS } from './notification.events.js'
import { NOTIFICATION_STATUS } from './notification.status.js'
import { NotificationWorkflow } from './notification.workflow.js'
import { NotificationSearch } from './notification.search.js'
import { validateCreateData, validateUpdateData, validateCancel, validateRetry, validateArchive, validateDelete } from './notification.validation.js'
import { NOTIFICATION_PERMISSIONS } from './notification.permissions.js'
import {
  NotificationNotFoundError,
  NotificationPermissionError,
  NotificationValidationError,
} from './notification.errors.js'

export class NotificationManager {
  #context = null
  #notifications = new Map()

  constructor(context) {
    this.#context = context
  }

  get #repo() {
    return this.#context?.repositories?.notification || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  get #search() {
    return this.#context?.runtime?.search || null
  }

  get #preferences() {
    return this.#context?.repositories?.notificationPreferences || null
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth || !identity) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'notification')
    } catch {
      throw new NotificationPermissionError(permission)
    }
  }

  async #loadNotification(notificationId) {
    const cached = this.#notifications.get(notificationId)
    if (cached) return cached

    if (this.#repo) {
      try {
        const found = await this.#repo.findById(notificationId)
        if (found) {
          this.#notifications.set(notificationId, found)
          return found
        }
      } catch { /* repository not resolvable */ }
    }

    const fromDataManager = this.#context?.dataManager?.get('notifications')?.find(n => n.id === notificationId)
    if (fromDataManager) {
      this.#notifications.set(notificationId, fromDataManager)
      return fromDataManager
    }

    return null
  }

  async #persist(notification, isNew = false) {
    if (this.#repo) {
      try {
        if (isNew) {
          await this.#repo.create(notification)
        } else {
          const updated = await this.#repo.update({ id: notification.id }, notification)
          if (!updated) {
            await this.#repo.create(notification)
          }
        }
      } catch (err) {
        console.error(`[NotificationManager] Failed to persist notification ${notification.id}:`, err.message)
      }
    }
    this.#notifications.set(notification.id, notification)
    if (this.#context?.dataManager) {
      const notifications = this.#context.dataManager.get('notifications') || []
      const index = notifications.findIndex(n => n.id === notification.id)
      if (index >= 0) {
        notifications[index] = notification
      } else {
        notifications.push(notification)
      }
      this.#context.dataManager.set('notifications', notifications)
    }
  }

  async #triggerSearchIndex(notification) {
    const search = this.#search
    if (!search) return
    const payload = NotificationSearch.toPayload(notification)
    await search.index('notification', payload).catch((err) => {
      console.error('[NotificationCapability] Search index failed:', err)
    })
  }

  async #triggerSearchRemove(notification) {
    const search = this.#search
    if (!search) return
    await search.delete('notification', notification.id).catch((err) => {
      console.error('[NotificationCapability] Search remove failed:', err)
    })
  }

  // ── Lifecycle ──

  async createNotification(data, identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.CREATE)

    validateCreateData(data)

    const tenant = this.#context?.tenant
    const tenantId = data.tenantId
      || (tenant && typeof tenant === 'object' ? tenant.id : tenant)
      || null

    const now = new Date().toISOString()
    const notification = {
      id: data.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      tenantId,
      businessId: data.businessId || null,
      recipientId: data.recipientId,
      reservationId: data.reservationId || null,
      paymentId: data.paymentId || null,
      visitorId: data.visitorId || null,
      type: data.type,
      channel: data.channel,
      templateId: data.templateId || null,
      subject: data.subject || null,
      content: data.content,
      metadata: data.metadata || {},
      priority: data.priority || 'normal',
      status: NOTIFICATION_STATUS.DRAFT,
      scheduledAt: data.scheduledAt || null,
      sentAt: null,
      deliveredAt: null,
      failedAt: null,
      retryCount: 0,
      errorMessage: null,
      createdBy: identity?.id || null,
      updatedBy: identity?.id || null,
      createdAt: now,
      updatedAt: now,
      previousStatus: null,
    }

    await this.#persist(notification, true)
    this.#emit(NOTIFICATION_EVENTS.CREATED, { notification })
    await this.#triggerSearchIndex(notification)

    return { success: true, notification }
  }

  async updateNotification(id, data, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.UPDATE, notification)

    const updates = validateUpdateData(data, notification.status)
    const updated = { ...notification, ...updates, updatedAt: new Date().toISOString() }

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.UPDATED, { notification: updated, changes: updates })
    await this.#triggerSearchIndex(updated)

    return { success: true, notification: updated }
  }

  async scheduleNotification(id, scheduledAt, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.UPDATE, notification)

    const updated = NotificationWorkflow.transition(notification, NOTIFICATION_STATUS.SCHEDULED)
    updated.scheduledAt = scheduledAt

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.SCHEDULED, { notification: updated })
    await this.#triggerSearchIndex(updated)

    return { success: true, notification: updated }
  }

  async sendNotification(id, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.SEND, notification)

    const updated = NotificationWorkflow.transition(notification, NOTIFICATION_STATUS.PROCESSING)
    updated.sentAt = new Date().toISOString()

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.PROCESSING, { notification: updated })
    await this.#triggerSearchIndex(updated)

    return { success: true, notification: updated }
  }

  async cancelNotification(id, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.CANCEL, notification)
    validateCancel(notification)

    const updated = NotificationWorkflow.transition(notification, NOTIFICATION_STATUS.CANCELLED)

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.CANCELLED, { notification: updated })
    await this.#triggerSearchIndex(updated)

    return { success: true, notification: updated }
  }

  async retryNotification(id, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.RETRY, notification)
    validateRetry(notification)

    const updated = NotificationWorkflow.transition(notification, NOTIFICATION_STATUS.PENDING)
    updated.retryCount = (notification.retryCount || 0) + 1
    updated.errorMessage = null

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.RETRIED, { notification: updated })
    await this.#triggerSearchIndex(updated)

    return { success: true, notification: updated }
  }

  async markSent(id, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.SEND, notification)

    const updated = NotificationWorkflow.transition(notification, NOTIFICATION_STATUS.SENT)
    updated.sentAt = new Date().toISOString()

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.SENT, { notification: updated })
    await this.#triggerSearchIndex(updated)

    return { success: true, notification: updated }
  }

  async markDelivered(id, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.SEND, notification)

    const updated = NotificationWorkflow.transition(notification, NOTIFICATION_STATUS.DELIVERED)
    updated.deliveredAt = new Date().toISOString()

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.DELIVERED, { notification: updated })
    await this.#triggerSearchIndex(updated)

    return { success: true, notification: updated }
  }

  async markFailed(id, errorMessage, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.SEND, notification)

    const updated = NotificationWorkflow.transition(notification, NOTIFICATION_STATUS.FAILED)
    updated.failedAt = new Date().toISOString()
    updated.errorMessage = errorMessage || 'Unknown error'

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.FAILED, { notification: updated, error: errorMessage })
    await this.#triggerSearchIndex(updated)

    return { success: true, notification: updated }
  }

  async archiveNotification(id, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.ARCHIVE, notification)
    validateArchive(notification)

    const updated = NotificationWorkflow.transition(notification, NOTIFICATION_STATUS.ARCHIVED)

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.ARCHIVED, { notification: updated })
    await this.#triggerSearchRemove(updated)

    return { success: true, notification: updated }
  }

  async restoreNotification(id, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.RESTORE, notification)

    const updated = NotificationWorkflow.transition(notification, NOTIFICATION_STATUS.PENDING)
    updated.previousStatus = notification.status

    await this.#persist(updated)
    this.#emit(NOTIFICATION_EVENTS.RESTORED, { notification: updated })
    await this.#triggerSearchIndex(updated)

    return { success: true, notification: updated }
  }

  async deleteNotification(id, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.DELETE, notification)
    validateDelete(notification)

    this.#notifications.delete(id)
    if (this.#repo) {
      await this.#repo.delete({ id })
    }
    if (this.#context?.dataManager) {
      const notifications = this.#context.dataManager.get('notifications') || []
      const index = notifications.findIndex(n => n.id === id)
      if (index >= 0) {
        notifications.splice(index, 1)
        this.#context.dataManager.set('notifications', notifications)
      }
    }

    this.#emit(NOTIFICATION_EVENTS.DELETED, { notificationId: id })
    await this.#triggerSearchRemove(notification)

    return { success: true }
  }

  // ── Queries ──

  async getNotification(id, identity) {
    const notification = await this.#loadNotification(id)
    if (!notification) throw new NotificationNotFoundError(id)
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ, notification)
    return notification
  }

  async findNotifications(filter, identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany(filter) || []
  }

  async findByRecipient(recipientId, identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany({ recipientId }) || []
  }

  async findByBusiness(businessId, identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany({ businessId }) || []
  }

  async findByReservation(reservationId, identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany({ reservationId }) || []
  }

  async findByPayment(paymentId, identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany({ paymentId }) || []
  }

  async findPending(identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany({ status: NOTIFICATION_STATUS.PENDING }) || []
  }

  async findScheduled(identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany({ status: NOTIFICATION_STATUS.SCHEDULED }) || []
  }

  async findSent(identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany({ status: NOTIFICATION_STATUS.SENT }) || []
  }

  async findFailed(identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany({ status: NOTIFICATION_STATUS.FAILED }) || []
  }

  async findArchived(identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    return this.#repo?.findMany({ status: NOTIFICATION_STATUS.ARCHIVED }) || []
  }

  // ── Analytics ──

  async getNotificationStatistics(businessId, identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    const notifications = businessId
      ? await this.#repo?.findMany({ businessId }) || []
      : await this.#repo?.findMany({}) || []

    const byStatus = {}
    const byChannel = {}
    const byType = {}
    let total = 0

    for (const n of notifications) {
      total++
      byStatus[n.status] = (byStatus[n.status] || 0) + 1
      byChannel[n.channel] = (byChannel[n.channel] || 0) + 1
      byType[n.type] = (byType[n.type] || 0) + 1
    }

    return {
      total,
      byStatus,
      byChannel,
      byType,
      deliveryRate: total > 0 ? Math.round(((byStatus[NOTIFICATION_STATUS.DELIVERED] || 0) / total) * 100) : 0,
      failureRate: total > 0 ? Math.round(((byStatus[NOTIFICATION_STATUS.FAILED] || 0) / total) * 100) : 0,
    }
  }

  async getDeliveryRate(businessId, identity) {
    const stats = await this.getNotificationStatistics(businessId, identity)
    return stats.deliveryRate
  }

  async getFailureRate(businessId, identity) {
    const stats = await this.getNotificationStatistics(businessId, identity)
    return stats.failureRate
  }

  async getChannelStatistics(businessId, identity) {
    await this.#checkPermission(identity, NOTIFICATION_PERMISSIONS.READ)
    const notifications = businessId
      ? await this.#repo?.findMany({ businessId }) || []
      : await this.#repo?.findMany({}) || []

    const byChannel = {}
    for (const n of notifications) {
      if (!byChannel[n.channel]) {
        byChannel[n.channel] = { total: 0, sent: 0, delivered: 0, failed: 0 }
      }
      byChannel[n.channel].total++
      if (n.status === NOTIFICATION_STATUS.SENT) byChannel[n.channel].sent++
      if (n.status === NOTIFICATION_STATUS.DELIVERED) byChannel[n.channel].delivered++
      if (n.status === NOTIFICATION_STATUS.FAILED) byChannel[n.channel].failed++
    }

    return byChannel
  }

  // ── Utility ──

  getAll(identity) {
    return Array.from(this.#notifications.values())
  }

  loadFromDataManager() {
    const notifications = this.#context?.dataManager?.get('notifications') || []
    notifications.forEach(n => this.#notifications.set(n.id, n))
  }
}
