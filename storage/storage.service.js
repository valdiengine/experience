/**
 * Storage Service
 *
 * P12.3.2.0 — Storage Architecture Definition
 * P12.3.2.1 — Provider Interface Implementation (Factory pattern)
 *
 * Platform-level storage abstraction layer.
 * All storage operations MUST go through this service.
 *
 * Architecture: Business → Storage Capability → Storage Service → Provider
 *
 * Design Freeze P13.8: No modifications to Platform Core, Runtime, API, BusinessService
 *
 * IMPORTANT: This service uses StorageProviderFactory - NO direct provider imports.
 */

import { StorageProviderInterface, STORAGE_PROVIDER_TYPES } from './providers/storage.provider.interface.js'
import StorageProviderFactory from './providers/storage.provider.factory.js'
import {
  StorageValidationError,
  StorageConfigurationError,
} from './storage.errors.js'

export class StorageService {
  constructor(config = {}) {
    this.providers = new Map()
    this.defaultProvider = null
    this.config = config
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) {
      return
    }

    if (this.config.local?.enabled !== false) {
      await this.registerProvider(STORAGE_PROVIDER_TYPES.LOCAL, this.config.local || {})
    }

    if (this.config.s3?.enabled) {
      await this.registerProvider(STORAGE_PROVIDER_TYPES.S3, this.config.s3 || {})
    }

    if (this.config.r2?.enabled) {
      await this.registerProvider(STORAGE_PROVIDER_TYPES.R2, this.config.r2 || {})
    }

