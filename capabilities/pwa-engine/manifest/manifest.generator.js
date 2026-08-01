/**
 * Manifest Generator — Multi-tenant dynamic manifest generation
 *
 * Business-agnostic: generates manifests from tenant config via TenantManager
 * Supports: tenant.app, custom-domain, valdi.app/tenant-slug
 */
import { PWA_MANIFEST_SCHEMA } from '../pwa-engine.schema.js'

const DEFAULT_ICONS = [
  { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
  { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
  { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
  { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
  { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
  { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
  { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
  { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
]

export class ManifestGenerator {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Generate manifest for a tenant
   * @param {object} tenant - Tenant configuration
   * @returns {object} - PWA manifest
   */
  generate(tenant) {
    const pwaConfig = tenant?.pwa || {}
    const branding = tenant?.branding || {}
    const theme = tenant?.theme || {}

    const manifest = {
      name: pwaConfig.name || branding.name || tenant?.name || 'Valdi App',
      short_name: pwaConfig.shortName || branding.shortName || tenant?.shortName || 'Valdi',
      description: pwaConfig.description || tenant?.description || '',
      start_url: this.#resolveStartURL(tenant),
      display: pwaConfig.display || 'standalone',
      theme_color: pwaConfig.themeColor || theme.primary || '#c8956c',
      background_color: pwaConfig.backgroundColor || theme.background || '#0a0a0a',
      icons: pwaConfig.icons || branding.icons || DEFAULT_ICONS,
      scope: this.#resolveScope(tenant),
      lang: pwaConfig.lang || tenant?.lang || 'es',
      categories: pwaConfig.categories || tenant?.categories || ['business'],
      orientation: pwaConfig.orientation || 'any',
      id: pwaConfig.id || `/tenant/${tenant?.slug || 'default'}`,
    }

    return manifest
  }

  /**
   * Generate manifest with validation
   * @param {object} tenant
   * @returns {{ manifest: object, valid: boolean, errors: string[] }}
   */
  generateValidated(tenant) {
    const manifest = this.generate(tenant)
    const validation = PWA_MANIFEST_SCHEMA.validate(manifest)
    return { manifest, ...validation }
  }

  /**
   * Convert manifest to JSON string
   * @param {object} manifest
   * @returns {string}
   */
  toJSON(manifest) {
    return JSON.stringify(manifest, null, 2)
  }

  /**
   * Create data URL for inline manifest
   * @param {object} manifest
   * @returns {string}
   */
  toDataURL(manifest) {
    const json = this.toJSON(manifest)
    return `data:application/json;base64,${btoa(json)}`
  }

  /**
   * Inject manifest into document head
   * @param {object} manifest
   */
  inject(manifest) {
    const existing = document.querySelector('link[rel="manifest"]')
    if (existing) existing.remove()

    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = this.toDataURL(manifest)
    document.head.appendChild(link)

    this.#setMetaThemeColor(manifest.theme_color)
    this.#setAppleTouchIcon(manifest.icons)
  }

  /**
   * Generate service worker URL for tenant
   * @param {object} tenant
   * @returns {string}
   */
  getServiceWorkerURL(tenant) {
    const slug = tenant?.slug || 'default'
    return `/sw-${slug}.js`
  }

  // ── Private ──

  #resolveStartURL(tenant) {
    const slug = tenant?.slug
    if (!slug) return '/'

    if (tenant?.pwa?.startUrl) return tenant.pwa.startUrl

    const host = window.location.hostname
    if (host.includes(slug)) return '/'

    return `/${slug}/`
  }

  #resolveScope(tenant) {
    const slug = tenant?.slug
    if (!slug) return '/'

    const host = window.location.hostname
    if (host.includes(slug)) return '/'

    return `/${slug}/`
  }

  #setMetaThemeColor(color) {
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = color
  }

  #setAppleTouchIcon(icons) {
    const icon192 = icons.find(i => i.sizes === '192x192') || icons[0]
    if (!icon192) return

    let link = document.querySelector('link[rel="apple-touch-icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'apple-touch-icon'
      document.head.appendChild(link)
    }
    link.href = icon192.src
  }
}
