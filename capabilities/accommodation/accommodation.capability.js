import { BaseCapability } from '../core/base.capability.js'
import { AccommodationManager } from './accommodation.manager.js'
import { AccommodationService } from './accommodation.service.js'
import { ACCOMMODATION_EVENTS } from './accommodation.events.js'
import { AccommodationSearch } from './accommodation.search.js'

export class AccommodationCapability extends BaseCapability {
  static id = 'accommodation'
  static name = 'Accommodation'
  static version = '1.0.0'
  static dependencies = []

  #manager
  #service

  async init(context, config) {
    await super.init(context, config)
    this.#manager = new AccommodationManager(context)
    this.#service = new AccommodationService(this.#manager)
  }

  async activate() {
    await super.activate()
    this.on(ACCOMMODATION_EVENTS.CREATED, this.#handleCreated)
    this.on(ACCOMMODATION_EVENTS.UPDATED, this.#handleUpdated)
    this.on(ACCOMMODATION_EVENTS.PUBLISHED, this.#handlePublished)
    this.on(ACCOMMODATION_EVENTS.UNPUBLISHED, this.#handleUnpublished)
    this.on(ACCOMMODATION_EVENTS.ARCHIVED, this.#handleArchived)
    this.on(ACCOMMODATION_EVENTS.DELETED, this.#handleDeleted)
    this.on(ACCOMMODATION_EVENTS.RESTORED, this.#handleRestored)
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
    this.#triggerSearchIndex(data.accommodation)
    this.#triggerSyncPush(data.accommodation)
  }

  #handleUpdated = async (data) => {
    this.#triggerSearchIndex(data.accommodation)
    this.#triggerSyncPush(data.accommodation)
  }

  #handlePublished = async (data) => {
    this.#triggerSearchIndex(data.accommodation)
    this.#triggerSyncPush(data.accommodation)
  }

  #handleUnpublished = async (data) => {
    this.#triggerSearchRemove(data.accommodation)
  }

  #handleArchived = async (data) => {
    this.#triggerSearchRemove(data.accommodation)
    this.#triggerSyncPush(data.accommodation)
  }

  #handleDeleted = async (data) => {
    this.#triggerSearchRemove(data.accommodation)
    this.#triggerSyncPush(data.accommodation)
  }

  #handleRestored = async (data) => {
    this.#triggerSearchIndex(data.accommodation)
    this.#triggerSyncPush(data.accommodation)
  }

  #triggerSearchIndex(accommodation) {
    const search = this.context?.runtime?.search
    if (!search) return
    const payload = AccommodationSearch.toPayload(accommodation)
    search.index('accommodation', payload).catch((err) => {
      console.error('[AccommodationCapability] Search index failed:', err)
    })
  }

  #triggerSearchRemove(accommodation) {
    const search = this.context?.runtime?.search
    if (!search) return
    search.delete('accommodation', accommodation.id).catch((err) => {
      console.error('[AccommodationCapability] Search remove failed:', err)
    })
  }

  #triggerSyncPush(accommodation) {
    const sync = this.context?.runtime?.sync
    if (!sync) return
    const payload = AccommodationSearch.toPayload(accommodation)
    sync.push('accommodation', payload).catch((err) => {
      console.error('[AccommodationCapability] Sync push failed:', err)
    })
  }
}
