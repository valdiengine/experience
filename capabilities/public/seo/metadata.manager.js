/**
 * Metadata Manager — SEO metadata for public pages
 *
 * Business-agnostic: manages title, description, OG, Twitter cards
 */
export class MetadataManager {
  #context = null
  #metadataCache = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Set metadata for a page
   * @param {string} pageId
   * @param {object} meta - { title, description, canonical, ogTitle, ogDescription, ogImage, twitterCard }
   */
  setMetadata(pageId, meta) {
    this.#metadataCache.set(pageId, meta)
    this.#applyMetadata(meta)
  }

  /**
   * Get cached metadata for a page
   * @param {string} pageId
   * @returns {object|null}
   */
  getMetadata(pageId) {
    return this.#metadataCache.get(pageId) || null
  }

  /**
   * Generate metadata from page content
   * @param {object} page - { id, title, description, slug, seo }
   * @param {object} tenant
   * @returns {object}
   */
  generateFromPage(page, tenant) {
    const base = tenant?.seo || {}
    const pageSEO = page.seo || {}

    return {
      title: pageSEO.title || `${page.title} | ${tenant?.name || 'Valdi'}`,
      description: pageSEO.description || page.description || base.description || '',
      canonical: pageSEO.canonical || this.#buildCanonical(page.slug, tenant),
      ogTitle: pageSEO.ogTitle || pageSEO.title || page.title,
      ogDescription: pageSEO.ogDescription || pageSEO.description || page.description,
      ogImage: pageSEO.ogImage || base.ogImage || tenant?.logo,
      twitterCard: pageSEO.twitterCard || 'summary_large_image',
    }
  }

  /**
   * Apply metadata to document head
   * @param {object} meta
   */
  applyToDocument(meta) {
    this.#applyMetadata(meta)
  }

  /**
   * Clear all metadata
   */
  clearMetadata() {
    this.#clearMetaTags()
    this.#metadataCache.clear()
  }

  /**
   * Remove metadata for a page
   * @param {string} pageId
   */
  removeMetadata(pageId) {
    this.#metadataCache.delete(pageId)
  }

  // ── Private ──

  #applyMetadata(meta) {
    if (meta.title) {
      document.title = meta.title
    }

    if (meta.description) {
      this.#setMeta('description', meta.description)
    }

    if (meta.canonical) {
      this.#setLink('canonical', meta.canonical)
    }

    if (meta.ogTitle) {
      this.#setMeta('og:title', meta.ogTitle, 'property')
    }

    if (meta.ogDescription) {
      this.#setMeta('og:description', meta.ogDescription, 'property')
    }

    if (meta.ogImage) {
      this.#setMeta('og:image', meta.ogImage, 'property')
    }

    if (meta.twitterCard) {
      this.#setMeta('twitter:card', meta.twitterCard)
    }

    if (meta.ogTitle) {
      this.#setMeta('twitter:title', meta.ogTitle)
    }

    if (meta.ogDescription) {
      this.#setMeta('twitter:description', meta.ogDescription)
    }
  }

  #setMeta(name, content, attr = 'name') {
    let el = document.querySelector(`meta[${attr}="${name}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, name)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  #setLink(rel, href) {
    let el = document.querySelector(`link[rel="${rel}"]`)
    if (!el) {
      el = document.createElement('link')
      el.rel = rel
      document.head.appendChild(el)
    }
    el.href = href
  }

  #clearMetaTags() {
    const tags = document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]')
    tags.forEach(tag => tag.remove())
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) canonical.remove()
  }

  #buildCanonical(slug, tenant) {
    const base = window.location.origin
    const prefix = tenant?.slug ? `/${tenant.slug}` : ''
    return `${base}${prefix}/${slug || ''}`
  }
}
