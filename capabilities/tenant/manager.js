/**
 * TenantManager — Main tenant management orchestrator
 *
 * Responsibilities:
 * - Identify current tenant
 * - Load tenant configuration
 * - Apply tenant branding/theme
 * - Load tenant provider
 * - Emit tenant events
 *
 * Does NOT know about: tourism, drones, reservations, companies, etc.
 */
import { TenantRegistry } from './registry.js'
import { TenantResolver } from './resolver.js'
import { validateTenantConfig, mergeWithDefaults } from './config.schema.js'

export class TenantManager {
  #registry
  #resolver
  #eventBus
  #currentTenant = null
  #initialized = false

  /**
   * @param {object} eventBus - Event bus instance
   */
  constructor(eventBus) {
    this.#registry = new TenantRegistry()
    this.#resolver = new TenantResolver(this.#registry)
    this.#eventBus = eventBus
  }

  /**
   * Initialize TenantManager
   * @param {object} options - Initialization options
   * @param {object[]} options.tenants - Array of tenant configs to register
   * @param {string} options.defaultTenantId - Default tenant ID
   * @returns {Promise<object>} - Current tenant config
   */
  async init(options = {}) {
    // Register provided tenants
    if (options.tenants) {
      for (const tenant of options.tenants) {
        this.register(tenant)
      }
    }

    // Set default tenant
    if (options.defaultTenantId) {
      this.#registry.setDefault(options.defaultTenantId)
    }

    // Resolve current tenant
    this.#currentTenant = this.#resolver.resolve()

    if (this.#currentTenant) {
      this.#applyBranding(this.#currentTenant)
      this.#applyTheme(this.#currentTenant)
      this.#initialized = true
      this.#emit('tenant:loaded', { tenant: this.#currentTenant })
    }

    return this.#currentTenant
  }

  /**
   * Register a tenant
   * @param {object} config - Tenant configuration
   * @returns {object} - Registered tenant config (with defaults merged)
   */
  register(config) {
    const fullConfig = mergeWithDefaults(config)
    const validation = validateTenantConfig(fullConfig)

    if (!validation.valid) {
      throw new Error(`Invalid tenant config: ${validation.errors.join(', ')}`)
    }

    this.#registry.register(fullConfig)
    return fullConfig
  }

  /**
   * Get current tenant
   * @returns {object|null}
   */
  getCurrent() {
    return this.#currentTenant
  }

  /**
   * Get tenant by ID
   * @param {string} tenantId - Tenant ID
   * @returns {object|null}
   */
  getById(tenantId) {
    return this.#registry.get(tenantId)
  }

  /**
   * Get tenant by slug
   * @param {string} slug - Tenant slug
   * @returns {object|null}
   */
  getBySlug(slug) {
    return this.#registry.getBySlug(slug)
  }

  /**
   * Switch to a different tenant
   * @param {string} tenantId - Tenant ID to switch to
   * @returns {Promise<object>} - New tenant config
   */
  async switchTo(tenantId) {
    const tenant = this.#registry.get(tenantId)
    if (!tenant) throw new Error(`Tenant not found: ${tenantId}`)

    this.#currentTenant = tenant
    this.#applyBranding(tenant)
    this.#applyTheme(tenant)
    this.#resolver.remember(tenant.slug)
    this.#emit('tenant:switched', { tenant })

    return tenant
  }

  /**
   * Get provider configuration for current tenant
   * @returns {object} - Provider config { type, config }
   */
  getProviderConfig() {
    return this.#currentTenant?.provider || { type: 'json', config: {} }
  }

  /**
   * Get branding for current tenant
   * @returns {object} - Branding config
   */
  getBranding() {
    return this.#currentTenant?.branding || {}
  }

  /**
   * Get theme for current tenant
   * @returns {object} - Theme config
   */
  getTheme() {
    return this.#currentTenant?.theme || {}
  }

  /**
   * Get capabilities for current tenant
   * @returns {string[]} - Array of capability IDs
   */
  getCapabilities() {
    return this.#currentTenant?.capabilities || []
  }

  /**
   * Get plugins for current tenant
   * @returns {string[]} - Array of plugin IDs
   */
  getPlugins() {
    return this.#currentTenant?.plugins || []
  }

  /**
   * Get all registered tenants
   * @returns {object[]}
   */
  getAll() {
    return this.#registry.getAll()
  }

  /**
   * Check if TenantManager is initialized
   * @returns {boolean}
   */
  get initialized() {
    return this.#initialized
  }

  // ── Private Methods ──

  /**
   * Apply tenant branding to CSS variables
   * @private
   */
  #applyBranding(tenant) {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const { colors, fonts } = tenant.branding || {}

    if (colors) {
      if (colors.primary) root.style.setProperty('--color-primary', colors.primary)
      if (colors.secondary) root.style.setProperty('--color-secondary', colors.secondary)
      if (colors.accent) root.style.setProperty('--color-accent', colors.accent)
      if (colors.background) root.style.setProperty('--color-bg', colors.background)
      if (colors.surface) root.style.setProperty('--color-surface', colors.surface)
      if (colors.text) root.style.setProperty('--color-text', colors.text)
      if (colors.textSecondary) root.style.setProperty('--color-text-secondary', colors.textSecondary)
    }

    if (fonts) {
      if (fonts.display) root.style.setProperty('--font-display', fonts.display)
      if (fonts.body) root.style.setProperty('--font-body', fonts.body)
      if (fonts.mono) root.style.setProperty('--font-mono', fonts.mono)
    }
  }

  /**
   * Apply tenant theme
   * @private
   */
  #applyTheme(tenant) {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const { mode } = tenant.theme || {}

    if (mode) {
      root.setAttribute('data-theme', mode)
    }
  }

  /**
   * Emit event via EventBus
   * @private
   */
  #emit(event, data) {
    this.#eventBus.emit(event, data)
  }
}
