import { BaseCapability } from '../core/base.capability.js'
import { BusinessManager } from './business.manager.js'
import { BusinessService } from './business.service.js'
import { BUSINESS_EVENTS } from './business.events.js'
import { BusinessSearch } from './business.search.js'

export class BusinessCapability extends BaseCapability {
  static id = 'business'
  static name = 'Business'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination']

  #manager
  #service

  async init(context, config) {
    await super.init(context, config)
    this.#manager = new BusinessManager(context)
    this.#service = new BusinessService(this.#manager)
  }

  async activate() {
    await super.activate()
    this.on(BUSINESS_EVENTS.CREATED, this.#handleCreated)
    this.on(BUSINESS_EVENTS.UPDATED, this.#handleUpdated)
    this.on(BUSINESS_EVENTS.PUBLISHED, this.#handlePublished)
    this.on(BUSINESS_EVENTS.UNPUBLISHED, this.#handleUnpublished)
    this.on(BUSINESS_EVENTS.ARCHIVED, this.#handleArchived)
    this.on(BUSINESS_EVENTS.DELETED, this.#handleDeleted)
    this.on(BUSINESS_EVENTS.RESTORED, this.#handleRestored)
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
    this.#triggerSearchIndex(data.business)
    this.#triggerSyncPush(data.business)
  }

  #handleUpdated = async (data) => {
    this.#triggerSearchIndex(data.business)
    this.#triggerSyncPush(data.business)
  }

  #handlePublished = async (data) => {
    this.#triggerSearchIndex(data.business)
    this.#triggerSyncPush(data.business)
  }

  #handleUnpublished = async (data) => {
    this.#triggerSearchRemove(data.business)
  }

  #handleArchived = async (data) => {
    this.#triggerSearchRemove(data.business)
    this.#triggerSyncPush(data.business)
  }

  #handleDeleted = async (data) => {
    this.#triggerSearchRemove(data.business)
    this.#triggerSyncPush(data.business)
  }

  #handleRestored = async (data) => {
    this.#triggerSearchIndex(data.business)
    this.#triggerSyncPush(data.business)
  }

  #triggerSearchIndex(business) {
    const search = this.context?.runtime?.search
    if (!search) return
    const payload = BusinessSearch.toPayload(business)
    search.index('business', payload).catch((err) => {
      console.error('[BusinessCapability] Search index failed:', err)
    })
  }

  #triggerSearchRemove(business) {
    const search = this.context?.runtime?.search
    if (!search) return
    search.delete('business', business.id).catch((err) => {
      console.error('[BusinessCapability] Search remove failed:', err)
    })
  }

  #triggerSyncPush(business) {
    const sync = this.context?.runtime?.sync
    if (!sync) return
    const payload = BusinessSearch.toPayload(business)
    sync.push('business', payload).catch((err) => {
      console.error('[BusinessCapability] Sync push failed:', err)
    })
  }
}
