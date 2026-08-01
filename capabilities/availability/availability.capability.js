import { BaseCapability } from '../core/base.capability.js'
import { AvailabilityManager } from './availability.manager.js'
import { AvailabilityService } from './availability.service.js'
import { AVAILABILITY_EVENTS } from './availability.events.js'
import { AvailabilitySearch } from './availability.search.js'

export class AvailabilityCapability extends BaseCapability {
  static id = 'availability'
  static name = 'Availability'
  static version = '1.0.0'
  static dependencies = ['accommodation']

  #manager
  #service

  async init(context, config) {
    await super.init(context, config)
    this.#manager = new AvailabilityManager(context)
    this.#service = new AvailabilityService(this.#manager)
  }

  async activate() {
    await super.activate()
    this.on(AVAILABILITY_EVENTS.CREATED, this.#handleCreated)
    this.on(AVAILABILITY_EVENTS.UPDATED, this.#handleUpdated)
    this.on(AVAILABILITY_EVENTS.DELETED, this.#handleDeleted)
    this.on(AVAILABILITY_EVENTS.ARCHIVED, this.#handleArchived)
    this.on(AVAILABILITY_EVENTS.RESTORED, this.#handleRestored)
    this.on(AVAILABILITY_EVENTS.BLOCKED, this.#handleBlocked)
    this.on(AVAILABILITY_EVENTS.UNBLOCKED, this.#handleUnblocked)
    this.on(AVAILABILITY_EVENTS.RESERVED, this.#handleReserved)
    this.on(AVAILABILITY_EVENTS.RELEASED, this.#handleReleased)
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
    this.#triggerSearchIndex(data.availability)
    this.#triggerSyncPush(data.availability)
  }

  #handleUpdated = async (data) => {
    this.#triggerSearchIndex(data.availability)
    this.#triggerSyncPush(data.availability)
  }

  #handleDeleted = async (data) => {
    this.#triggerSearchRemove(data.availability)
  }

  #handleArchived = async (data) => {
    this.#triggerSearchRemove(data.availability)
    this.#triggerSyncPush(data.availability)
  }

  #handleRestored = async (data) => {
    this.#triggerSearchIndex(data.availability)
    this.#triggerSyncPush(data.availability)
  }

  #handleBlocked = async (data) => {
    this.#triggerSyncPush(data)
  }

  #handleUnblocked = async (data) => {
    this.#triggerSyncPush(data)
  }

  #handleReserved = async (data) => {
    this.#triggerSyncPush(data)
  }

  #handleReleased = async (data) => {
    this.#triggerSyncPush(data)
  }

  #triggerSearchIndex(availability) {
    const search = this.context?.runtime?.search
    if (!search) return
    const payload = AvailabilitySearch.toPayload(availability)
    search.index('availability', payload).catch((err) => {
      console.error('[AvailabilityCapability] Search index failed:', err)
    })
  }

  #triggerSearchRemove(availability) {
    const search = this.context?.runtime?.search
    if (!search) return
    search.delete('availability', availability.id).catch((err) => {
      console.error('[AvailabilityCapability] Search remove failed:', err)
    })
  }

  #triggerSyncPush(data) {
    const sync = this.context?.runtime?.sync
    if (!sync) return
    sync.push('availability', data).catch((err) => {
      console.error('[AvailabilityCapability] Sync push failed:', err)
    })
  }
}
