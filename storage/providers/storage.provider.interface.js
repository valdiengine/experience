/**
 * Storage Provider Interface
 *
 * P12.3.2.1 — Storage Provider Interface Implementation
 *
 * Abstract contract that all storage providers must implement.
 * ALL providers MUST expose exactly the same public API.
 *
 * Provider-specific code must remain private.
 */

export const STORAGE_PROVIDER_TYPES = {
  LOCAL: 'local',
  S3: 's3',
  R2: 'r2',
  AZURE: 'azure',
  GCS: 'gcs',
}

export const ASSET_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  ARCHIVE: 'archive',
  OTHER: 'other',
}

export const ASSET_ACCESS = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  COMPANY: 'company',
  USER: 'user',
}

export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

export const STORAGE_REGIONS = {
  US: 'us',
  EU: 'eu',
  SA: 'sa',
  AP: 'ap',
}

export class StorageProviderInterface {
  constructor(config = {}) {
    this.config = config
    this.type = null
    this.initialized = false
  }

  async initialize() {
    throw new Error('Provider must implement initialize()')
  }

  async health() {
    throw new Error('Provider must implement health()')
  }

  async upload(assetData, options = {}) {
    throw new Error('Provider must implement upload()')
  }

  async download(assetId, options = {}) {
    throw new Error('Provider must implement download()')
  }

  async stream(assetId, options = {}) {
    throw new Error('Provider must implement stream()')
  }

  async delete(assetId, options = {}) {
    throw new Error('Provider must implement delete()')
  }

  async exists(assetId) {
    throw new Error('Provider must implement exists()')
  }

  async move(assetId, destPath, options = {}) {
    throw new Error('Provider must implement move()')
  }

  async copy(assetId, destPath, options = {}) {
    throw new Error('Provider must implement copy()')
  }

  async list(prefix, options = {}) {
    throw new Error('Provider must implement list()')
  }

  async createFolder(folderPath, options = {}) {
    throw new Error('Provider must implement createFolder()')
  }

  async deleteFolder(folderPath, options = {}) {
    throw new Error('Provider must implement deleteFolder()')
  }

  generatePublicUrl(assetId, options = {}) {
    throw new Error('Provider must implement generatePublicUrl()')
  }

  async generateSignedUrl(assetId, options = {}) {
    throw new Error('Provider must implement generateSignedUrl()')
  }

  async getMetadata(assetId) {
    throw new Error('Provider must implement getMetadata()')
  }

  async setMetadata(assetId, metadata) {
    throw new Error('Provider must implement setMetadata()')
  }

  async getChecksum(assetId, options = {}) {
    throw new Error('Provider must implement getChecksum()')
  }
}

export default StorageProviderInterface
