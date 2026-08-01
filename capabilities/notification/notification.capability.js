import { BaseCapability } from '../core/base.capability.js'
import { NotificationManager } from './notification.manager.js'
import { NotificationService } from './notification.service.js'
import { NOTIFICATION_EVENTS } from './notification.events.js'
import { NotificationSearch } from './notification.search.js'

export class NotificationCapability extends BaseCapability {
  static id = 'notification'
  static name = 'Notification'
  static version = '1.0.0'
  static dependencies = []

  #manager
  #service

  async init(context, config) {
    await super.init(context, config)
    this.#manager = new NotificationManager(context)
    this.#service = new NotificationService(this.#manager)
  }

  async activate() {
    await super.activate()
    this.on(NOTIFICATION_EVENTS.CREATED, this.#handleCreated)
    this.on(NOTIFICATION_EVENTS.UPDATED, this.#handleUpdated)
    this.on(NOTIFICATION_EVENTS.SENT, this.#handleSent)
    this.on(NOTIFICATION_EVENTS.DELIVERED, this.#handleDelivered)
    this.on(NOTIFICATION_EVENTS.FAILED, this.#handleFailed)
    this.on(NOTIFICATION_EVENTS.ARCHIVED, this.#handleArchived)
    this.on(NOTIFICATION_EVENTS.DELETED, this.#handleDeleted)
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#manager = null
    this.#service = null
    await super.destroy()
  }

  get manager() {
    return this.#manager
  }

  get service() {
    return this.#service
  }

  #handleCreated = async (data) => {
    this.#triggerSearchIndex(data.notification)
  }

  #handleUpdated = async (data) => {
    this.#triggerSearchIndex(data.notification)
  }

  #handleSent = async (data) => {
    this.#triggerSearchIndex(data.notification)
  }

  #handleDelivered = async (data) => {
    this.#triggerSearchIndex(data.notification)
  }

  #handleFailed = async (data) => {
    this.#triggerSearchIndex(data.notification)
  }

  #handleArchived = async (data) => {
    this.#triggerSearchRemove(data.notification)
  }

  #handleDeleted = async (data) => {
    if (data.notificationId) {
      this.#triggerSearchRemove({ id: data.notificationId })
    }
  }

  #triggerSearchIndex(notification) {
    const search = this.context?.runtime?.search
    if (!search) return
    const payload = NotificationSearch.toPayload(notification)
    search.index('notification', payload).catch((err) => {
      console.error('[NotificationCapability] Search index failed:', err)
    })
  }

  #triggerSearchRemove(notification) {
    const search = this.context?.runtime?.search
    if (!search) return
    search.delete('notification', notification.id).catch((err) => {
      console.error('[NotificationCapability] Search remove failed:', err)
    })
  }
}
