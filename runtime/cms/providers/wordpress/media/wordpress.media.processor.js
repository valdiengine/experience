export class WordPressMediaProcessor {
  processUploadResult(wpMedia) {
    return {
      mediaId: String(wpMedia.id),
      url: wpMedia.source_url || '',
      thumbnails: this.#extractThumbnails(wpMedia),
      mimeType: wpMedia.mime_type || '',
      size: wpMedia.media_details?.filesize || 0,
      width: wpMedia.media_details?.width || 0,
      height: wpMedia.media_details?.height || 0,
      alt: wpMedia.alt_text || '',
    }
  }

  #extractThumbnails(wpMedia) {
    const sizes = wpMedia.media_details?.sizes || {}
    const thumbnails = {}
    for (const [key, size] of Object.entries(sizes)) {
      thumbnails[key] = {
        url: size.source_url || '',
        width: size.width || 0,
        height: size.height || 0,
        mimeType: size.mime_type || '',
      }
    }
    return thumbnails
  }

  getImageVariants(mediaUrl) {
    const variants = {
      thumbnail: this.#getVariantUrl(mediaUrl, 150, 150),
      medium: this.#getVariantUrl(mediaUrl, 300, 200),
      large: this.#getVariantUrl(mediaUrl, 1024, 678),
      full: mediaUrl,
    }
    return variants
  }

  #getVariantUrl(url, width, height) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}w=${width}&h=${height}&fit=crop`
  }

  extractGeoMetadata(wpMedia) {
    const imageMeta = wpMedia.media_details?.image_meta || {}
    if (!imageMeta.latitude && !imageMeta.longitude) return null

    return {
      latitude: parseFloat(imageMeta.latitude),
      longitude: parseFloat(imageMeta.longitude),
      altitude: imageMeta.altitude ? parseFloat(imageMeta.altitude) : null,
      capturedAt: imageMeta.created_timestamp
        ? new Date(imageMeta.created_timestamp * 1000).toISOString()
        : null,
      camera: imageMeta.camera || null,
      aperture: imageMeta.aperture || null,
      focalLength: imageMeta.focal_length || null,
      iso: imageMeta.iso || null,
      shutterSpeed: imageMeta.shutter_speed || null,
    }
  }
}

export default WordPressMediaProcessor
