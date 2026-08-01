/**
 * Sitemap Manager — Tenant-aware URL generation
 *
 * Business-agnostic: generates sitemap entries and URL collections
 */
export class SitemapManager {
  #context = null
  #urls = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Add a URL to the sitemap
   * @param {string} url
   * @param {object} config - { lastmod, changefreq, priority }
   */
  addURL(url, config = {}) {
    this.#urls.set(url, {
      lastmod: config.lastmod || new Date().toISOString().split('T')[0],
      changefreq: config.changefreq || 'weekly',
      priority: config.priority || 0.5,
    })
  }

  /**
   * Generate sitemap from pages
   * @param {object[]} pages
   * @param {object} tenant
   */
  generateFromPages(pages, tenant) {
    const base = window.location.origin
    const prefix = tenant?.slug ? `/${tenant.slug}` : ''

    pages.forEach(page => {
      const url = `${base}${prefix}/${page.slug || page.id}`
      this.addURL(url, {
        lastmod: page.updatedAt || page.createdAt,
        changefreq: page.slug === 'home' ? 'daily' : 'weekly',
        priority: page.slug === 'home' ? 1.0 : 0.8,
      })
    })
  }

  /**
   * Generate XML sitemap string
   * @returns {string}
   */
  toXML() {
    const urls = Array.from(this.#urls.entries())
    const entries = urls.map(([url, config]) => `
    <url>
      <loc>${url}</loc>
      <lastmod>${config.lastmod}</lastmod>
      <changefreq>${config.changefreq}</changefreq>
      <priority>${config.priority}</priority>
    </url>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${entries}
</urlset>`
  }

  /**
   * Generate robots.txt content
   * @param {string} sitemapURL
   * @returns {string}
   */
  toRobotsTxt(sitemapURL) {
    return `User-agent: *
Allow: /

Sitemap: ${sitemapURL || `${window.location.origin}/sitemap.xml`}`
  }

  /**
   * Get all URLs
   * @returns {object[]}
   */
  getURLs() {
    return Array.from(this.#urls.entries()).map(([url, config]) => ({ url, ...config }))
  }

  /**
   * Clear all URLs
   */
  clear() {
    this.#urls.clear()
  }

  /**
   * Remove a URL
   * @param {string} url
   */
  removeURL(url) {
    this.#urls.delete(url)
  }

  /**
   * Get URL count
   * @returns {number}
   */
  count() {
    return this.#urls.size
  }
}