    this.initialized = true
  }

  async registerProvider(type, config) {
    const provider = await StorageProviderFactory.create(type, config)

    if (!(provider instanceof StorageProviderInterface)) {
      throw new StorageConfigurationError(
        'Provider must implement StorageProviderInterface',
        type
      )
    }

    await provider.initialize()
    this.providers.set(type, provider)

    if (!this.defaultProvider) {
      this.defaultProvider = type
    }
  }

  getProvider(type = null) {
    const providerType = type || this.defaultProvider
    const provider = this.providers.get(providerType)

    if (!provider) {
      throw new StorageConfigurationError(
        `Provider not registered: ${providerType}`,
        providerType
      )
    }

    return provider
  }

  setDefaultProvider(type) {
    if (!this.providers.has(type)) {
      throw new StorageConfigurationError(
        `Provider not found: ${type}`,
        type
      )
    }
    this.defaultProvider = type
  }

  async uploadAsset(assetData, options = {}) {
    this.validateAssetData(assetData)

    const provider = this.getProvider(options.provider)
    const result = await provider.upload(assetData, options)

    return {
      ...result,
      assetId: result.key || result.path,
      provider: provider.type,
    }
  }

  async downloadAsset(assetId, options = {}) {
    if (!assetId) {
      throw new StorageValidationError('Asset ID is required', { assetId })
    }

    const provider = this.getProvider(options.provider)
    return provider.download(assetId, options)
  }

  async deleteAsset(assetId, options = {}) {
    if (!assetId) {
      throw new StorageValidationError('Asset ID is required', { assetId })
    }

    const provider = this.getProvider(options.provider)
    return provider.delete(assetId, options)
  }

  async getAssetUrl(assetId, options = {}) {
    if (!assetId) {
      throw new StorageValidationError('Asset ID is required', { assetId })
    }

    const provider = this.getProvider(options.provider)

    if (options.signed) {
      return provider.generateSignedUrl(assetId, {
        expiresIn: options.expiresIn || 3600000,
      })
    }

    return provider.generatePublicUrl(assetId, options)
  }

  async getAssetMetadata(assetId, options = {}) {
    if (!assetId) {
      throw new StorageValidationError('Asset ID is required', { assetId })
    }

    const provider = this.getProvider(options.provider)
    return provider.getMetadata(assetId, options)
  }

  async copyAsset(assetId, destPath, options = {}) {
    if (!assetId || !destPath) {
      throw new StorageValidationError('Asset ID and destination path are required', { assetId, destPath })
    }

    const provider = this.getProvider(options.provider)
    return provider.copy(assetId, destPath, options)
  }

  async moveAsset(assetId, destPath, options = {}) {
    if (!assetId || !destPath) {
      throw new StorageValidationError('Asset ID and destination path are required', { assetId, destPath })
    }

    const provider = this.getProvider(options.provider)
    return provider.move(assetId, destPath, options)
  }

  async listAssets(prefix, options = {}) {
    const provider = this.getProvider(options.provider)
    return provider.list(prefix, options)
  }

  async assetExists(assetId, options = {}) {
    if (!assetId) {
      throw new StorageValidationError('Asset ID is required', { assetId })
    }

    const provider = this.getProvider(options.provider)
    return provider.exists(assetId)
  }

  async healthCheck(providerType = null) {
    const type = providerType || this.defaultProvider
    const provider = this.providers.get(type)

    if (!provider) {
      return { healthy: false, error: `Provider not found: ${type}` }
    }

    return provider.health()
  }

  async createFolder(folderPath, options = {}) {
    if (!folderPath) {
      throw new StorageValidationError('Folder path is required', { folderPath })
    }

    const provider = this.getProvider(options.provider)
    return provider.createFolder(folderPath, options)
  }

  async deleteFolder(folderPath, options = {}) {
    if (!folderPath) {
      throw new StorageValidationError('Folder path is required', { folderPath })
    }

    const provider = this.getProvider(options.provider)
    return provider.deleteFolder(folderPath, options)
  }

  async setAssetMetadata(assetId, metadata, options = {}) {
    if (!assetId) {
      throw new StorageValidationError('Asset ID is required', { assetId })
    }

    if (!metadata) {
      throw new StorageValidationError('Metadata is required', { metadata })
    }

    const provider = this.getProvider(options.provider)
    return provider.setMetadata(assetId, metadata, options)
  }

  async streamAsset(assetId, options = {}) {
    if (!assetId) {
      throw new StorageValidationError('Asset ID is required', { assetId })
    }

    const provider = this.getProvider(options.provider)
    return provider.stream(assetId, options)
  }

  async getAssetChecksum(assetId, options = {}) {
    if (!assetId) {
      throw new StorageValidationError('Asset ID is required', { assetId })
    }

    const provider = this.getProvider(options.provider)
    return provider.getChecksum(assetId, options)
  }

  validateAssetData(assetData) {
    if (!assetData) {
      throw new StorageValidationError('Asset data is required', { assetData })
    }

    if (!assetData.fileName) {
      throw new StorageValidationError('File name is required', { assetData })
    }

    if (!assetData.buffer && !assetData.path) {
      throw new StorageValidationError('Buffer or path is required', { assetData })
    }

    if (this.config.maxFileSize && assetData.buffer?.length > this.config.maxFileSize) {
      throw new StorageValidationError(
        `File size exceeds maximum: ${assetData.buffer.length} > ${this.config.maxFileSize}`,
        { maxSize: this.config.maxFileSize, actualSize: assetData.buffer?.length }
      )
    }

    const allowedTypes = this.config.allowedMimeTypes
    if (allowedTypes && assetData.mimeType && !allowedTypes.includes(assetData.mimeType)) {
      throw new StorageValidationError(
        `MIME type not allowed: ${assetData.mimeType}`,
        { allowedTypes, actualType: assetData.mimeType }
      )
    }

    return true
  }

  static getProviderTypes() {
    return {
      LOCAL: STORAGE_PROVIDER_TYPES.LOCAL,
      S3: STORAGE_PROVIDER_TYPES.S3,
      R2: STORAGE_PROVIDER_TYPES.R2,
      AZURE: STORAGE_PROVIDER_TYPES.AZURE,
      GCS: STORAGE_PROVIDER_TYPES.GCS,
    }
  }
}

export default StorageService
