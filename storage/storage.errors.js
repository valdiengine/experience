/**
 * Storage Errors
 *
 * P12.3.2.0 — Storage Architecture Definition
 *
 * Defines all storage-related error types.
 */

export class StorageError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'StorageError'
    this.category = 'storage'
    this.context = context
  }
}

export class StorageProviderError extends StorageError {
  constructor(message, provider, context = {}) {
    super(message, { provider, ...context })
    this.name = 'StorageProviderError'
    this.provider = provider
  }
}

export class StorageNotFoundError extends StorageError {
  constructor(assetId, context = {}) {
    super(`Asset not found: ${assetId}`, { assetId, ...context })
    this.name = 'StorageNotFoundError'
    this.assetId = assetId
  }
}

export class StorageAccessDeniedError extends StorageError {
  constructor(assetId, operation, identity, context = {}) {
    super(`Access denied for asset ${assetId}: ${operation}`, { assetId, operation, identity, ...context })
    this.name = 'StorageAccessDeniedError'
    this.assetId = assetId
    this.operation = operation
  }
}

export class StorageValidationError extends StorageError {
  constructor(message, validation, context = {}) {
    super(message, { validation, ...context })
    this.name = 'StorageValidationError'
    this.validation = validation
  }
}

export class StorageQuotaExceededError extends StorageError {
  constructor(quotaType, current, limit, context = {}) {
    super(`Quota exceeded: ${quotaType} (${current}/${limit})`, { quotaType, current, limit, ...context })
    this.name = 'StorageQuotaExceededError'
    this.quotaType = quotaType
    this.current = current
    this.limit = limit
  }
}

export class StorageUploadError extends StorageError {
  constructor(message, fileName, context = {}) {
    super(`Upload failed: ${message}`, { fileName, ...context })
    this.name = 'StorageUploadError'
    this.fileName = fileName
  }
}

export class StorageProcessingError extends StorageError {
  constructor(assetId, operation, context = {}) {
    super(`Processing failed for asset ${assetId}: ${operation}`, { assetId, operation, ...context })
    this.name = 'StorageProcessingError'
    this.assetId = assetId
    this.operation = operation
  }
}

export class StorageConfigurationError extends StorageError {
  constructor(message, provider, context = {}) {
    super(`Configuration error: ${message}`, { provider, ...context })
    this.name = 'StorageConfigurationError'
    this.provider = provider
  }
}

export default {
  StorageError,
  StorageProviderError,
  StorageNotFoundError,
  StorageAccessDeniedError,
  StorageValidationError,
  StorageQuotaExceededError,
  StorageUploadError,
  StorageProcessingError,
  StorageConfigurationError,
}
