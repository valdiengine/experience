import { BaseCapability } from '../core/base.capability.js'
import { AvailabilityManager } from './availability.manager.js'
import { AvailabilityService } from './availability.service.js'
import { AVAILABILITY_EVENTS } from './availability.events.js'
import { AvailabilitySearch } from './availability.search.js'
import { expandOccupiedNights, OCCUPIED_NIGHTS_EXPANSION_VERSION, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT } from './availability.occupied-nights.js'

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

  /**
   * Public occupied-night contract for cross-capability callers.
   *
   * Other capabilities reach this through context.capabilities.get('availability')
   * and never import the module directly (agent.md 2.5 / 2.6). This is the only
   * surface exposing the derivation, so a caller cannot reimplement it and drift.
   *
   * Read-only by construction: it derives a date list from bounds and touches no
   * repository, so it is safe for a caller to invoke before opening a
   * transaction. It performs no mutation and no capacity check; the caller still
   * owns the conditional capacity UPDATE and its concurrency guards.
   *
   * @param {{ startDate: string, endDate: string, maxNights?: number }} input
   *   check-in (inclusive) and check-out (exclusive) bounds, strict 'YYYY-MM-DD'.
   * @returns {string[]} ascending, unique, consecutive occupied dates, check-out excluded
   * @throws {AvailabilityDateRangeError} for missing, malformed, impossible,
   *   equal, reversed or over-bound ranges
   */
  expandOccupiedNights(input) {
    return expandOccupiedNights(input)
  }

  /**
   * Version of the occupied-night derivation this capability currently serves.
   * Consumers persist this alongside consumed dates so a later revision is
   * detectable rather than silently re-deriving a different set.
   * @returns {number}
   */
  get occupiedNightsExpansionVersion() {
    return OCCUPIED_NIGHTS_EXPANSION_VERSION
  }

  /**
   * Default ceiling on nights per expansion. A technical bound for unvalidated
   * input, not a commercial stay policy and not a certified SQL transaction
   * budget.
   * @returns {number}
   */
  get occupiedNightsMaxNightsDefault() {
    return OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT
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
