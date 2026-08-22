/**
 * WordPress Mapper
 *
 * Maps WordPress REST API responses to normalized content models.
 * Framework-free implementation.
 */

import {
  createNormalizedPost,
  createNormalizedPage,
  createNormalizedCategory,
  createNormalizedTag,
  createNormalizedMedia,
  createNormalizedSeo,
  CONTENT_TYPE
} from '../content.schemas.js'

export class WordPressMapper {
  mapPost(wpPost, destination = null) {
    if (!wpPost) return null

    return createNormalizedPost({
      id: wpPost.id,
      slug: wpPost.slug,
      type: this._mapPostType(wpPost),
      title: this._decodeHtmlEntities(wpPost.title?.rendered || ''),
      excerpt: this._decodeHtmlEntities(wpPost.excerpt?.rendered || ''),
      content: wpPost.content?.rendered || '',
      date: wpPost.date,
      modified: wpPost.modified,
      author: wpPost.author ? this.mapAuthor(wpPost.author) : null,
      categories: (wpPost.categories || []).map(id => this.mapCategory({ id })),
      tags: (wpPost.tags || []).map(id => this.mapTag({ id })),
      featuredImage: wpPost.featured_media ? this.mapFeaturedMedia(wpPost.featured_media) : null,
      seo: this.mapSeo(wpPost),
      canonicalUrl: wpPost.link || '',
      destination,
      metadata: {
        wordpressId: wpPost.id,
        wordpressSlug: wpPost.slug,
        wordpressStatus: wpPost.status,
        wordpressFormat: wpPost.format,
        wordpressTemplate: wpPost.template
      }
    })
  }

  mapPage(wpPage, destination = null) {
    if (!wpPage) return null

    return createNormalizedPage({
      id: wpPage.id,
      slug: wpPage.slug,
      type: CONTENT_TYPE.PAGE,
      title: this._decodeHtmlEntities(wpPage.title?.rendered || ''),
      content: wpPage.content?.rendered || '',
      excerpt: this._decodeHtmlEntities(wpPage.excerpt?.rendered || ''),
      date: wpPage.date,
      modified: wpPage.modified,
      featuredImage: wpPage.featured_media ? this.mapFeaturedMedia(wpPage.featured_media) : null,
      seo: this.mapSeo(wpPage),
      canonicalUrl: wpPage.link || '',
      destination,
      metadata: {
        wordpressId: wpPage.id,
        wordpressSlug: wpPage.slug,
        wordpressStatus: wpPage.status,
        wordpressParent: wpPage.parent,
        wordpressOrder: wpPage.menu_order
      }
    })
  }

  mapCategory(wpCategory, destination = null) {
    if (!wpCategory) return null

    return createNormalizedCategory({
      id: wpCategory.id,
      slug: wpCategory.slug,
      name: this._decodeHtmlEntities(wpCategory.name || ''),
      description: this._decodeHtmlEntities(wpCategory.description || ''),
      count: wpCategory.count || 0,
      parent: wpCategory.parent || null,
      destination
    })
  }

  mapTag(wpTag, destination = null) {
    if (!wpTag) return null

    return createNormalizedTag({
      id: wpTag.id,
      slug: wpTag.slug,
      name: this._decodeHtmlEntities(wpTag.name || ''),
      count: wpTag.count || 0,
      destination
    })
  }

  mapMedia(wpMedia, destination = null) {
    if (!wpMedia) return null

    return createNormalizedMedia({
      id: wpMedia.id,
      src: wpMedia.source_url || '',
      alt: wpMedia.alt_text || wpMedia.alt || '',
      title: wpMedia.title?.rendered || '',
      caption: wpMedia.caption?.rendered || '',
      width: wpMedia.media_details?.width || null,
      height: wpMedia.media_details?.height || null,
      mimeType: wpMedia.mime_type || '',
      destination
    })
  }

  mapFeaturedMedia(mediaIdOrData, destination = null) {
    if (!mediaIdOrData) return null

    if (typeof mediaIdOrData === 'number') {
      return { id: mediaIdOrData, src: '', alt: '', destination }
    }

    return this.mapMedia(mediaIdOrData, destination)
  }

