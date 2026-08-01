/**
 * Media Optimizer — Image processing and storage management
 */
export class MediaOptimizer {
  #context = null

  constructor(context) {
    this.#context = context
  }

  async optimizeImage(file, options = {}) {
    const result = {
      original: { size: file.size, name: file.name },
      optimized: null,
      thumbnail: null,
    }

    try {
      const optimized = await this.#compressImage(file, {
        maxWidth: options.maxWidth || 1200,
        quality: options.quality || 0.85,
        format: 'webp',
      })
      result.optimized = optimized

      const thumbnail = await this.#compressImage(file, {
        maxWidth: options.thumbnailSize || 300,
        quality: 0.8,
        format: 'webp',
      })
      result.thumbnail = thumbnail

      this.#emitEvent('media:optimized', {
        originalSize: file.size,
        optimizedSize: optimized.size,
        thumbnailSize: thumbnail.size,
        compression: Math.round((1 - optimized.size / file.size) * 100),
      })
    } catch (error) {
      result.error = error.message
    }

    return result
  }

  getStorageVersions() {
    return {
      original: 'restricted',
      optimized: 'public',
      thumbnail: 'gallery',
    }
  }

  async #compressImage(file, options) {
    return {
      size: Math.floor(file.size * (options.quality || 0.85)),
      name: file.name.replace(/\.[^.]+$/, '.' + (options.format || 'webp')),
      format: options.format || 'webp',
      width: options.maxWidth,
    }
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
