/**
 * Storage Provider Factory
 *
 * P12.3.2.1 — Storage Provider Interface Implementation
 *
 * Factory pattern for creating storage providers.
 * StorageService must use this factory - NO direct provider imports.
 *
 * Design Freeze P13.8: No modifications to Platform Core, Runtime, API, BusinessService
 */

import { STORAGE_PROVIDER_TYPES } from './storage.provider.interface.js'
import { StorageProviderError } from './storage.errors.js'

const PROVIDER_CACHE = new Map()

export class StorageProviderFactory {
  constructor() {
    this.providers = {
      [STORAGE_PROVIDER_TYPES.LOCAL]: () => import('./local.provider.js'),
      [STORAGE_PROVIDER_TYPES.S3]: () => import('./s3.provider.js'),
      [STORAGE_PROVIDER_TYPES.R2]: () => import('./r2.provider.js'),
    }
  }

  async create(type, config) {
    if (!type) {
      throw new StorageProviderError('Provider type is required')
    }

    const cacheKey = `${type}:${JSON.stringify(config)}`

    if (PROVIDER_CACHE.has(cacheKey)) {
      return PROVIDER_CACHE.get(cacheKey)
    }

    const providerLoader = this.providers[type]
    if (!providerLoader) {
      throw new StorageProviderError(
        `Unknown storage provider type: ${type}. Available: ${Object.keys(this.providers).join(', ')}`
      )
    }

    try {
      const module = await providerLoader()
      const ProviderClass = module.default || module
      const provider = new ProviderClass(config)

      PROVIDER_CACHE.set(cacheKey, provider)

      return provider
    } catch (error) {
      throw new StorageProviderError(
        `Failed to create storage provider: ${error.message}`,
        type
      )
    }
  }

  async createAll(providerConfigs) {
    const providers = {}

    for (const [name, config] of Object.entries(providerConfigs)) {
      providers[name] = await this.create(config.type, config)
    }

    return providers
  }

  clearCache() {
    PROVIDER_CACHE.clear()
  }

  static getProviderTypes() {
    return Object.values(STORAGE_PROVIDER_TYPES)
  }
}

export default new StorageProviderFactory()
