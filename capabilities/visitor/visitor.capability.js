import { BaseCapability } from '../core/base.capability.js'
import { VisitorManager } from './visitor.manager.js'
import { VisitorService } from './visitor.service.js'
import { VISITOR_EVENTS } from './visitor.events.js'
import { VisitorSearch } from './visitor.search.js'

export class VisitorCapability extends BaseCapability {
  static id = 'visitor'
  static name = 'Visitor'
  static version = '1.0.0'
  static dependencies = []

  #manager
  #service

  async init(context, config) {
    await super.init(context, config)
    this.#manager = new VisitorManager(context)
    this.#service = new VisitorService(this.#manager)
  }

  async activate() {
    await super.activate()
    this.on(VISITOR_EVENTS.CREATED, this.#handleCreated)
    this.on(VISITOR_EVENTS.UPDATED, this.#handleUpdated)
    this.on(VISITOR_EVENTS.DELETED, this.#handleDeleted)
    this.on(VISITOR_EVENTS.ARCHIVED, this.#handleArchived)
    this.on(VISITOR_EVENTS.RESTORED, this.#handleRestored)
    this.on(VISITOR_EVENTS.VERIFIED, this.#handleVerified)
    this.on(VISITOR_EVENTS.ACTIVATED, this.#handleActivated)
    this.on(VISITOR_EVENTS.DEACTIVATED, this.#handleDeactivated)
    this.on(VISITOR_EVENTS.VIP_GRANTED, this.#handleVipGranted)
    this.on(VISITOR_EVENTS.VIP_REVOKED, this.#handleVipRevoked)
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
    this.#triggerSearchIndex(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #handleUpdated = async (data) => {
    this.#triggerSearchIndex(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #handleDeleted = async (data) => {
    this.#triggerSearchRemove(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #handleArchived = async (data) => {
    this.#triggerSearchRemove(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #handleRestored = async (data) => {
    this.#triggerSearchIndex(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #handleVerified = async (data) => {
    this.#triggerSearchIndex(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #handleActivated = async (data) => {
    this.#triggerSearchIndex(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #handleDeactivated = async (data) => {
    this.#triggerSearchIndex(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #handleVipGranted = async (data) => {
    this.#triggerSearchIndex(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #handleVipRevoked = async (data) => {
    this.#triggerSearchIndex(data.visitor)
    this.#triggerSyncPush(data.visitor)
  }

  #triggerSearchIndex(visitor) {
    const search = this.context?.runtime?.search
    if (!search) return
    const payload = VisitorSearch.toPayload(visitor)
    search.index('visitor', payload).catch((err) => {
      console.error('[VisitorCapability] Search index failed:', err)
    })
  }

  #triggerSearchRemove(visitor) {
    const search = this.context?.runtime?.search
    if (!search) return
    search.delete('visitor', visitor.id).catch((err) => {
      console.error('[VisitorCapability] Search remove failed:', err)
    })
  }

  #triggerSyncPush(visitor) {
    const sync = this.context?.runtime?.sync
    if (!sync) return
    const payload = VisitorSearch.toPayload(visitor)
    sync.push('visitor', payload).catch((err) => {
      console.error('[VisitorCapability] Sync push failed:', err)
    })
  }
}
