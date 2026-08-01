/**
 * PWA Capability — Manifest Generator
 *
 * Business-agnostic: generates PWA manifest from tenant config
 */
export class ManifestGenerator {
  #config = {}

  constructor(config = {}) {
    this.#config = config
  }

  /**
   * Generate PWA manifest from tenant config
   * @param {object} tenant - Tenant configuration
   * @returns {object}
   */
  generate(tenant) {
    return {
      name: tenant.name || this.#config.name || 'Valdi Engine',
      short_name: tenant.shortName || this.#config.shortName || 'Valdi',
      description: tenant.description || this.#config.description || '',
      start_url: '/',
      display: 'standalone',
      background_color: tenant.theme?.background || this.#config.backgroundColor || '#0a0a0a',
      theme_color: tenant.theme?.primary || this.#config.themeColor || '#c8956c',
      icons: tenant.icons || this.#config.icons || [],
      categories: tenant.categories || this.#config.categories || [],
      lang: tenant.lang || this.#config.lang || 'es',
      scope: '/',
    }
  }

  /**
   * Convert manifest to JSON string
   * @param {object} manifest - Manifest object
   * @returns {string}
   */
  toJSON(manifest) {
    return JSON.stringify(manifest, null, 2)
  }

  /**
   * Create data URL for inline manifest
   * @param {object} manifest - Manifest object
   * @returns {string}
   */
  toDataURL(manifest) {
    const json = this.toJSON(manifest)
    return `data:application/json;base64,${btoa(json)}`
  }
}
