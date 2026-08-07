/**
 * Storage Adapter
 *
 * P12.3.2.0.2 — Storage Capability Boundary Implementation
 *
 * Adapter that wraps StorageManager for capability context.
 * This is what capabilities and business layer use to interact with storage.
 */

import { StorageManager } from './storage.manager.js'

export class StorageAdapter {
  constructor(context) {
    this.context = context
    this.manager = new StorageManager(context)
  }

  async upload(assetData, options = {}) {
    return this.manager.uploadAsset(assetData, options)
  }

  async download(assetId, options = {}) {
    return this.manager.downloadAsset(assetId, options)
  }

  async delete(assetId, options = {}) {
    return this.manager.deleteAsset(assetId, options)
  }

  async getUrl(assetId, options = {}) {
    return this.manager.getAssetUrl(assetId, options)
  }

  async getMetadata(assetId, options = {}) {
    return this.manager.getAssetMetadata(assetId, options)
  }

  async list(filter = {}, options = {}) {
    return this.manager.listAssets(filter, options)
  }

  async copy(assetId, destPath, options = {}) {
    return this.manager.copyAsset(assetId, destPath, options)
  }

  async move(assetId, destPath, options = {}) {
    return this.manager.moveAsset(assetId, destPath, options)
  }

  async healthCheck() {
    return this.manager.healthCheck()
  }
}

export default StorageAdapter
