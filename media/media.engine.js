/**
 * Media Engine
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Core orchestration engine for media processing.
 * Coordinates processing pipeline, storage, and CDN.
 *
 * Architecture:
 * MediaManager → MediaEngine → ProcessingPipeline → StoragePlatform → CDN
 */

import { MediaPipeline } from './pipeline/media.pipeline.js'
import { MediaMetadataEngine } from './engine/metadata.engine.js'
import { MediaVariantGenerator } from './responsive/variant.generator.js'
import { MediaCDNLayer } from './cdn/cdn.layer.js'
import { MediaQueue } from './queue/media.queue.js'
import { MEDIA_EVENTS, createMediaEvent } from './media.events.js'
import { MediaError, MediaProcessingError, MediaValidationError } from './media.errors.js'

export class MediaEngine {
  constructor(config = {}) {
    this.config = this.normalizeConfig(config)
    this.pipeline = new MediaPipeline(this.config.pipeline)
    this.metadataEngine = new MediaMetadataEngine()
    this.variantGenerator = new MediaVariantGenerator(this.config.variants)
    this.cdnLayer = new MediaCDNLayer(this.config.cdn)
    this.queue = new MediaQueue(this.config.queue)
    this.storage = null
  }

  normalizeConfig(config) {
    return {
      pipeline: config.pipeline || this.getDefaultPipelineConfig(),
      variants: config.variants || this.getDefaultVariants(),
      cdn: config.cdn || {},
      queue: config.queue || { enabled: false },
      processing: config.processing || {},
    }
  }

  getDefaultPipelineConfig() {
    return {
      validation: { enabled: true, maxSize: 100 * 1024 * 1024 },
      metadataExtraction: { enabled: true },
      orientationFix: { enabled: true },
      resize: { enabled: true },
      compression: { enabled: true, quality: 85 },
      formatConversion: { enabled: true },
      watermark: { enabled: false },
      thumbnail: { enabled: true, sizes: [64, 128, 256] },
      storage: { enabled: true },
      cdn: { enabled: true },
      database: { enabled: true },
      events: { enabled: true },
    }
  }

  getDefaultVariants() {
    return {
      original: { width: null, quality: 100 },
      large: { width: 1920, quality: 90 },
      medium: { width: 1280, quality: 85 },
      small: { width: 640, quality: 80 },
      thumbnail: { width: 256, quality: 75 },
      retina: { width: 3840, quality: 85 },
      mobile: { width: 375, quality: 80 },
      preview: { width: 64, quality: 60 },
    }
  }

  setStorage(storagePlatform) {
    this.storage = storagePlatform
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus
  }

  async process(assetData, options = {}) {
    const { buffer, fileName, mimeType, tenantId, context = {} } = assetData

    this.validateInput(buffer, fileName, mimeType)

    const processingContext = {
      ...context,
      tenantId,
      startTime: Date.now(),
      pipeline: options.pipeline || 'default',
    }

    try {
      this.emit(MEDIA_EVENTS.MEDIA_UPLOADED, { fileName, mimeType, tenantId })

      const result = await this.pipeline.execute(assetData, {
        ...options,
        context: processingContext,
        config: this.config.pipeline,
      })

      if (this.config.queue.enabled) {
        return this.queue.enqueue(result, options)
      }

      return result
    } catch (error) {
      this.emit(MEDIA_EVENTS.MEDIA_FAILED, {
        fileName,
        error: error.message,
        tenantId,
      })
      throw new MediaProcessingError(error.message, { fileName, tenantId })
    }
  }

  async processAsync(assetData, options = {}) {
    const job = await this.queue.enqueue(assetData, {
      ...options,
      context: {
        ...options.context,
        async: true,
      },
    })

    return {
      jobId: job.id,
      status: job.status,
    }
  }

  async processVariants(mediaId, options = {}) {
    const media = await this.getMedia(mediaId)
    if (!media) {
      throw new MediaValidationError('Media not found', { mediaId })
    }

    const variants = await this.variantGenerator.generate(media, this.config.variants)

    for (const variant of variants) {
      await this.storage.uploadAsset({
        buffer: variant.buffer,
        fileName: variant.fileName,
        mimeType: variant.mimeType,
        metadata: { ...variant.metadata, parentMediaId: mediaId },
      })
    }

    this.emit(MEDIA_EVENTS.MEDIA_VARIANTS_CREATED, {
      mediaId,
      variants: variants.map((v) => v.variantName),
    })

    return variants
  }

  async extractMetadata(buffer, mimeType) {
    return this.metadataEngine.extract(buffer, mimeType)
  }

  async getMedia(mediaId) {
    const repository = this.context?.repositories?.media
    if (!repository) {
      throw new MediaError('Media repository not available')
    }
    return repository.findById(mediaId)
  }

  async deleteMedia(mediaId, options = {}) {
    const media = await this.getMedia(mediaId)
    if (!media) {
      throw new MediaValidationError('Media not found', { mediaId })
    }

    if (media.variants) {
      for (const variant of media.variants) {
        await this.storage.deleteAsset(variant.assetId, options)
      }
    }

    await this.storage.deleteAsset(media.assetId, options)

    const repository = this.context?.repositories?.media
    if (repository) {
      await repository.delete(mediaId)
    }

    this.emit(MEDIA_EVENTS.MEDIA_DELETED, { mediaId, tenantId: media.tenantId })

    return { deleted: true, mediaId }
  }

  validateInput(buffer, fileName, mimeType) {
    if (!buffer) {
      throw new MediaValidationError('Buffer is required')
    }

    if (!fileName) {
      throw new MediaValidationError('File name is required')
    }

    if (!mimeType) {
      throw new MediaValidationError('MIME type is required')
    }

    const allowedTypes = this.config.processing.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf',
    ]

    const typeCategory = this.getMimeCategory(mimeType)
    if (!allowedTypes.includes(mimeType) && !allowedTypes.some((t) => t.endsWith('/*'))) {
      throw new MediaValidationError(`MIME type not allowed: ${mimeType}`, { mimeType })
    }

    const maxSize = this.config.processing.maxFileSize || 100 * 1024 * 1024
    if (buffer.length > maxSize) {
      throw new MediaValidationError(`File size exceeds maximum: ${buffer.length} > ${maxSize}`, {
        maxSize,
        actualSize: buffer.length,
      })
    }
  }

  getMimeCategory(mimeType) {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType === 'application/pdf') return 'document'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document'
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'document'
    return 'unknown'
  }

  emit(event, data) {
    if (this.eventBus && this.config.events.enabled) {
      this.eventBus.emit(event, createMediaEvent(event, data))
    }
  }

  async healthCheck() {
    return {
      engine: 'healthy',
      pipeline: this.pipeline.healthCheck(),
      metadata: this.metadataEngine.healthCheck(),
      variants: this.variantGenerator.healthCheck(),
      cdn: this.cdnLayer.healthCheck(),
      queue: this.queue.healthCheck(),
    }
  }

  static getMediaTypes() {
    return {
      IMAGE: 'image',
      VIDEO: 'video',
      AUDIO: 'audio',
      DOCUMENT: 'document',
    }
  }

  static getSupportedFormats() {
    return {
      image: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg'],
      video: ['mp4', 'webm', 'quicktime', 'avi', 'mkv'],
      audio: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
      document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
    }
  }
}

export default MediaEngine