  mapAuthor(wpAuthor) {
    if (!wpAuthor) return null

    if (typeof wpAuthor === 'number') {
      return { id: wpAuthor, name: '', slug: '', avatar: null }
    }

    return {
      id: wpAuthor.id,
      name: wpAuthor.name || '',
      slug: wpAuthor.slug || '',
      avatar: wpAuthor.avatar_urls?.['96'] || wpAuthor.avatar_urls?.['48'] || null
    }
  }

  mapSeo(wpPost) {
    const yoast = wpPost.yoast_head_json || {}

    if (yoast && Object.keys(yoast).length > 0) {
      return createNormalizedSeo({
        title: yoast.title || '',
        description: yoast.description || '',
        canonical: yoast.canonical || '',
        robots: this._buildRobots(yoast),
        openGraph: {
          title: yoast.og_title || '',
          description: yoast.og_description || '',
          image: yoast.og_image?.[0]?.url || null,
          type: yoast.og_type || 'article'
        },
        twitter: {
          card: yoast.twitter_card || 'summary_large_image',
          title: yoast.twitter_title || '',
          description: yoast.twitter_description || '',
          image: yoast.twitter_image || null
        }
      })
    }

    const rankMath = wpPost.rank_math_head || {}

    if (rankMath && Object.keys(rankMath).length > 0) {
      return createNormalizedSeo({
        title: rankMath.title || '',
        description: rankMath.description || '',
        canonical: rankMath.canonical_url || '',
        robots: rankMath.robots || ''
      })
    }

    return createNormalizedSeo({
      title: wpPost.title?.rendered || '',
      description: wpPost.excerpt?.rendered || '',
      canonical: wpPost.link || ''
    })
  }

  mapPosts(wpPosts, destination = null) {
    if (!Array.isArray(wpPosts)) return []
    return wpPosts.map(post => this.mapPost(post, destination))
  }

  mapPages(wpPages, destination = null) {
    if (!Array.isArray(wpPages)) return []
    return wpPages.map(page => this.mapPage(page, destination))
  }

  mapCategories(wpCategories, destination = null) {
    if (!Array.isArray(wpCategories)) return []
    return wpCategories.map(cat => this.mapCategory(cat, destination))
  }

  mapTags(wpTags, destination = null) {
    if (!Array.isArray(wpTags)) return []
    return wpTags.map(tag => this.mapTag(tag, destination))
  }

  mapSearchResults(wpPosts, destination = null) {
    if (!Array.isArray(wpPosts)) return []

    return wpPosts.map(post => ({
      id: post.id,
      type: this._mapPostType(post),
      title: this._decodeHtmlEntities(post.title?.rendered || ''),
      excerpt: this._decodeHtmlEntities(post.excerpt?.rendered || ''),
      slug: post.slug,
      date: post.date,
      categories: (post.categories || []).map(id => ({ id })),
      featuredImage: post.featured_media ? { id: post.featured_media } : null,
      destination
    }))
  }

  _mapPostType(wpPost) {
    const format = wpPost.format || 'standard'
    const categories = wpPost.categories || []
    const categorySlugs = categories.map(c => c.slug || c).filter(Boolean)

    if (categorySlugs.includes('news') || categorySlugs.includes('noticias')) {
      return 'news'
    }

    if (categorySlugs.includes('guide') || categorySlugs.includes('guia')) {
      return 'guide'
    }

    if (format === 'aside') {
      return 'blogPost'
    }

    return CONTENT_TYPE.ARTICLE
  }

  _buildRobots(yoast) {
    const robots = []

    if (yoast.meta_robots_noindex === '1') {
      robots.push('noindex')
    }

    if (yoast.meta_robots_nofollow === '1') {
      robots.push('nofollow')
    }

    return robots.length > 0 ? robots.join(', ') : 'index, follow'
  }

  _decodeHtmlEntities(str) {
    if (!str || typeof str !== 'string') return ''

    return str
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      .replace(/&ldquo;/g, '\u201C')
      .replace(/&rdquo;/g, '\u201D')
      .replace(/&lsquo;/g, '\u2018')
      .replace(/&rsquo;/g, '\u2019')
  }
}

export function createWordPressMapper() {
  return new WordPressMapper()
}

export default {
  WordPressMapper,
  createWordPressMapper
}
