/**
 * PWA Capability — Progressive Web App management
 *
 * Business-agnostic: manifest generation, install prompt, service worker
 * Delegates to DataManager — no direct data access
 * Activatable/deactivatable per tenant
 */
import { BaseCapability } from '../core/base.capability.js'
import { ManifestGenerator } from './manifest.generator.js'
import { InstallManager } from './install.manager.js'

export class PWACapability extends BaseCapability {
  static id = 'pwa'
  static name = 'PWA'
  static version = '1.0.0'
  static dependencies = []

  #manifestGenerator = null
  #installManager = null

  async init(context, config = {}) {
    await super.init(context, config)

    this.#manifestGenerator = new ManifestGenerator(config.manifest || {})
    this.#installManager = new InstallManager(this.eventBus)
  }

  async activate() {
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    await super.destroy()
  }

  /**
   * Get manifest generator
   * @returns {ManifestGenerator}
   */
  get manifestGenerator() {
    return this.#manifestGenerator
  }

  /**
   * Get install manager
   * @returns {InstallManager}
   */
  get installManager() {
    return this.#installManager
  }

  /**
   * Generate and inject PWA manifest
   * @param {object} tenant - Tenant configuration
   */
  injectManifest(tenant) {
    const manifest = this.#manifestGenerator.generate(tenant)
    const json = this.#manifestGenerator.toJSON(manifest)

    // Remove existing manifest link
    const existing = document.querySelector('link[rel="manifest"]')
    if (existing) existing.remove()

    // Create new manifest link
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = `data:application/json;base64,${btoa(json)}`
    document.head.appendChild(link)
  }
}

export default PWACapability
