/**
 * Storage Manager
 *
 * P12.3.2.0.2 — Storage Capability Boundary Implementation
 *
 * Orchestrates storage operations for the capability layer.
 * Business logic lives here, not in the service.
 */

import { StorageService } from '../../storage/index.js'
import { StorageError, StorageValidationError } from '../../storage/storage.errors.js'

export class StorageManager {
  constructor(context) {
    this.context = context
    this.storageService = new StorageService(context.config?.storage || {})
  }

  async uploadAsset(assetData, options = {}) {
    this.validateOwnership(assetData)

    const result = await this.storageService.uploadAsset(assetData, {
      ...options,
      tenantId: this.context.tenant?.id,
      destinationId: this.context.tenant?.destinationId,
    })

    return result
  }

  async downloadAsset(assetId, options = {}) {
    const asset = await this.getAsset(assetId)

    this.validateAccess(asset, 'read')

    return this.storageService.downloadAsset(assetId, options)
  }

  async deleteAsset(assetId, options = {}) {
    const asset = await this.getAsset(assetId)

    this.validateOwnership(asset)
    this.validateAccess(asset, 'delete')

    return this.storageService.deleteAsset(assetId, options)
  }

  async getAssetUrl(assetId, options = {}) {
    const asset = await this.getAsset(assetId)

    this.validateAccess(asset, 'read')

    return this.storageService.getAssetUrl(assetId, options)
  }

  async getAssetMetadata(assetId, options = {}) {
    const asset = await this.getAsset(assetId)

    this.validateAccess(asset, 'read')

    return this.storageService.getAssetMetadata(assetId, options)
  }

  async listAssets(filter = {}, options = {}) {
    const { type, access, companyId, userId, prefix } = filter

    return this.storageService.listAssets(prefix || this.buildPrefix(filter), {
      ...options,
      type,
      access,
    })
  }

  async copyAsset(assetId, destPath, options = {}) {
    const asset = await this.getAsset(assetId)

    this.validateAccess(asset, 'read')

    return this.storageService.copyAsset(assetId, destPath, options)
  }

  async moveAsset(assetId, destPath, options = {}) {
    const asset = await this.getAsset(assetId)

    this.validateOwnership(asset)
    this.validateAccess(asset, 'write')

    return this.storageService.moveAsset(assetId, destPath, options)
  }

  async getAsset(assetId) {
    const repository = this.context.repositories?.storage
    if (!repository) {
      throw new StorageError('Storage repository not available in context')
    }

    const asset = await repository.findById(assetId)
    if (!asset) {
      throw new StorageValidationError(`Asset not found: ${assetId}`, { assetId })
    }

    return asset
  }

  validateOwnership(assetData) {
    const tenantId = this.context.tenant?.id

    if (!tenantId) {
      throw new StorageValidationError('Tenant context required for storage operations')
    }

    if (assetData.tenantId && assetData.tenantId !== tenantId) {
      throw new StorageValidationError('Cannot upload asset for different tenant')
    }

    return true
  }

  validateAccess(asset, operation) {
    const tenantId = this.context.tenant?.id
    const userId = this.context.user?.id
    const roles = this.context.user?.roles || []

    if (asset.tenantId !== tenantId) {
      throw new StorageError('Asset belongs to different tenant')
    }

    if (asset.access === 'user' && asset.userId !== userId) {
      const isAdmin = roles.includes('admin') || roles.includes('storage_admin')
      if (!isAdmin) {
        throw new StorageError('Access denied: asset is private')
      }
    }

    return true
  }

  buildPrefix(filter) {
    const parts = []

    if (filter.companyId) {
      parts.push(`companies/${filter.companyId}`)
    } else if (filter.userId) {
      parts.push(`users/${filter.userId}`)
    }

    if (filter.type) {
      parts.push(filter.type)
    }

    return parts.join('/')
  }

  async healthCheck() {
    return this.storageService.healthCheck()
  }
}

export default StorageManager
