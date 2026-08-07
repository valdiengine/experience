/**
 * Media Manager
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Orchestrates media operations for the capability layer.
 * Business logic lives here, not in the engine.
 */

import { MediaEngine } from '../../media/media.engine.js'
import { MediaError, MediaValidationError, MediaNotFoundError } from '../../media/media.errors.js'

export class MediaManager {
  constructor(context) {
    this.context = context
    this.mediaEngine = new MediaEngine(context.config?.media || {})
    this.repository = context.repositories?.media
  }

  async initialize() {
    if (this.context.storage) {
      this.mediaEngine.setStorage(this.context.storage)
    }

    if (this.context.eventBus) {
      this.mediaEngine.setEventBus(this.context.eventBus)
    }

    if (this.repository) {
      this.mediaEngine.setRepository(this.repository)
    }
  }

  async upload(assetData, options = {}) {
    this.validateUpload(assetData)

    const tenantId = this.context.tenant?.id
    if (!tenantId) {
      throw new MediaValidationError('Tenant context required for media operations')
    }

    const result = await this.mediaEngine.process(
      { ...assetData, tenantId },
      {
        ...options,
        context: {
          tenantId,
          destinationId: this.context.tenant?.destinationId,
          companyId: this.context.tenant?.companyId,
          userId: this.context.user?.id,
        },
      }
    )

    return result
  }

  async uploadAsync(assetData, options = {}) {
    this.validateUpload(assetData)

    const tenantId = this.context.tenant?.id
    if (!tenantId) {
      throw new MediaValidationError('Tenant context required for media operations')
    }

    return this.mediaEngine.processAsync({ ...assetData, tenantId }, options)
  }

  async get(mediaId, options = {}) {
    const media = await this.repository?.findById(mediaId)

    if (!media) {
      throw new MediaNotFoundError(mediaId)
    }

    this.validateAccess(media, 'read')

    return media
  }

  async getByAssetId(assetId, options = {}) {
    const media = await this.repository?.findByAssetId(assetId)

    if (!media) {
      throw new MediaNotFoundError(assetId, { assetId })
    }

    this.validateAccess(media, 'read')

    return media
  }

  async list(filter = {}, options = {}) {
    const { type, category, status, tenantId } = filter

    const queryFilter = {
      ...(type && { type }),
      ...(category && { category }),
      ...(status && { status }),
      tenantId: tenantId || this.context.tenant?.id,
    }

    return this.repository?.findMany(queryFilter, options) || []
  }

  async delete(mediaId, options = {}) {
    const media = await this.get(mediaId)

    this.validateAccess(media, 'delete')

    return this.mediaEngine.deleteMedia(mediaId, options)
  }

  async getUrl(mediaId, options = {}) {
    const media = await this.get(mediaId, options)

    if (options.variant) {
      const variant = media.variants?.find((v) => v.variantName === options.variant)
      return variant?.cdnUrl || variant?.url || media.cdnUrl || media.url
    }

    return media.cdnUrl || media.url
  }

  async getSignedUrl(mediaId, options = {}) {
    const media = await this.get(mediaId, options)

    if (this.mediaEngine.cdnLayer) {
      return this.mediaEngine.cdnLayer.getUrl(media.url, { signed: true, ...options })
    }

    return media.url
  }

  async getMetadata(mediaId, options = {}) {
    const media = await this.get(mediaId, options)
    return media.metadata || {}
  }

  async updateMetadata(mediaId, metadata, options = {}) {
    const media = await this.get(mediaId)

    this.validateAccess(media, 'write')

    const updated = await this.repository?.update(mediaId, { metadata })

    if (this.context.eventBus) {
      this.context.eventBus.emit('media.metadata.updated', {
        mediaId,
        metadata,
        updatedBy: this.context.user?.id,
      })
    }

    return updated
  }

  async processVariants(mediaId, options = {}) {
    const media = await this.get(mediaId)

    this.validateAccess(media, 'write')

    return this.mediaEngine.processVariants(mediaId, options)
  }

  async getJob(jobId, options = {}) {
    return this.mediaEngine.queue?.getJob(jobId)
  }

  async cancelJob(jobId, options = {}) {
    return this.mediaEngine.queue?.cancelJob(jobId)
  }

  validateUpload(assetData) {
    if (!assetData.buffer && !assetData.url) {
      throw new MediaValidationError('Buffer or URL is required for upload')
    }

    if (!assetData.fileName) {
      throw new MediaValidationError('File name is required for upload')
    }

    if (!assetData.mimeType) {
      throw new MediaValidationError('MIME type is required for upload')
    }

    const allowedTypes = this.context.config?.media?.allowedMimeTypes
    if (allowedTypes && !allowedTypes.includes(assetData.mimeType)) {
      throw new MediaValidationError(`MIME type not allowed: ${assetData.mimeType}`)
    }

    const maxSize = this.context.config?.media?.maxFileSize || 100 * 1024 * 1024
    if (assetData.buffer && assetData.buffer.length > maxSize) {
      throw new MediaValidationError(`File size exceeds maximum: ${assetData.buffer.length} > ${maxSize}`)
    }
  }

  validateAccess(media, operation) {
    const tenantId = this.context.tenant?.id

    if (media.tenantId !== tenantId) {
      throw new MediaError('Access denied: media belongs to different tenant')
    }

    return true
  }

  async healthCheck() {
    return this.mediaEngine.healthCheck()
  }
}

export default MediaManager
