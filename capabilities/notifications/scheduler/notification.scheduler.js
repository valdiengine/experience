/**
 * Notifications Capability — Notification Scheduler
 *
 * Handles delayed, scheduled, and recurring notifications
 * Business-agnostic: scheduling is time-based, not business-aware
 */
import { NOTIFICATION_EVENTS } from '../notification.events.js'

export class NotificationScheduler {
  #schedules = new Map()
  #timers = new Map()
  #eventBus = null
  #sendFn = null

  constructor(eventBus, sendFn) {
    this.#eventBus = eventBus
    this.#sendFn = sendFn
  }

  /**
   * Schedule a one-time notification
   * @param {object} config - { tenantId, notification, scheduledAt, templateId, recipients, variables }
   * @returns {{ success: boolean, scheduleId?: string, error?: string }}
   */
  schedule(config) {
    const { tenantId, notification, scheduledAt, templateId, recipients, variables } = config

    if (!scheduledAt) {
      return { success: false, error: 'scheduledAt is required' }
    }

    const scheduleTime = new Date(scheduledAt).getTime()
    const now = Date.now()

    if (scheduleTime <= now) {
      return { success: false, error: 'scheduledAt must be in the future' }
    }

    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const schedule = {
      id: scheduleId,
      tenantId,
      templateId: templateId || null,
      channel: notification?.channel,
      recipients: recipients || (notification?.recipient ? [notification.recipient] : []),
      variables: variables || {},
      scheduledAt,
      recurring: false,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    }

    this.#schedules.set(scheduleId, schedule)

    const timer = setTimeout(() => {
      this.#executeSchedule(scheduleId)
    }, scheduleTime - now)

    this.#timers.set(scheduleId, timer)

    this.#eventBus?.emit(NOTIFICATION_EVENTS.SCHEDULED, { schedule })
    return { success: true, scheduleId }
  }

  /**
   * Schedule a recurring notification
   * @param {object} config - { tenantId, notification, recurrenceRule, templateId, recipients, variables }
   * @returns {{ success: boolean, scheduleId?: string, error?: string }}
   */
  scheduleRecurring(config) {
    const { tenantId, notification, recurrenceRule, templateId, recipients, variables } = config

    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const schedule = {
      id: scheduleId,
      tenantId,
      templateId: templateId || null,
      channel: notification?.channel,
      recipients: recipients || (notification?.recipient ? [notification.recipient] : []),
      variables: variables || {},
      scheduledAt: null,
      recurring: true,
      recurrenceRule: recurrenceRule || 'daily',
      status: 'active',
      lastRun: null,
      nextRun: this.#getNextRun(recurrenceRule),
      createdAt: new Date().toISOString(),
    }

    this.#schedules.set(scheduleId, schedule)
    this.#eventBus?.emit(NOTIFICATION_EVENTS.SCHEDULED, { schedule })
    return { success: true, scheduleId }
  }

  /**
   * Cancel a scheduled notification
   * @param {string} scheduleId
   * @returns {{ success: boolean, error?: string }}
   */
  cancel(scheduleId) {
    const schedule = this.#schedules.get(scheduleId)
    if (!schedule) {
      return { success: false, error: `Schedule ${scheduleId} not found` }
    }

    const timer = this.#timers.get(scheduleId)
    if (timer) {
      clearTimeout(timer)
      this.#timers.delete(scheduleId)
    }

    schedule.status = 'cancelled'
    this.#eventBus?.emit(NOTIFICATION_EVENTS.SCHEDULE_CANCELLED, { scheduleId })
    return { success: true }
  }

  /**
   * Get all schedules for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getByTenant(tenantId) {
    const schedules = []
    for (const schedule of this.#schedules.values()) {
      if (schedule.tenantId === tenantId) {
        schedules.push({ ...schedule })
      }
    }
    return schedules
  }

  /**
   * Get upcoming scheduled notifications
   * @param {string} tenantId
   * @param {number} [limit=10]
   * @returns {object[]}
   */
  getUpcoming(tenantId, limit = 10) {
    return this.getByTenant(tenantId)
      .filter(s => s.status === 'scheduled' || s.status === 'active')
      .sort((a, b) => {
        const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
        const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
        return aTime - bTime
      })
      .slice(0, limit)
  }

  async #executeSchedule(scheduleId) {
    const schedule = this.#schedules.get(scheduleId)
    if (!schedule || schedule.status !== 'scheduled') return

    schedule.status = 'running'
    schedule.lastRun = new Date().toISOString()

    try {
      for (const recipient of schedule.recipients) {
        const notification = {
          tenantId: schedule.tenantId,
          channel: schedule.channel,
          recipient,
          templateId: schedule.templateId,
          variables: schedule.variables,
          source: 'scheduler',
        }
        await this.#sendFn(notification)
      }

      if (!schedule.recurring) {
        schedule.status = 'completed'
        this.#timers.delete(scheduleId)
      } else {
        schedule.status = 'active'
        schedule.nextRun = this.#getNextRun(schedule.recurrenceRule)
      }

      this.#eventBus?.emit(NOTIFICATION_EVENTS.SCHEDULE_TRIGGERED, { schedule })
    } catch (error) {
      schedule.status = 'failed'
      this.#eventBus?.emit(NOTIFICATION_EVENTS.FAILED, { scheduleId, error: error.message })
    }
  }

  #getNextRun(recurrenceRule) {
    const now = new Date()
    switch (recurrenceRule) {
      case 'hourly':
        now.setHours(now.getHours() + 1)
        break
      case 'daily':
        now.setDate(now.getDate() + 1)
        break
      case 'weekly':
        now.setDate(now.getDate() + 7)
        break
      case 'monthly':
        now.setMonth(now.getMonth() + 1)
        break
      default:
        now.setDate(now.getDate() + 1)
    }
    return now.toISOString()
  }

  /**
   * Clear all data
   */
  clear() {
    for (const timer of this.#timers.values()) {
      clearTimeout(timer)
    }
    this.#timers.clear()
    this.#schedules.clear()
  }
}
