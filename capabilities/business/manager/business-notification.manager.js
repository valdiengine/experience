import { BUSINESS_NOTIFICATION_EVENTS } from '../business.events.js'
import { BusinessOrchestrationError } from '../business.errors.js'
import { BUSINESS_PERMISSIONS } from '../business.permissions.js'
import { BUSINESS_STATUS } from '../business.status.js'

export class BusinessNotificationManager {
  #context

  constructor(context) {
    this.#context = context
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  get #notification() {
    return this.#context?.capabilities?.get?.('notification')
  }

  get #businessRepo() {
    return this.#context?.repositories?.business || null
  }

  get #reservationManager() {
    return this.#context?.capabilities?.get?.('business')?.manager?.getReservationManager?.()
  }

  get #visitorManager() {
    return this.#context?.capabilities?.get?.('business')?.manager?.getVisitorManager?.()
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'business')
    } catch {
      throw new BusinessOrchestrationError(`Missing permission: ${permission}`)
    }
  }

  async #assertBusinessActive(businessId) {
    const business = await this.#businessRepo?.findById(businessId)
    if (!business) throw new BusinessOrchestrationError(`Business not found: ${businessId}`)
    if (business.status === BUSINESS_STATUS.ARCHIVED) {
      throw new BusinessOrchestrationError('Archived businesses cannot manage notifications')
    }
    if (business.status === BUSINESS_STATUS.DELETED) {
      throw new BusinessOrchestrationError('Deleted businesses cannot manage notifications')
    }
    return business
  }

  async #assertNotificationBelongsToBusiness(notificationId, businessId) {
    const notification = await this.#delegateManager('getNotification', notificationId, null)
    if (!notification) throw new BusinessOrchestrationError(`Notification not found: ${notificationId}`)
    if (notification.businessId !== businessId) {
      throw new BusinessOrchestrationError('Notification does not belong to this business')
    }
    return notification
  }

  #delegateService(method, ...args) {
    const cap = this.#notification
    if (!cap?.service) throw new BusinessOrchestrationError('Notification capability not available')
    const fn = cap.service[method]
    if (!fn) throw new BusinessOrchestrationError(`Notification service method not found: ${method}`)
    return fn.call(cap.service, ...args)
  }

  #delegateManager(method, ...args) {
    const cap = this.#notification
    if (!cap?.manager) throw new BusinessOrchestrationError('Notification capability not available')
    const fn = cap.manager[method]
    if (!fn) throw new BusinessOrchestrationError(`Notification manager method not found: ${method}`)
    return fn.call(cap.manager, ...args)
  }

  getNotificationCapability() {
    return this.#notification
  }

  // ── Notification Lifecycle ──

  async createNotification(businessId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const notificationData = { ...data, businessId }
    const result = await this.#delegateService('create', notificationData, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_CREATED, { businessId, notificationId: result.notification?.id, notification: result.notification, identity })
    }
    return result
  }

  async updateNotification(businessId, notificationId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('update', notificationId, data, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_UPDATED, { businessId, notificationId, changes: data, identity })
    }
    return result
  }

  async scheduleNotification(businessId, notificationId, scheduledAt, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('schedule', notificationId, scheduledAt, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_SCHEDULED, { businessId, notificationId, scheduledAt, identity })
    }
    return result
  }

  async sendNotification(businessId, notificationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('send', notificationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_SENT, { businessId, notificationId, identity })
    }
    return result
  }

  async cancelNotification(businessId, notificationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('cancel', notificationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_CANCELLED, { businessId, notificationId, identity })
    }
    return result
  }

  async retryNotification(businessId, notificationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('retry', notificationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_RETRIED, { businessId, notificationId, identity })
    }
    return result
  }

  async archiveNotification(businessId, notificationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('archive', notificationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_ARCHIVED, { businessId, notificationId, identity })
    }
    return result
  }

  async restoreNotification(businessId, notificationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('restore', notificationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_RESTORED, { businessId, notificationId, identity })
    }
    return result
  }

  async deleteNotification(businessId, notificationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.DELETE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('delete', notificationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_DELETED, { businessId, notificationId, identity })
    }
    return result
  }

  async markSent(businessId, notificationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('markSent', notificationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_SENT, { businessId, notificationId, identity })
    }
    return result
  }

  async markDelivered(businessId, notificationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('markDelivered', notificationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_DELIVERED, { businessId, notificationId, identity })
    }
    return result
  }

  async markFailed(businessId, notificationId, errorMessage, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    const result = await this.#delegateService('markFailed', notificationId, errorMessage, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_FAILED, { businessId, notificationId, errorMessage, identity })
    }
    return result
  }

  // ── Notification Queries ──

  async findNotification(businessId, notificationId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notification = await this.#assertNotificationBelongsToBusiness(notificationId, businessId)
    return notification
  }

  async findNotifications(businessId, filter, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.#delegateService('findByBusiness', businessId, identity)
    if (!filter) return notifications
    if (filter.status) return notifications.filter((n) => n.status === filter.status)
    if (filter.channel) return notifications.filter((n) => n.channel === filter.channel)
    if (filter.type) return notifications.filter((n) => n.type === filter.type)
    if (filter.recipientId) return notifications.filter((n) => n.recipientId === filter.recipientId)
    if (filter.reservationId) return notifications.filter((n) => n.reservationId === filter.reservationId)
    if (filter.paymentId) return notifications.filter((n) => n.paymentId === filter.paymentId)
    return notifications
  }

  async findBusinessNotifications(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('findByBusiness', businessId, identity)
  }

  async findPendingNotifications(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.#delegateService('findPending', identity)
    return notifications.filter((n) => n.businessId === businessId)
  }

  async findScheduledNotifications(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.#delegateService('findScheduled', identity)
    return notifications.filter((n) => n.businessId === businessId)
  }

  async findSentNotifications(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.#delegateService('findSent', identity)
    return notifications.filter((n) => n.businessId === businessId)
  }

  async findFailedNotifications(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.#delegateService('findFailed', identity)
    return notifications.filter((n) => n.businessId === businessId)
  }

  async findDeliveredNotifications(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const all = await this.#delegateService('findByBusiness', businessId, identity)
    return all.filter((n) => n.status === 'delivered')
  }

  async notificationExists(businessId, notificationId, identity) {
    const notification = await this.findNotification(businessId, notificationId, identity)
    return !!notification
  }

  async countNotifications(businessId, identity) {
    const notifications = await this.findBusinessNotifications(businessId, identity)
    return notifications.length
  }

  // ── Reservation Coordination ──

  async createReservationNotification(businessId, reservationId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const reservationManager = this.#reservationManager
    if (reservationManager) {
      const reservation = await reservationManager.getReservation(reservationId, identity)
      if (!reservation) throw new BusinessOrchestrationError(`Reservation not found: ${reservationId}`)
      if (reservation.businessId !== businessId) {
        throw new BusinessOrchestrationError('Reservation does not belong to this business')
      }
    }
    const notificationData = {
      ...data,
      businessId,
      reservationId,
      type: data.type || 'reservation_created',
      channel: data.channel || 'email',
    }
    const result = await this.#delegateService('create', notificationData, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_CREATED, { businessId, notificationId: result.notification?.id, reservationId, identity })
    }
    return result
  }

  async cancelReservationNotifications(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const notifications = await this.#delegateService('findByReservation', reservationId, identity)
    const businessNotifications = notifications.filter((n) => n.businessId === businessId)
    const results = { succeeded: 0, failed: 0, cancelled: [] }
    for (const n of businessNotifications) {
      if (n.status === 'cancelled' || n.status === 'delivered' || n.status === 'archived') continue
      try {
        await this.#delegateService('cancel', n.id, identity)
        results.succeeded++
        results.cancelled.push(n.id)
      } catch {
        results.failed++
      }
    }
    this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_CANCELLED, { businessId, reservationId, count: results.succeeded, identity })
    return results
  }

  async findReservationNotifications(businessId, reservationId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.#delegateService('findByReservation', reservationId, identity)
    return notifications.filter((n) => n.businessId === businessId)
  }

  async scheduleReservationReminder(businessId, reservationId, reminderData, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const notificationData = {
      ...reminderData,
      businessId,
      reservationId,
      type: 'reservation_reminder',
    }
    const result = await this.#delegateService('create', notificationData, identity)
    if (result?.success) {
      if (reminderData.scheduledAt) {
        await this.#delegateService('schedule', result.notification.id, reminderData.scheduledAt, identity)
      }
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_SCHEDULED, { businessId, notificationId: result.notification?.id, reservationId, identity })
    }
    return result
  }

  async sendReservationConfirmation(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    return this.createReservationNotification(businessId, reservationId, {
      type: 'reservation_confirmed',
      channel: 'email',
    }, identity)
  }

  async sendReservationCancellation(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    return this.createReservationNotification(businessId, reservationId, {
      type: 'reservation_cancelled',
      channel: 'email',
    }, identity)
  }

  // ── Payment Coordination ──

  async createPaymentNotification(businessId, paymentId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const notificationData = {
      ...data,
      businessId,
      paymentId,
      type: data.type || 'payment_received',
      channel: data.channel || 'email',
    }
    const result = await this.#delegateService('create', notificationData, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_CREATED, { businessId, notificationId: result.notification?.id, paymentId, identity })
    }
    return result
  }

  async sendPaymentReceipt(businessId, paymentId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    return this.createPaymentNotification(businessId, paymentId, {
      type: 'payment_received',
      channel: 'email',
    }, identity)
  }

  async sendRefundNotification(businessId, paymentId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    return this.createPaymentNotification(businessId, paymentId, {
      type: 'refund_completed',
      channel: 'email',
    }, identity)
  }

  async findPaymentNotifications(businessId, paymentId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.#delegateService('findByPayment', paymentId, identity)
    return notifications.filter((n) => n.businessId === businessId)
  }

  // ── Visitor Coordination ──

  async findVisitorNotifications(businessId, visitorId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.#delegateService('findByRecipient', visitorId, identity)
    return notifications.filter((n) => n.businessId === businessId)
  }

  async findUnreadVisitorNotifications(businessId, visitorId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.findVisitorNotifications(businessId, visitorId, identity)
    return notifications.filter((n) => n.status !== 'delivered' && n.status !== 'archived' && n.status !== 'deleted')
  }

  async markVisitorNotificationsRead(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const notifications = await this.findVisitorNotifications(businessId, visitorId, identity)
    const results = { succeeded: 0, failed: 0 }
    for (const n of notifications) {
      if (n.status === 'delivered') continue
      try {
        await this.#delegateService('markDelivered', n.id, identity)
        results.succeeded++
      } catch {
        results.failed++
      }
    }
    return results
  }

  async sendVisitorNotification(businessId, visitorId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const notificationData = {
      ...data,
      businessId,
      recipientId: visitorId,
      type: data.type || 'visitor_welcome',
      channel: data.channel || 'email',
    }
    const result = await this.#delegateService('create', notificationData, identity)
    if (result?.success) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_CREATED, { businessId, notificationId: result.notification?.id, visitorId, identity })
    }
    return result
  }

  // ── Aggregation ──

  async getNotificationStatistics(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateManager('getNotificationStatistics', businessId, identity)
  }

  async getBusinessNotificationSummary(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const stats = await this.#delegateManager('getNotificationStatistics', businessId, identity)
    const notifications = await this.findBusinessNotifications(businessId, identity)
    return {
      total: notifications.length,
      byStatus: stats.byStatus || {},
      byChannel: stats.byChannel || {},
      byType: stats.byType || {},
      deliveryRate: stats.deliveryRate || 0,
      failureRate: stats.failureRate || 0,
    }
  }

  async getDeliveryRate(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateManager('getDeliveryRate', businessId, identity)
  }

  async getFailureRate(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateManager('getFailureRate', businessId, identity)
  }

  async getChannelStatistics(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateManager('getChannelStatistics', businessId, identity)
  }

  async getTemplateStatistics(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.findBusinessNotifications(businessId, identity)
    const byTemplate = {}
    for (const n of notifications) {
      if (n.templateId) {
        byTemplate[n.templateId] = (byTemplate[n.templateId] || 0) + 1
      }
    }
    return byTemplate
  }

  async getDailyNotificationVolume(businessId, days = 30, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.findBusinessNotifications(businessId, identity)
    const now = new Date()
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const dailyVolume = {}
    for (const n of notifications) {
      if (!n.createdAt) continue
      const date = new Date(n.createdAt)
      if (date < cutoff) continue
      const day = date.toISOString().split('T')[0]
      dailyVolume[day] = (dailyVolume[day] || 0) + 1
    }
    return dailyVolume
  }

  async getNotificationDashboard(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const [summary, pending, failed, recent] = await Promise.all([
      this.getBusinessNotificationSummary(businessId, identity),
      this.findPendingNotifications(businessId, identity),
      this.findFailedNotifications(businessId, identity),
      this.findNotifications(businessId, {}, identity),
    ])
    return {
      summary,
      pendingCount: pending.length,
      failedCount: failed.length,
      recentNotifications: recent.slice(0, 10),
    }
  }

  // ── Batch Operations ──

  async archiveBusinessNotifications(businessId, notificationIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of notificationIds) {
      try {
        await this.#assertNotificationBelongsToBusiness(id, businessId)
        await this.#delegateService('archive', id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ notificationId: id, error: err.message })
      }
    }
    return results
  }

  async restoreBusinessNotifications(businessId, notificationIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of notificationIds) {
      try {
        await this.#assertNotificationBelongsToBusiness(id, businessId)
        await this.#delegateService('restore', id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ notificationId: id, error: err.message })
      }
    }
    return results
  }

  async cancelPendingNotifications(businessId, notificationIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of notificationIds) {
      try {
        await this.#assertNotificationBelongsToBusiness(id, businessId)
        await this.#delegateService('cancel', id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ notificationId: id, error: err.message })
      }
    }
    return results
  }

  async retryFailedNotifications(businessId, notificationIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of notificationIds) {
      try {
        await this.#assertNotificationBelongsToBusiness(id, businessId)
        await this.#delegateService('retry', id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ notificationId: id, error: err.message })
      }
    }
    return results
  }

  async markAllDelivered(businessId, notificationIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of notificationIds) {
      try {
        await this.#assertNotificationBelongsToBusiness(id, businessId)
        await this.#delegateService('markDelivered', id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ notificationId: id, error: err.message })
      }
    }
    return results
  }

  async cleanupArchivedNotifications(businessId, daysOld = 30, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.DELETE)
    const notifications = await this.findNotifications(businessId, { status: 'archived' }, identity)
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
    const toDelete = notifications.filter((n) => {
      if (!n.updatedAt) return false
      return new Date(n.updatedAt) < cutoff
    })
    const results = { succeeded: 0, failed: 0, deleted: 0 }
    for (const n of toDelete) {
      try {
        await this.#delegateService('delete', n.id, identity)
        results.deleted++
        results.succeeded++
      } catch {
        results.failed++
      }
    }
    return results
  }

  // ── Search Integration ──

  async refreshNotificationSearch(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const search = this.#context?.runtime?.search
    const notifications = await this.findBusinessNotifications(businessId, identity)
    let indexed = 0
    for (const n of notifications) {
      try {
        await search?.index?.('notification', { ...n, businessId })
        indexed++
      } catch { }
    }
    this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_SEARCH_UPDATED, { businessId, indexed, total: notifications.length, identity })
    return { businessId, indexed, total: notifications.length }
  }

  async refreshNotificationStatistics(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const summary = await this.getBusinessNotificationSummary(businessId, identity)
    const fields = {
      notificationCount: summary.total,
      pendingNotifications: summary.byStatus?.pending || 0,
      failedNotifications: summary.byStatus?.failed || 0,
      deliveryRate: summary.deliveryRate || 0,
      lastNotificationSync: new Date().toISOString(),
    }
    await this.#businessRepo?.update({ id: businessId }, fields)
    this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_SUMMARY_UPDATED, { businessId, ...fields, identity })
    return { businessId, ...fields }
  }

  // ── Business Rules: Cascade ──

  async cascadeArchive(businessId, identity) {
    try {
      const notifications = await this.findBusinessNotifications(businessId, null)
      for (const n of notifications) {
        if (n.status === 'archived' || n.status === 'deleted') continue
        await this.#delegateService('archive', n.id, null)
      }
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_ARCHIVED, { businessId, action: 'cascade_archive', identity })
    } catch (err) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_ERROR, { businessId, action: 'cascade_archive', error: err.message })
    }
  }

  async cascadeRestore(businessId, identity) {
    try {
      const notifications = await this.findBusinessNotifications(businessId, null)
      for (const n of notifications) {
        if (n.status !== 'archived') continue
        await this.#delegateService('restore', n.id, null)
      }
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_RESTORED, { businessId, action: 'cascade_restore', identity })
    } catch (err) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_ERROR, { businessId, action: 'cascade_restore', error: err.message })
    }
  }

  async cascadeDelete(businessId, identity) {
    try {
      const notifications = await this.findBusinessNotifications(businessId, null)
      for (const n of notifications) {
        if (n.status === 'archived') continue
        await this.#delegateService('archive', n.id, null)
      }
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_ARCHIVED, { businessId, action: 'cascade_delete', identity })
    } catch (err) {
      this.#emit(BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_ERROR, { businessId, action: 'cascade_delete', error: err.message })
    }
  }

  // ── Utility ──

  async calculateNotificationCosts(businessId, options, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return { estimated: 0, currency: 'USD' }
  }

  async estimateNotificationVolume(businessId, options, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const notifications = await this.findBusinessNotifications(businessId, identity)
    return { estimated: notifications.length, period: options?.period || 'month' }
  }
}
