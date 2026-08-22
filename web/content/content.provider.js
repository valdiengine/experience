/**
 * Content Provider
 *
 * Unified content provider facade.
 * Supports multiple content adapters (WordPress, headless CMS, etc.)
 * Framework-free implementation.
 */

import { createWordPressAdapter } from './wordpress/wordpress.adapter.js'

const CONTENT_ROUTES = {
  blog: '/blog',
  news: '/noticias',
  guia: '/guia',
  articles: '/articulos'
}

class ContentProvider {
  constructor() {
    this.adapters = new Map()
    this.defaultAdapter = null
  }

  registerAdapter(name, adapter) {
    this.adapters.set(name, adapter)

    if (!this.defaultAdapter) {
      this.defaultAdapter = name
    }
  }

  setDefaultAdapter(name) {
    if (this.adapters.has(name)) {
      this.defaultAdapter = name
    }
  }

  getAdapter(name = null) {
    const adapterName = name || this.defaultAdapter
    return this.adapters.get(adapterName) || null
  }

  getAdapterForDestination(destination) {
    for (const adapter of this.adapters.values()) {
      if (adapter.destination === destination && adapter.isEnabled) {
        return adapter
      }
    }
    return this.getAdapter()
  }

  isEditorialRoute(pathname) {
    if (!pathname) return false

    for (const route of Object.values(CONTENT_ROUTES)) {
      if (pathname.startsWith(route) || pathname === route) {
        return true
      }
    }
    return false
  }

  getEditorialType(pathname) {
    if (!pathname) return null

    if (pathname.startsWith('/blog') || pathname === '/blog') {
      return 'blog'
    }
    if (pathname.startsWith('/noticias') || pathname === '/noticias') {
      return 'news'
    }
    if (pathname.startsWith('/guia') || pathname === '/guia') {
      return 'guide'
    }
    if (pathname.startsWith('/articulos') || pathname === '/articulos') {
      return 'articles'
    }

    return null
  }

  extractSlugFromPath(pathname) {
    if (!pathname) return null

    const editorialType = this.getEditorialType(pathname)
    if (!editorialType) return null

    const route = CONTENT_ROUTES[editorialType]
    let slug = pathname.slice(route.length)

    slug = slug.replace(/^\/+/, '')

    if (!slug) {
      return null
    }

    return slug
  }

  async getContent(pathname, destination) {
    const slug = this.extractSlugFromPath(pathname)

    if (!slug) {
      return null
    }

    const adapter = this.getAdapterForDestination(destination)

    if (!adapter || !adapter.isEnabled) {
      return null
    }

    const editorialType = this.getEditorialType(pathname)

    try {
      switch (editorialType) {
        case 'blog':
        case 'news':
        case 'articles':
          return await adapter.getPost(slug, destination)

        case 'guide':
          return await adapter.getPost(slug, destination)

        default:
          return await adapter.getPost(slug, destination)
      }
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return null
      }
      throw error
    }
  }

  async getContentList(pathname, destination, options = {}) {
    const adapter = this.getAdapterForDestination(destination)

    if (!adapter || !adapter.isEnabled) {
      return { items: [], total: 0 }
    }

    const editorialType = this.getEditorialType(pathname) || 'blog'

    try {
      switch (editorialType) {
        case 'blog':
          return await adapter.getPosts(options, destination)

        case 'news':
          return await adapter.getPosts({ ...options, category: 'noticias' }, destination)

        case 'guide':
          return await adapter.getPosts({ ...options, category: 'guia' }, destination)

        case 'articles':
          return await adapter.getPosts(options, destination)

        default:
          return await adapter.getPosts(options, destination)
      }
    } catch (error) {
      return { items: [], total: 0 }
    }
  }

  async health() {
    const results = {}

    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.health()
      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message
        }
      }
    }

    return results
  }
}

let providerInstance = null

export function createContentProvider(config = {}) {
  providerInstance = new ContentProvider()

  if (config.wordpress) {
    const wpAdapter = createWordPressAdapter(config.wordpress)
    providerInstance.registerAdapter('wordpress', wpAdapter)
  }

  return providerInstance
}

export function getContentProvider() {
  if (!providerInstance) {
    providerInstance = createContentProvider()
  }
  return providerInstance
}

export function isEditorialRoute(pathname) {
  return getContentProvider().isEditorialRoute(pathname)
}

export function getEditorialType(pathname) {
  return getContentProvider().getEditorialType(pathname)
}

export default {
  ContentProvider,
  createContentProvider,
  getContentProvider,
  isEditorialRoute,
  getEditorialType,
  CONTENT_ROUTES
}
