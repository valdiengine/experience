/**
 * CMS Mapper — Maps WordPress data to Engine format
 *
 * Business-agnostic: transforms generic CMS content to Engine entities.
 * Does NOT know about tourism, drones, etc.
 */
import { CMS_CONTENT_TYPES, CMS_STATUS } from './cms.schema.js'

export class CMSMapper {
  /**
   * Map WordPress page to Engine content format
   * @param {object} page - WordPress page object
   * @returns {object} - Engine content entity
   */
  static mapPage(page) {
    return {
      id: String(page.id),
      type: CMS_CONTENT_TYPES.PAGE,
      status: page.status === 'publish' ? CMS_STATUS.PUBLISHED : CMS_STATUS.DRAFT,
      slug: page.slug,
      title: page.title?.rendered || '',
      content: page.content?.rendered || '',
      excerpt: page.excerpt?.rendered || '',
      featuredImage: page.featured_media || null,
      metadata: {
        wordpressId: page.id,
        link: page.link,
        date: page.date,
        modified: page.modified,
        author: page.author,
      },
      customFields: {},
      createdAt: page.date || new Date().toISOString(),
      updatedAt: page.modified || new Date().toISOString(),
    }
  }

  /**
   * Map WordPress post to Engine content format
   * @param {object} post - WordPress post object
   * @returns {object} - Engine content entity
   */
  static mapPost(post) {
    return {
      id: String(post.id),
      type: CMS_CONTENT_TYPES.POST,
      status: post.status === 'publish' ? CMS_STATUS.PUBLISHED : CMS_STATUS.DRAFT,
      slug: post.slug,
      title: post.title?.rendered || '',
      content: post.content?.rendered || '',
      excerpt: post.excerpt?.rendered || '',
      featuredImage: post.featured_media || null,
      metadata: {
        wordpressId: post.id,
        link: post.link,
        date: post.date,
        modified: post.modified,
        author: post.author,
        categories: post.categories || [],
        tags: post.tags || [],
      },
      customFields: {},
      createdAt: post.date || new Date().toISOString(),
      updatedAt: post.modified || new Date().toISOString(),
    }
  }

  /**
   * Map array of WordPress items to Engine format
   * @param {object[]} items - WordPress items
   * @param {string} type - 'page' or 'post'
   * @returns {object[]}
   */
  static mapMany(items, type) {
    if (!Array.isArray(items)) return []
    return items.map(item => {
      if (type === 'page') return CMSMapper.mapPage(item)
      if (type === 'post') return CMSMapper.mapPost(item)
      return item
    })
  }

  /**
   * Map WordPress media to Engine format
   * @param {object} media - WordPress media object
   * @returns {object}
   */
  static mapMedia(media) {
    return {
      id: String(media.id),
      type: CMS_CONTENT_TYPES.MEDIA,
      status: CMS_STATUS.PUBLISHED,
      slug: media.slug || '',
      title: media.title?.rendered || '',
      content: media.source_url || '',
      featuredImage: media.source_url || null,
      metadata: {
        wordpressId: media.id,
        mimeType: media.mime_type,
        width: media.media_details?.width,
        height: media.media_details?.height,
        sizes: media.media_details?.sizes || {},
      },
      customFields: {},
      createdAt: media.date || new Date().toISOString(),
      updatedAt: media.modified || new Date().toISOString(),
    }
  }
}
