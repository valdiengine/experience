/**
 * Media Pipeline
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Configurable processing pipeline with optional stages.
 * Each stage can be enabled/disabled via configuration.
 */

import { MediaPipelineError } from '../media.errors.js'
import { ImageProcessor } from '../processors/image.processor.js'
import { VideoProcessor } from '../processors/video.processor.js'
import { DocumentProcessor } from '../processors/document.processor.js'
import { AudioProcessor } from '../processors/audio.processor.js'

export class MediaPipeline {
  constructor(config = {}) {
    this.config = config
    this.imageProcessor = new ImageProcessor()
    this.videoProcessor = new VideoProcessor()
    this.documentProcessor = new DocumentProcessor()
    this.audioProcessor = new AudioProcessor()
    this.stages = this.buildStages(config)
  }

  buildStages(config) {
    return [
      { name: 'validation', enabled: config.validation?.enabled !== false, handler: this.validationStage.bind(this) },
      { name: 'metadataExtraction', enabled: config.metadataExtraction?.enabled !== false, handler: this.metadataStage.bind(this) },
      { name: 'orientationFix', enabled: config.orientationFix?.enabled !== false, handler: this.orientationStage.bind(this) },
      { name: 'resize', enabled: config.resize?.enabled !== false, handler: this.resizeStage.bind(this) },
      { name: 'compression', enabled: config.compression?.enabled !== false, handler: this.compressionStage.bind(this) },
      { name: 'formatConversion', enabled: config.formatConversion?.enabled !== false, handler: this.formatStage.bind(this) },
      { name: 'watermark', enabled: config.watermark?.enabled === true, handler: this.watermarkStage.bind(this) },
      { name: 'thumbnail', enabled: config.thumbnail?.enabled !== false, handler: this.thumbnailStage.bind(this) },
      { name: 'storage', enabled: config.storage?.enabled !== false, handler: this.storageStage.bind(this) },
      { name: 'cdn', enabled: config.cdn?.enabled !== false, handler: this.cdnStage.bind(this) },
      { name: 'database', enabled: config.database?.enabled !== false, handler: this.databaseStage.bind(this) },
      { name: 'events', enabled: config.events?.enabled !== false, handler: this.eventsStage.bind(this) },
    ].filter((stage) => stage.enabled)
  }

  async execute(assetData, options = {}) {
    const { buffer, fileName, mimeType, context = {} } = assetData
    const pipelineContext = {
      ...context,
      originalBuffer: buffer,
      originalMimeType: mimeType,
      originalFileName: fileName,
      processedBuffer: buffer,
      processedMimeType: mimeType,
      metadata: {},
      variants: [],
      errors: [],
      startTime: Date.now(),
    }

    for (const stage of this.stages) {
      try {
        const result = await stage.handler(pipelineContext, options)
        if (result) {
          Object.assign(pipelineContext, result)
        }
      } catch (error) {
        pipelineContext.errors.push({ stage: stage.name, error: error.message })
        if (!options.continueOnError) {
          throw new MediaPipelineError(`Pipeline failed at stage: ${stage.name}`, stage.name, {
            originalError: error.message,
          })
        }
      }
    }

    pipelineContext.processingTime = Date.now() - pipelineContext.startTime

    return this.buildResult(pipelineContext)
  }

  buildResult(context) {
    return {
      success: context.errors.length === 0,
      mediaId: context.mediaId,
      assetId: context.assetId,
      url: context.url,
      cdnUrl: context.cdnUrl,
      mimeType: context.processedMimeType,
      metadata: context.metadata,
      variants: context.variants,
      processingTime: context.processingTime,
      errors: context.errors,
    }
  }

  async validationStage(context, options) {
    const { buffer, mimeType, originalFileName } = context

    if (!buffer || buffer.length === 0) {
      throw new MediaPipelineError('Empty buffer', 'validation')
    }

    const maxSize = this.config.validation?.maxSize || 100 * 1024 * 1024
    if (buffer.length > maxSize) {
      throw new MediaPipelineError(`File size exceeds maximum: ${buffer.length} > ${maxSize}`, 'validation')
    }

    const typeCategory = this.getMimeCategory(mimeType)
    if (typeCategory === 'unknown') {
      throw new MediaPipelineError(`Unsupported MIME type: ${mimeType}`, 'validation')
    }

    return { typeCategory }
  }

  async metadataStage(context, options) {
    const { processedBuffer, processedMimeType } = context
    const typeCategory = context.typeCategory || this.getMimeCategory(processedMimeType)

    let metadata = {}

    switch (typeCategory) {
      case 'image':
        metadata = await this.imageProcessor.extractMetadata(processedBuffer, processedMimeType)
        break
      case 'video':
        metadata = await this.videoProcessor.extractMetadata(processedBuffer, processedMimeType)
        break
      case 'audio':
        metadata = await this.audioProcessor.extractMetadata(processedBuffer, processedMimeType)
        break
      case 'document':
        metadata = await this.documentProcessor.extractMetadata(processedBuffer, processedMimeType)
        break
    }

    return { metadata }
  }

