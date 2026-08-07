/**
 * Media Variant Generator
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Generates responsive image variants from original media.
 */

import { ImageProcessor } from '../processors/image.processor.js'
import { MediaVariantError } from '../media.errors.js'

export class MediaVariantGenerator {
  constructor(config = {}) {
    this.config = config
    this.imageProcessor = new ImageProcessor()
  }

  async generate(media, variantConfig = null) {
    const config = variantConfig || this.getDefaultVariants()

    if (media.mimeType?.startsWith('image/')) {
      return this.generateImageVariants(media, config)
    }

    return []
  }

  async generateImageVariants(media, config) {
    const variants = []
    const { buffer, mimeType } = media

    for (const [variantName, options] of Object.entries(config)) {
      if (!options || options.enabled === false) continue
      if (variantName === 'original' && !options.width) continue

      try {
        const resized = await this.imageProcessor.resize(buffer, {
          width: options.width,
          height: options.height,
          fit: options.fit || 'inside',
        })

        const quality = options.quality || 85
        let finalBuffer = resized

        if (mimeType === 'image/jpeg') {
          finalBuffer = await this.imageProcessor.compressJpeg(resized, quality)
        } else if (mimeType === 'image/png') {
          finalBuffer = await this.imageProcessor.compressPng(resized)
        }

        const metadata = await this.imageProcessor.extractMetadata(finalBuffer, `image/${options.format || 'jpeg'}`)

        variants.push({
          variantName,
          buffer: finalBuffer,
          mimeType: `image/${options.format || 'jpeg'}`,
          width: metadata.width,
          height: metadata.height,
          quality: options.quality,
          size: finalBuffer.length,
          settings: options,
        })
      } catch (error) {
        console.error(`[VariantGenerator] Failed to generate ${variantName}:`, error.message)
      }
    }

    return variants
  }

  getDefaultVariants() {
    return {
      original: { width: null, quality: 100 },
      large: { width: 1920, quality: 90, format: 'jpeg' },
      medium: { width: 1280, quality: 85, format: 'jpeg' },
      small: { width: 640, quality: 80, format: 'jpeg' },
      thumbnail: { width: 256, quality: 75, format: 'jpeg' },
      retina: { width: 3840, quality: 85, format: 'jpeg' },
      mobile: { width: 375, quality: 80, format: 'jpeg' },
      preview: { width: 64, quality: 60, format: 'jpeg' },
    }
  }

  async generateWebpVariants(media, config) {
    const webpConfig = {}

    for (const [name, variant] of Object.entries(config)) {
      webpConfig[`${name}_webp`] = {
        ...variant,
        format: 'webp',
      }
    }

    return this.generateImageVariants(media, webpConfig)
  }

  async generateAvifVariants(media, config) {
    const avifConfig = {}

    for (const [name, variant] of Object.entries(config)) {
      avifConfig[`${name}_avif`] = {
        ...variant,
        format: 'avif',
      }
    }

    return this.generateImageVariants(media, avifConfig)
  }

  getVariantFileName(originalName, variantName, format = 'jpeg') {
    const baseName = originalName.replace(/\.[^.]+$/, '')
    return `${baseName}_${variantName}.${format}`
  }

  healthCheck() {
    return {
      generator: 'variant',
      configured: true,
      variants: Object.keys(this.getDefaultVariants()).length,
    }
  }
}

export default MediaVariantGenerator
