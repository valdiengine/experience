/**
 * Media Errors
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Defines all media-related error types.
 */

export class MediaError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'MediaError'
    this.category = 'media'
    this.context = context
  }
}

export class MediaProcessingError extends MediaError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'MediaProcessingError'
    this.processingError = true
  }
}

export class MediaValidationError extends MediaError {
  constructor(message, validation = {}, context = {}) {
    super(message, { validation, ...context })
    this.name = 'MediaValidationError'
    this.validation = validation
  }
}

export class MediaNotFoundError extends MediaError {
  constructor(mediaId, context = {}) {
    super(`Media not found: ${mediaId}`, { mediaId, ...context })
    this.name = 'MediaNotFoundError'
    this.mediaId = mediaId
  }
}

export class MediaFormatError extends MediaError {
  constructor(message, format, context = {}) {
    super(message, { format, ...context })
    this.name = 'MediaFormatError'
    this.format = format
  }
}

export class MediaSizeError extends MediaError {
  constructor(message, size, limit, context = {}) {
    super(message, { size, limit, ...context })
    this.name = 'MediaSizeError'
    this.size = size
    this.limit = limit
  }
}

export class MediaVariantError extends MediaError {
  constructor(message, variant, context = {}) {
    super(message, { variant, ...context })
    this.name = 'MediaVariantError'
    this.variant = variant
  }
}

export class MediaCDNError extends MediaError {
  constructor(message, cdn, context = {}) {
    super(message, { cdn, ...context })
    this.name = 'MediaCDNError'
    this.cdn = cdn
  }
}

export class MediaQueueError extends MediaError {
  constructor(message, job, context = {}) {
    super(message, { job, ...context })
    this.name = 'MediaQueueError'
    this.job = job
  }
}

export class MediaMetadataError extends MediaError {
  constructor(message, metadata, context = {}) {
    super(message, { metadata, ...context })
    this.name = 'MediaMetadataError'
    this.metadata = metadata
  }
}

export class MediaPipelineError extends MediaError {
  constructor(message, step, context = {}) {
    super(message, { step, ...context })
    this.name = 'MediaPipelineError'
    this.step = step
  }
}

export default {
  MediaError,
  MediaProcessingError,
  MediaValidationError,
  MediaNotFoundError,
  MediaFormatError,
  MediaSizeError,
  MediaVariantError,
  MediaCDNError,
  MediaQueueError,
  MediaMetadataError,
  MediaPipelineError,
}
