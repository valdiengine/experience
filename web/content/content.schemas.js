/**
 * Content Schemas
 *
 * Normalized content models for editorial content.
 * All content providers (WordPress, headless CMS, etc.) must return these types.
 * Framework-free implementation.
 */

export const CONTENT_TYPE = {
  ARTICLE: 'article',
  BLOG_POST: 'blogPost',
  NEWS: 'news',
  PAGE: 'page',
  GUIDE: 'guide'
}

export function createNormalizedPost(data = {}) {
  return {
    id: data.id || null,
    slug: data.slug || '',
    type: data.type || CONTENT_TYPE.ARTICLE,
    title: data.title || '',
    excerpt: data.excerpt || '',
    content: data.content || '',
    date: data.date || null,
    modified: data.modified || data.last_modified || null,
    author: data.author ? {
      id: data.author.id || null,
      name: data.author.name || '',
      slug: data.author.slug || '',
      avatar: data.author.avatar || null
    } : null,
    categories: (data.categories || []).map(cat => createNormalizedCategory(cat)),
    tags: (data.tags || []).map(tag => createNormalizedTag(tag)),
    featuredImage: data.featuredImage ? createNormalizedMedia(data.featuredImage) : null,
    seo: data.seo ? createNormalizedSeo(data.seo) : null,
    canonicalUrl: data.canonicalUrl || '',
    destination: data.destination || null,
    metadata: data.metadata || {}
  }
}

export function createNormalizedPage(data = {}) {
  return {
    id: data.id || null,
    slug: data.slug || '',
    type: CONTENT_TYPE.PAGE,
    title: data.title || '',
    content: data.content || '',
    excerpt: data.excerpt || '',
    date: data.date || null,
    modified: data.modified || data.last_modified || null,
    featuredImage: data.featuredImage ? createNormalizedMedia(data.featuredImage) : null,
    seo: data.seo ? createNormalizedSeo(data.seo) : null,
    canonicalUrl: data.canonicalUrl || '',
    destination: data.destination || null,
    metadata: data.metadata || {}
  }
}

export function createNormalizedCategory(data = {}) {
  return {
    id: data.id || null,
    slug: data.slug || '',
    name: data.name || '',
    description: data.description || '',
    count: data.count || 0,
    parent: data.parent || null,
    destination: data.destination || null
  }
}

export function createNormalizedTag(data = {}) {
  return {
    id: data.id || null,
    slug: data.slug || '',
    name: data.name || '',
    count: data.count || 0,
    destination: data.destination || null
  }
}

export function createNormalizedMedia(data = {}) {
  return {
    id: data.id || null,
    src: data.src || data.url || data.source_url || '',
    alt: data.alt || data.alt_text || '',
    title: data.title || '',
    caption: data.caption || '',
    width: data.width || null,
    height: data.height || null,
    mimeType: data.mime_type || data.mimeType || '',
    destination: data.destination || null
  }
}

export function createNormalizedSeo(data = {}) {
  return {
    title: data.title || '',
    description: data.description || '',
    canonical: data.canonical || '',
    robots: data.robots || '',
    openGraph: data.openGraph || data.og || null,
    twitter: data.twitter || null,
    jsonLd: data.jsonLd || data.json_ld || null
  }
}

export function createNormalizedSearchResult(data = {}) {
  return {
    id: data.id || null,
    type: data.type || CONTENT_TYPE.ARTICLE,
    title: data.title || '',
    excerpt: data.excerpt || '',
    slug: data.slug || '',
    date: data.date || null,
    categories: data.categories || [],
    featuredImage: data.featuredImage ? createNormalizedMedia(data.featuredImage) : null,
    destination: data.destination || null
  }
}

export function createNormalizedCollection(items = [], total = 0, page = 1, perPage = 10) {
  return {
    items: items,
    total: total,
    page: page,
    perPage: perPage,
    totalPages: Math.ceil(total / perPage),
    hasMore: page * perPage < total
  }
}

export default {
  CONTENT_TYPE,
  createNormalizedPost,
  createNormalizedPage,
  createNormalizedCategory,
  createNormalizedTag,
  createNormalizedMedia,
  createNormalizedSeo,
  createNormalizedSearchResult,
  createNormalizedCollection
}
