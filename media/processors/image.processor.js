/**
 * Image Processor
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Image processing operations using Sharp-like interface.
 * Actual Sharp integration happens at the provider level.
 * This processor defines the interface contract.
 */

export class ImageProcessor {
  constructor() {
    this.sharp = null
    this.sharpLoaded = false
  }

  async loadSharp() {
    if (this.sharpLoaded) return true

    try {
      this.sharp = await import('sharp')
      this.sharpLoaded = true
      return true
    } catch {
      console.warn('[ImageProcessor] Sharp not available, using fallback')
      return false
    }
  }

  async resize(buffer, options = {}) {
    const { width, height, fit = 'inside', position = 'center' } = options

    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    try {
      const sharp = this.sharp.default
      const image = sharp(buffer)

      const metadata = await image.metadata()

      let resizeOptions = {}
      if (width && height) {
        resizeOptions = { width, height, fit, position }
      } else if (width) {
        resizeOptions = { width, withoutEnlargement: true }
      } else if (height) {
        resizeOptions = { height, withoutEnlargement: true }
      }

      return await image.resize(resizeOptions).toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] Resize failed:', error.message)
      return buffer
    }
  }

  async crop(buffer, options = {}) {
    const { width, height, left, top, fit = 'cover' } = options

    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    try {
      const sharp = this.sharp.default
      return await sharp(buffer)
        .resize(width, height, { fit })
        .extract({ left: left || 0, top: top || 0, width, height })
        .toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] Crop failed:', error.message)
      return buffer
    }
  }

  async smartCrop(buffer, options = {}) {
    const { width, height } = options

    await this.loadSharp()

    if (!this.sharp) {
      return this.resize(buffer, { width, height, fit: 'cover' })
    }

    try {
      const sharp = this.sharp.default
      return await sharp(buffer)
        .resize(width, height, { fit: 'cover', position: 'attention' })
        .toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] Smart crop failed:', error.message)
      return buffer
    }
  }

  async rotate(buffer, degrees = 0) {
    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    try {
      const sharp = this.sharp.default
      return await sharp(buffer).rotate(degrees).toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] Rotate failed:', error.message)
      return buffer
    }
  }

  async flip(buffer) {
    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    try {
      const sharp = this.sharp.default
      return await sharp(buffer).flop().toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] Flip failed:', error.message)
      return buffer
    }
  }

  async autoOrient(buffer, orientation = 1) {
    const rotationMap = {
      2: 0,
      3: 180,
      4: 0,
      5: 0,
      6: 270,
      7: 0,
      8: 90,
    }

    const rotation = rotationMap[orientation]
    if (!rotation) return buffer

    return this.rotate(buffer, rotation)
  }

  async compressJpeg(buffer, quality = 85) {
    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    try {
      const sharp = this.sharp.default
      return await sharp(buffer).jpeg({ quality, mozjpeg: true }).toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] JPEG compression failed:', error.message)
      return buffer
    }
  }

  async compressPng(buffer) {
    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    try {
      const sharp = this.sharp.default
      return await sharp(buffer).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] PNG compression failed:', error.message)
      return buffer
    }
  }

  async compressWebp(buffer, options = {}) {
    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    const { quality = 85, lossless = false } = options

    try {
      const sharp = this.sharp.default
      return await sharp(buffer).webp({ quality, lossless }).toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] WebP compression failed:', error.message)
      return buffer
    }
  }

  async convertFormat(buffer, targetFormat) {
    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    try {
      const sharp = this.sharp.default
      const image = sharp(buffer)

      switch (targetFormat) {
        case 'jpg':
        case 'jpeg':
          return await image.jpeg({ quality: 85 }).toBuffer()
        case 'png':
          return await image.png({ compressionLevel: 9 }).toBuffer()
        case 'webp':
          return await image.webp({ quality: 85 }).toBuffer()
        case 'avif':
          return await image.avif({ quality: 85 }).toBuffer()
        case 'gif':
          return await image.gif().toBuffer()
        default:
          return buffer
      }
    } catch (error) {
      console.error('[ImageProcessor] Format conversion failed:', error.message)
      return buffer
    }
  }

  async addWatermark(buffer, options = {}) {
    const { text, position = 'southeast', opacity = 0.3, fontSize = 24 } = options

    await this.loadSharp()

    if (!this.sharp) {
      console.warn('[ImageProcessor] Sharp not available, watermark skipped')
      return buffer
    }

    try {
      const sharp = this.sharp.default
      const image = sharp(buffer)
      const metadata = await image.metadata()

      const width = metadata.width || 800
      const height = metadata.height || 600

      const textBuffer = await sharp({
        text: {
          text,
          font: 'sans-serif',
          fontSize,
          rgba: true,
        },
      })
        .resize(Math.floor(width / 4), null)
        .png()
        .toBuffer()

      const gravityMap = {
        northwest: 'northwest',
        north: 'north',
        northeast: 'northeast',
        west: 'west',
        center: 'centre',
        east: 'east',
        southwest: 'southwest',
        south: 'south',
        southeast: 'southeast',
      }

      return await sharp(buffer)
        .composite([
          {
            input: textBuffer,
            gravity: gravityMap[position] || 'southeast',
            blend: 'over',
          },
        ])
        .toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] Watermark failed:', error.message)
      return buffer
    }
  }

  async extractMetadata(buffer, mimeType) {
    await this.loadSharp()

    if (!this.sharp) {
      return this.extractBasicMetadata(buffer, mimeType)
    }

    try {
      const sharp = this.sharp.default
      const image = sharp(buffer)
      const metadata = await image.metadata()

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        exif: metadata.exif,
        icc: metadata.icc,
        size: buffer.length,
        aspectRatio: metadata.width && metadata.height ? metadata.width / metadata.height : null,
        dominantColors: await this.extractDominantColors(image),
      }
    } catch (error) {
      console.error('[ImageProcessor] Metadata extraction failed:', error.message)
      return this.extractBasicMetadata(buffer, mimeType)
    }
  }

  async extractDominantColors(image) {
    try {
      const { dominant } = await image.stats()
      if (dominant) {
        return [
          `rgb(${dominant[0]},${dominant[1]},${dominant[2]})`,
        ]
      }
    } catch {
    }
    return []
  }

  extractBasicMetadata(buffer, mimeType) {
    return {
      format: mimeType.split('/')[1],
      size: buffer.length,
      mimeType,
    }
  }

  async blur(buffer, sigma = 3) {
    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    try {
      const sharp = this.sharp.default
      return await sharp(buffer).blur(sigma).toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] Blur failed:', error.message)
      return buffer
    }
  }

  async getDominantColor(buffer) {
    await this.loadSharp()

    if (!this.sharp) {
      return '#000000'
    }

    try {
      const sharp = this.sharp.default
      const image = sharp(buffer)
      const { dominant } = await image.stats()

      if (dominant) {
        return `rgb(${dominant[0]},${dominant[1]},${dominant[2]})`
      }
    } catch (error) {
      console.error('[ImageProcessor] Dominant color extraction failed:', error.message)
    }

    return '#000000'
  }

  async detectAspectRatio(buffer) {
    await this.loadSharp()

    if (!this.sharp) {
      return null
    }

    try {
      const sharp = this.sharp.default
      const metadata = await sharp(buffer).metadata()
      if (metadata.width && metadata.height) {
        return metadata.width / metadata.height
      }
    } catch (error) {
      console.error('[ImageProcessor] Aspect ratio detection failed:', error.message)
    }

    return null
  }

  async removeExif(buffer) {
    await this.loadSharp()

    if (!this.sharp) {
      return buffer
    }

    try {
      const sharp = this.sharp.default
      return await sharp(buffer).rotate().toBuffer()
    } catch (error) {
      console.error('[ImageProcessor] EXIF removal failed:', error.message)
      return buffer
    }
  }

  healthCheck() {
    return {
      processor: 'image',
      sharp: this.sharpLoaded,
    }
  }
}

export default ImageProcessor
