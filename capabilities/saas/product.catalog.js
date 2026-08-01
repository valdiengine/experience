/**
 * Product Catalog — Central registry of commercial products
 *
 * Business-agnostic: configuration only, no business logic, no UI
 */

export class ProductCatalog {
  #products = new Map()

  constructor() {
    this.#registerDefaults()
  }

  /**
   * Register a product
   * @param {object} product - { id, category, name, description, capabilities, features }
   * @returns {object}
   */
  register(product) {
    if (!product?.id) return { success: false, error: 'Product id is required' }
    if (!product?.name) return { success: false, error: 'Product name is required' }
    if (!product?.category) return { success: false, error: 'Product category is required' }

    const existing = this.#products.get(product.id)
    if (existing) return { success: false, error: `Product ${product.id} already exists` }

    const entry = {
      id: product.id,
      category: product.category,
      name: product.name,
      description: product.description || '',
      capabilities: product.capabilities || [],
      features: product.features || [],
      createdAt: new Date().toISOString(),
    }

    this.#products.set(product.id, entry)
    return { success: true, product: entry }
  }

  /**
   * Get product by ID
   * @param {string} productId
   * @returns {object|null}
   */
  get(productId) {
    return this.#products.get(productId) || null
  }

  /**
   * Get all products
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#products.values())
  }

  /**
   * Get products by category
   * @param {string} category
   * @returns {object[]}
   */
  getByCategory(category) {
    return this.getAll().filter(p => p.category === category)
  }

  /**
   * Update product
   * @param {string} productId
   * @param {object} updates
   * @returns {object}
   */
  update(productId, updates) {
    const product = this.#products.get(productId)
    if (!product) return { success: false, error: `Product ${productId} not found` }

    const updated = { ...product, ...updates, id: productId, updatedAt: new Date().toISOString() }
    this.#products.set(productId, updated)
    return { success: true, product: updated }
  }

  /**
   * Delete product
   * @param {string} productId
   * @returns {object}
   */
  delete(productId) {
    const product = this.#products.get(productId)
    if (!product) return { success: false, error: `Product ${productId} not found` }

    this.#products.delete(productId)
    return { success: true }
  }

  /**
   * Get capabilities for a product
   * @param {string} productId
   * @returns {string[]}
   */
  getCapabilities(productId) {
    const product = this.get(productId)
    return product?.capabilities || []
  }

  /**
   * Get features for a product
   * @param {string} productId
   * @returns {string[]}
   */
  getFeatures(productId) {
    const product = this.get(productId)
    return product?.features || []
  }

  /**
   * Check if product includes a capability
   * @param {string} productId
   * @param {string} capabilityId
   * @returns {boolean}
   */
  includesCapability(productId, capabilityId) {
    return this.getCapabilities(productId).includes(capabilityId)
  }

  // ── Defaults ──

  #registerDefaults() {
    // Category 1: Digital Presence
    this.register({
      id: 'free_directory',
      category: 'digital_presence',
      name: 'Free Directory',
      description: 'Public business profile inside the ecosystem',
      capabilities: ['cms', 'public', 'pwa'],
      features: ['business_profile', 'directory_visibility', 'basic_seo', 'basic_contact'],
    })

    this.register({
      id: 'basic_business',
      category: 'digital_presence',
      name: 'Basic Business',
      description: 'Entry-level digital presence',
      capabilities: ['cms', 'communication', 'public', 'pwa'],
      features: ['enhanced_profile', 'more_sections', 'communication_tools', 'better_visibility'],
    })

    this.register({
      id: 'intermediate_business',
      category: 'digital_presence',
      name: 'Intermediate Business',
      description: 'Growing businesses with marketing tools',
      capabilities: ['cms', 'communication', 'seo-intelligence', 'public', 'pwa'],
      features: ['customization', 'additional_content', 'marketing_tools', 'basic_analytics'],
    })

    this.register({
      id: 'advanced_website',
      category: 'digital_presence',
      name: 'Advanced Website',
      description: 'Professional website solution',
      capabilities: ['cms', 'public', 'seo-intelligence', 'communication', 'pwa'],
      features: ['custom_url', 'branding', 'multiple_sections', 'seo_optimization', 'professional_presentation'],
    })

    this.register({
      id: 'premium_landing',
      category: 'digital_presence',
      name: 'Premium Landing Page',
      description: 'Conversion-focused professional landing page',
      capabilities: ['cms', 'public', 'seo-intelligence', 'analytics', 'communication', 'pwa'],
      features: ['premium_design', 'lead_generation', 'analytics', 'marketing_integrations', 'conversion_tracking'],
    })

    // Category 2: Web Applications
    this.register({
      id: 'accommodation_webapp',
      category: 'web_application',
      name: 'Accommodation Web App',
      description: 'Progressive Web App for accommodations',
      capabilities: ['cms', 'communication', 'pwa', 'booking'],
      features: ['pwa_app', 'contact_buttons', 'whatsapp_integration', 'social_networks', 'direct_communication', 'reservation_connection'],
    })

    // Category 3: SaaS Platform
    this.register({
      id: 'magnum_saas',
      category: 'saas_platform',
      name: 'Magnum SaaS',
      description: 'Complete business automation platform',
      capabilities: [
        'cms', 'public', 'seo-intelligence', 'booking', 'availability',
        'reservation', 'communication', 'notifications', 'engagement',
        'conversion', 'intelligence', 'owner', 'observability', 'pwa',
        'scheduler',
      ],
      features: [
        'complete_reservation_engine', 'automated_notifications',
        'availability_collection', 'customer_engagement', 'owner_portal',
        'business_analytics', 'ai_recommendations', 'multi_tenant_pwa',
        'automation_workflows',
      ],
    })

    // Category 4: Ecosystem Partner
    this.register({
      id: 'accommodation_partner',
      category: 'ecosystem_partner',
      name: 'Accommodation Partner',
      description: 'Participate in the reservation ecosystem without full SaaS',
      capabilities: ['availability', 'communication', 'reservation', 'owner'],
      features: ['availability_management', 'receive_requests', 'owner_communication', 'calendar_management', 'reservation_dashboard'],
    })
  }
}
