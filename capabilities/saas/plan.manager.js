/**
 * Plan Manager — Create, assign, change, compare plans
 *
 * Business-agnostic: plans define access, never behavior
 */

import { PLAN_SCHEMA, SUBSCRIPTION_STATUSES } from './saas.schema.js'
import { SAAS_EVENTS } from './saas.events.js'

export class PlanManager {
  #plans = new Map()
  #subscriptions = new Map()
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
    this.#registerDefaults()
  }

  // ── Plans ──

  /**
   * Create a plan
   * @param {object} plan
   * @returns {object}
   */
  create(plan) {
    if (!plan?.id) return { success: false, error: 'Plan id is required' }
    if (!plan?.name) return { success: false, error: 'Plan name is required' }

    const existing = this.#plans.get(plan.id)
    if (existing) return { success: false, error: `Plan ${plan.id} already exists` }

    const entry = {
      ...PLAN_SCHEMA,
      ...plan,
      createdAt: new Date().toISOString(),
    }

    this.#plans.set(plan.id, entry)
    this.#emit(SAAS_EVENTS.PLAN_CREATED, { plan: entry })
    return { success: true, plan: entry }
  }

  /**
   * Get plan by ID
   * @param {string} planId
   * @returns {object|null}
   */
  get(planId) {
    return this.#plans.get(planId) || null
  }

  /**
   * Get all plans
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#plans.values())
  }

  /**
   * Get plans by category
   * @param {string} category
   * @returns {object[]}
   */
  getByCategory(category) {
    return this.getAll().filter(p => p.category === category)
  }

  /**
   * Update plan
   * @param {string} planId
   * @param {object} updates
   * @returns {object}
   */
  update(planId, updates) {
    const plan = this.#plans.get(planId)
    if (!plan) return { success: false, error: `Plan ${planId} not found` }

    const updated = { ...plan, ...updates, id: planId, updatedAt: new Date().toISOString() }
    this.#plans.set(planId, updated)
    this.#emit(SAAS_EVENTS.PLAN_UPDATED, { plan: updated })
    return { success: true, plan: updated }
  }

  /**
   * Compare two plans
   * @param {string} planIdA
   * @param {string} planIdB
   * @returns {object}
   */
  compare(planIdA, planIdB) {
    const a = this.get(planIdA)
    const b = this.get(planIdB)
    if (!a || !b) return null

    return {
      plans: [a, b],
      capabilities: {
        onlyInA: a.capabilities.filter(c => !b.capabilities.includes(c)),
        onlyInB: b.capabilities.filter(c => !a.capabilities.includes(c)),
        shared: a.capabilities.filter(c => b.capabilities.includes(c)),
      },
      features: {
        onlyInA: a.features.filter(f => !b.features.includes(f)),
        onlyInB: b.features.filter(f => !a.features.includes(f)),
        shared: a.features.filter(f => b.features.includes(f)),
      },
      limits: {
        a: a.limits || {},
        b: b.limits || {},
      },
    }
  }

  /**
   * Get capabilities for a plan
   * @param {string} planId
   * @returns {string[]}
   */
  getCapabilities(planId) {
    const plan = this.get(planId)
    return plan?.capabilities || []
  }

  /**
   * Get limits for a plan
   * @param {string} planId
   * @returns {object}
   */
  getLimits(planId) {
    const plan = this.get(planId)
    return plan?.limits || {}
  }

  /**
   * Check if plan has a capability
   * @param {string} planId
   * @param {string} capabilityId
   * @returns {boolean}
   */
  hasCapability(planId, capabilityId) {
    return this.getCapabilities(planId).includes(capabilityId)
  }

  // ── Subscriptions ──

  /**
   * Assign plan to tenant
   * @param {string} tenantId
   * @param {string} planId
   * @param {object} options - { productId, expiresAt }
   * @returns {object}
   */
  assignPlan(tenantId, planId, options = {}) {
    const plan = this.get(planId)
    if (!plan) return { success: false, error: `Plan ${planId} not found` }

    const existing = this.#subscriptions.get(tenantId)
    const previousPlanId = existing?.planId || null

    const subscription = {
      tenantId,
      productId: options.productId || planId,
      planId,
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      startedAt: new Date().toISOString(),
      expiresAt: options.expiresAt || null,
      previousPlanId,
      metadata: {},
    }

    this.#subscriptions.set(tenantId, subscription)

    if (previousPlanId && previousPlanId !== planId) {
      this.#emit(SAAS_EVENTS.PLAN_CHANGED, {
        tenantId,
        previousPlanId,
        newPlanId: planId,
      })
    } else {
      this.#emit(SAAS_EVENTS.PLAN_ASSIGNED, { tenantId, planId })
    }

    this.#emit(SAAS_EVENTS.SUBSCRIPTION_CREATED, { tenantId, subscription })
    return { success: true, subscription }
  }

  /**
   * Get subscription for tenant
   * @param {string} tenantId
   * @returns {object|null}
   */
  getSubscription(tenantId) {
    return this.#subscriptions.get(tenantId) || null
  }

  /**
   * Change plan for tenant
   * @param {string} tenantId
   * @param {string} newPlanId
   * @returns {object}
   */
  changePlan(tenantId, newPlanId) {
    const subscription = this.#subscriptions.get(tenantId)
    if (!subscription) return { success: false, error: `No subscription for tenant ${tenantId}` }

    const previousPlanId = subscription.planId
    if (previousPlanId === newPlanId) return { success: false, error: 'Already on this plan' }

    subscription.planId = newPlanId
    subscription.updatedAt = new Date().toISOString()

    this.#subscriptions.set(tenantId, subscription)
    this.#emit(SAAS_EVENTS.PLAN_CHANGED, { tenantId, previousPlanId, newPlanId })
    return { success: true, subscription }
  }

  /**
   * Suspend subscription
   * @param {string} tenantId
   * @returns {object}
   */
  suspend(tenantId) {
    const subscription = this.#subscriptions.get(tenantId)
    if (!subscription) return { success: false, error: `No subscription for tenant ${tenantId}` }

    subscription.status = SUBSCRIPTION_STATUSES.SUSPENDED
    this.#subscriptions.set(tenantId, subscription)
    this.#emit(SAAS_EVENTS.SUBSCRIPTION_SUSPENDED, { tenantId })
    return { success: true, subscription }
  }

  /**
   * Cancel subscription
   * @param {string} tenantId
   * @returns {object}
   */
  cancel(tenantId) {
    const subscription = this.#subscriptions.get(tenantId)
    if (!subscription) return { success: false, error: `No subscription for tenant ${tenantId}` }

    subscription.status = SUBSCRIPTION_STATUSES.CANCELLED
    this.#subscriptions.set(tenantId, subscription)
    this.#emit(SAAS_EVENTS.SUBSCRIPTION_CANCELLED, { tenantId })
    return { success: true, subscription }
  }

  /**
   * Reactivate subscription
   * @param {string} tenantId
   * @returns {object}
   */
  reactivate(tenantId) {
    const subscription = this.#subscriptions.get(tenantId)
    if (!subscription) return { success: false, error: `No subscription for tenant ${tenantId}` }

    subscription.status = SUBSCRIPTION_STATUSES.ACTIVE
    this.#subscriptions.set(tenantId, subscription)
    this.#emit(SAAS_EVENTS.SUBSCRIPTION_ACTIVATED, { tenantId })
    return { success: true, subscription }
  }

  // ── Defaults ──

  #registerDefaults() {
    this.create({
      id: 'free_directory',
      name: 'Free Directory',
      category: 'digital_presence',
      description: 'Free ecosystem participation',
      capabilities: ['cms', 'public', 'pwa'],
      features: ['business_profile', 'directory_visibility', 'basic_seo', 'basic_contact'],
      limits: { pages: 1, images: 10, reservations: 0, notifications: 0 },
      recommendedUpgrade: 'basic_business',
    })

    this.create({
      id: 'basic_business',
      name: 'Basic Business',
      category: 'digital_presence',
      description: 'Entry-level digital presence',
      capabilities: ['cms', 'communication', 'public', 'pwa'],
      features: ['enhanced_profile', 'more_sections', 'communication_tools', 'better_visibility'],
      limits: { pages: 5, images: 50, reservations: 0, notifications: 50 },
      recommendedUpgrade: 'intermediate_business',
    })

    this.create({
      id: 'intermediate_business',
      name: 'Intermediate Business',
      category: 'digital_presence',
      description: 'Growing businesses with marketing tools',
      capabilities: ['cms', 'communication', 'seo-intelligence', 'public', 'pwa'],
      features: ['customization', 'additional_content', 'marketing_tools', 'basic_analytics'],
      limits: { pages: 15, images: 200, reservations: 0, notifications: 100 },
      recommendedUpgrade: 'advanced_website',
    })

    this.create({
      id: 'advanced_website',
      name: 'Advanced Website',
      category: 'digital_presence',
      description: 'Professional website solution',
      capabilities: ['cms', 'public', 'seo-intelligence', 'communication', 'pwa'],
      features: ['custom_url', 'branding', 'multiple_sections', 'seo_optimization', 'professional_presentation'],
      limits: { pages: 30, images: 500, reservations: 0, notifications: 200 },
      recommendedUpgrade: 'premium_landing',
    })

    this.create({
      id: 'premium_landing',
      name: 'Premium Landing Page',
      category: 'digital_presence',
      description: 'Conversion-focused professional landing page',
      capabilities: ['cms', 'public', 'seo-intelligence', 'analytics', 'communication', 'pwa'],
      features: ['premium_design', 'lead_generation', 'analytics', 'marketing_integrations', 'conversion_tracking'],
      limits: { pages: 10, images: 300, reservations: 0, notifications: 150 },
      recommendedUpgrade: 'accommodation_webapp',
    })

    this.create({
      id: 'accommodation_webapp',
      name: 'Accommodation Web App',
      category: 'web_application',
      description: 'Progressive Web App for accommodations',
      capabilities: ['cms', 'communication', 'pwa', 'booking'],
      features: ['pwa_app', 'contact_buttons', 'whatsapp_integration', 'social_networks', 'direct_communication', 'reservation_connection'],
      limits: { pages: 20, images: 500, reservations: 50, notifications: 200 },
      recommendedUpgrade: 'magnum_saas',
    })

    this.create({
      id: 'magnum_saas',
      name: 'Magnum SaaS',
      category: 'saas_platform',
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
      limits: { unlimited: true },
      recommendedUpgrade: null,
    })

    this.create({
      id: 'accommodation_partner',
      name: 'Accommodation Partner',
      category: 'ecosystem_partner',
      description: 'Participate in reservation ecosystem without full SaaS',
      capabilities: ['availability', 'communication', 'reservation', 'owner'],
      features: ['availability_management', 'receive_requests', 'owner_communication', 'calendar_management', 'reservation_dashboard'],
      limits: { reservations: 30, notifications: 100 },
      recommendedUpgrade: 'magnum_saas',
    })
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
