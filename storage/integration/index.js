/**
 * Storage Integration Index
 *
 * P12.3.2.2 — Storage Integration & Testing
 *
 * Complete integration wiring for the storage subsystem.
 * All layers are wired and validated together.
 *
 * Architecture:
 * BusinessService → StorageCapability → StorageManager → StorageService → ProviderFactory → Providers
 */

import { StorageService } from './storage.service.js'
import StorageProviderFactory from './providers/storage.provider.factory.js'
import { STORAGE_PROVIDER_TYPES } from './providers/storage.provider.interface.js'
import { StorageError, StorageValidationError } from './storage.errors.js'

export class StorageIntegration {
  constructor(config = {}) {
    this.config = config
    this.storageService = null
    this.initialized = false
    this.activeProvider = null
  }

  async initialize() {
    if (this.initialized) {
      return
    }

    this.storageService = new StorageService(this.config.storage || {})
    await this.storageService.initialize()

    this.activeProvider = this.storageService.defaultProvider
    this.initialized = true

    return {
      initialized: true,
      activeProvider: this.activeProvider,
      availableProviders: Array.from(this.storageService.providers.keys()),
    }
  }

  async shutdown() {
    if (this.storageService) {
      this.storageService.providers.forEach((provider) => {
        if (provider.shutdown) {
          provider.shutdown()
        }
      })
    }

    StorageProviderFactory.clearCache()
    this.initialized = false
  }

  getStorageService() {
    return this.storageService
  }

  getActiveProvider() {
    return this.activeProvider
  }

  getProvider(type = null) {
    return this.storageService.getProvider(type)
  }

  async switchProvider(type) {
    const availableTypes = Array.from(this.storageService.providers.keys())

    if (!availableTypes.includes(type)) {
      throw new StorageValidationError(
        `Provider type not available: ${type}. Available: ${availableTypes.join(', ')}`
      )
    }

    const previousProvider = this.activeProvider
    this.storageService.setDefaultProvider(type)
    this.activeProvider = type

    return {
      previousProvider,
      currentProvider: type,
      availableProviders: availableTypes,
    }
  }

  async healthCheck(providerType = null) {
    const type = providerType || this.activeProvider
    return this.storageService.healthCheck(type)
  }

  async fullHealthCheck() {
    const results = {}

    for (const [type, provider] of this.storageService.providers) {
      results[type] = await provider.health()
    }

    const allHealthy = Object.values(results).every((r) => r.healthy)

    return {
      overall: allHealthy ? 'healthy' : 'degraded',
      providers: results,
      activeProvider: this.activeProvider,
    }
  }

  static getProviderTypes() {
    return STORAGE_PROVIDER_TYPES
  }

  static getIntegrationInfo() {
    return {
      architecture: 'BusinessService → StorageCapability → StorageManager → StorageService → ProviderFactory → Providers',
      providers: Object.values(STORAGE_PROVIDER_TYPES),
      layers: 6,
      databaseSync: true,
      eventGeneration: true,
      tenantIsolation: true,
      providerAgnostic: true,
    }
  }
}

export default StorageIntegration
