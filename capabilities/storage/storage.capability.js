/**
 * Storage Capability
 *
 * P12.3.2.0.2 — Storage Capability Boundary Implementation
 *
 * Platform-level storage capability.
 * Provides unified storage interface for all products and companies.
 *
 * Architecture:
 * BusinessService → Storage Capability → Storage Manager → Storage Service → Provider
 *
 * This capability is NOT for direct use by products.
 * Products access storage through their BusinessService.
 */

import { BaseCapability } from '../core/base.capability.js'
import { StorageManager } from './storage.manager.js'
import { StorageAdapter } from './storage.adapter.js'
import { STORAGE_EVENTS } from './storage.events.js'

export class StorageCapability extends BaseCapability {
  static id = 'storage'
  static name = 'Storage'
  static version = '1.0.0'
  static dependencies = []

  #manager
  #adapter

  async init(context, config) {
    await super.init(context, config)

    this.#manager = new StorageManager(context)
    this.#adapter = new StorageAdapter(context)

    this.context.storage = this.#adapter
  }

  async activate() {
    await super.activate()
    this.setState('active')
  }

  async deactivate() {
    await super.deactivate()
    this.setState('registered')
  }

  async destroy() {
    this.#manager = null
    this.#adapter = null
    await super.destroy()
  }

  get manager() {
    return this.#manager
  }

  get adapter() {
    return this.#adapter
  }

  async healthCheck() {
    return this.#manager.healthCheck()
  }
}

export default StorageCapability
