/**
 * Storage Index
 *
 * P12.3.2.0 — Storage Architecture Definition
 *
 * Public API for the Storage layer.
 */

export { StorageService } from './storage.service.js'
export { StorageProviderInterface, STORAGE_PROVIDER_TYPES, ASSET_TYPES, ASSET_ACCESS, PROCESSING_STATUS } from './providers/storage.provider.interface.js'
export { LocalStorageProvider } from './providers/local.provider.js'
export { S3StorageProvider } from './providers/s3.provider.js'
export { R2StorageProvider } from './providers/r2.provider.js'
export {
  StorageError,
  StorageProviderError,
  StorageNotFoundError,
  StorageAccessDeniedError,
  StorageValidationError,
  StorageQuotaExceededError,
  StorageUploadError,
  StorageProcessingError,
  StorageConfigurationError,
} from './storage.errors.js'

export default {
  StorageService,
}
