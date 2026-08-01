export class WordPressMediaMapper {
  toEngine(wpMedia) {
    const sizes = wpMedia.media_details?.sizes || {}
    const thumbnails = {}
    for (const [sizeKey, sizeData] of Object.entries(sizes)) {
      thumbnails[sizeKey] = sizeData.source_url || null
    }

    return {
      mediaId: String(wpMedia.id),
      provider: 'wordpress',
      providerMediaId: String(wpMedia.id),
      url: wpMedia.source_url || '',
      thumbnails,
      mimeType: wpMedia.mime_type || '',
      size: wpMedia.media_details?.filesize || 0,
      width: wpMedia.media_details?.width || 0,
      height: wpMedia.media_details?.height || 0,
      alt: wpMedia.alt_text || '',
      caption: wpMedia.caption?.rendered || '',
      description: wpMedia.description?.rendered || '',
      title: wpMedia.title?.rendered || '',
      createdAt: wpMedia.date || null,
      updatedAt: wpMedia.modified || null,
      meta: {
        wpLink: wpMedia.link || null,
        wpPostId: wpMedia.post || null,
        wpSourceUrl: wpMedia.source_url || null,
      },
      raw: wpMedia,
    }
  }

  toEngineBatch(wpMediaList) {
    return (wpMediaList || []).map(media => this.toEngine(media))
  }
}

export default WordPressMediaMapper