  async orientationStage(context, options) {
    if (context.typeCategory !== 'image') return {}

    const { processedBuffer, processedMimeType, metadata } = context

    if (!metadata.orientation || metadata.orientation === 1) return {}

    const rotated = await this.imageProcessor.autoOrient(processedBuffer, metadata.orientation)

    return { processedBuffer: rotated }
  }

  async resizeStage(context, options) {
    if (context.typeCategory !== 'image') return {}
    if (!options.resize) return {}

    const { processedBuffer } = context
    const { width, height, fit } = options.resize

    if (!width && !height) return {}

    const resized = await this.imageProcessor.resize(processedBuffer, { width, height, fit: fit || 'inside' })

    return { processedBuffer: resized }
  }

  async compressionStage(context, options) {
    if (context.typeCategory !== 'image') return {}

    const { processedBuffer, processedMimeType } = context
    const quality = options.quality || this.config.compression?.quality || 85

    if (processedMimeType === 'image/png') {
      const compressed = await this.imageProcessor.compressPng(processedBuffer)
      return { processedBuffer: compressed }
    }

    if (processedMimeType === 'image/jpeg' || processedMimeType === 'image/webp') {
      const compressed = await this.imageProcessor.compressJpeg(processedBuffer, quality)
      return { processedBuffer: compressed }
    }

    return {}
  }

  async formatStage(context, options) {
    const targetFormat = options.format || this.config.formatConversion?.defaultFormat
    if (!targetFormat) return {}

    const { processedBuffer, processedMimeType, typeCategory } = context

    if (typeCategory === 'image') {
      const converted = await this.imageProcessor.convertFormat(processedBuffer, targetFormat)
      return {
        processedBuffer: converted,
        processedMimeType: `image/${targetFormat}`,
      }
    }

    return {}
  }

  async watermarkStage(context, options) {
    if (context.typeCategory !== 'image') return {}

    const { processedBuffer } = context
    const watermarkConfig = options.watermark || this.config.watermark

    if (!watermarkConfig || !watermarkConfig.text) return {}

    const watermarked = await this.imageProcessor.addWatermark(processedBuffer, watermarkConfig)

    return { processedBuffer: watermarked }
  }

  async thumbnailStage(context, options) {
    if (context.typeCategory !== 'image') return {}
    if (!this.config.thumbnail?.enabled) return {}

    const { processedBuffer, originalFileName } = context
    const sizes = options.sizes || this.config.thumbnail?.sizes || [64, 128, 256]

    const variants = []

    for (const size of sizes) {
      const thumbnail = await this.imageProcessor.resize(processedBuffer, {
        width: size,
        height: size,
        fit: 'cover',
      })

      const variantName = `thumbnail_${size}`

      variants.push({
        variantName,
        buffer: thumbnail,
        mimeType: 'image/jpeg',
        fileName: this.getVariantFileName(originalFileName, variantName),
        width: size,
        height: size,
      })
    }

    return { variants }
  }

  async storageStage(context, options) {
    const { processedBuffer, originalFileName, processedMimeType, metadata, tenantId } = context

    if (!this.storage) {
      throw new MediaPipelineError('Storage not configured', 'storage')
    }

    const result = await this.storage.uploadAsset({
      buffer: processedBuffer,
      fileName: originalFileName,
      mimeType: processedMimeType,
      metadata: { ...metadata, tenantId },
    })

    return {
      assetId: result.assetId,
      url: result.url,
    }
  }

  async cdnStage(context, options) {
    if (!this.cdnLayer || !this.config.cdn?.enabled) return {}

    const { url, assetId } = context

    if (this.cdnLayer.isConfigured()) {
      const cdnUrl = await this.cdnLayer.getUrl(url, options)
      return { cdnUrl }
    }

    return { cdnUrl: url }
  }

  async databaseStage(context, options) {
    if (!this.repository) return {}

    const { assetId, url, cdnUrl, mimeType, metadata, variants, tenantId } = context

    const media = await this.repository.create({
      tenantId,
      assetId,
      url,
      cdnUrl,
      mimeType,
      metadata,
      status: 'processed',
    })

    if (variants.length > 0) {
      for (const variant of variants) {
        await this.repository.createVariant({
          mediaId: media.id,
          ...variant,
        })
      }
    }

    return { mediaId: media.id }
  }

  async eventsStage(context, options) {
    return {}
  }

  getMimeCategory(mimeType) {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType === 'application/pdf') return 'document'
    return 'unknown'
  }

  getVariantFileName(originalName, variantName) {
    const ext = originalName.split('.').pop()
    const base = originalName.replace(`.${ext}`, '')
    return `${base}_${variantName}.${ext}`
  }

  setStorage(storage) {
    this.storage = storage
  }

  setCDN(cdnLayer) {
    this.cdnLayer = cdnLayer
  }

  setRepository(repository) {
    this.repository = repository
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus
  }

  healthCheck() {
    return {
      stages: this.stages.length,
      configured: true,
    }
  }
}

export default MediaPipeline
