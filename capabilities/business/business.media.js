export class BusinessMedia {
  static create(mediaItems) {
    if (!Array.isArray(mediaItems)) return []
    return mediaItems.map((item, index) => ({
      id: item.id || null,
      url: item.url || null,
      alt: item.alt || '',
      caption: item.caption || '',
      type: item.type || 'image',
      width: item.width || null,
      height: item.height || null,
      size: item.size || null,
      mimeType: item.mimeType || null,
      isPrimary: item.isPrimary || index === 0,
      sortOrder: item.sortOrder || index,
      metadata: item.metadata || {},
    }))
  }

  static toPayload(mediaItems) {
    if (!Array.isArray(mediaItems)) return []
    return mediaItems.map((item) => ({
      id: item.id,
      url: item.url,
      alt: item.alt,
      caption: item.caption,
      type: item.type,
      width: item.width,
      height: item.height,
      mime_type: item.mimeType,
      is_primary: item.isPrimary,
      sort_order: item.sortOrder,
    }))
  }
}
