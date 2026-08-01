/**
 * Customer Manager — Create, track, classify customers
 *
 * Business-agnostic: customer lifecycle management
 */

import { CUSTOMER_LIFECYCLE_SCHEMA, CUSTOMER_STATUSES, CUSTOMER_SEGMENTS } from '../lifecycle.schema.js'
import { LIFECYCLE_EVENTS } from '../lifecycle.events.js'

export class CustomerManager {
  #customers = new Map()
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
  }

  /**
   * Create a customer profile
   * @param {object} data - { tenantId, businessId, plan, businessType }
   * @returns {object}
   */
  create(data) {
    if (!data?.tenantId) return { success: false, error: 'Tenant ID is required' }
    if (!data?.businessId) return { success: false, error: 'Business ID is required' }

    const existing = this.#customers.get(data.tenantId)
    if (existing) return { success: false, error: `Customer ${data.tenantId} already exists` }

    const now = new Date().toISOString()
    const customer = {
      ...CUSTOMER_LIFECYCLE_SCHEMA,
      tenantId: data.tenantId,
      businessId: data.businessId,
      plan: data.plan || 'free_directory',
      businessType: data.businessType || 'service',
      status: CUSTOMER_STATUSES.NEW,
      segment: CUSTOMER_SEGMENTS.NEW_CUSTOMER,
      createdAt: now,
      activatedAt: null,
      lastActivity: now,
      healthScore: 50,
      metadata: {},
    }

    this.#customers.set(data.tenantId, customer)
    this.#emit(LIFECYCLE_EVENTS.CUSTOMER_CREATED, { customer })
    return { success: true, customer }
  }

  /**
   * Get customer by tenant ID
   * @param {string} tenantId
   * @returns {object|null}
   */
  get(tenantId) {
    return this.#customers.get(tenantId) || null
  }

  /**
   * Update customer
   * @param {string} tenantId
   * @param {object} updates
   * @returns {object}
   */
  update(tenantId, updates) {
    const customer = this.#customers.get(tenantId)
    if (!customer) return { success: false, error: `Customer ${tenantId} not found` }

    const updated = { ...customer, ...updates, tenantId, lastActivity: new Date().toISOString() }
    this.#customers.set(tenantId, updated)
    this.#emit(LIFECYCLE_EVENTS.CUSTOMER_UPDATED, { customer: updated })
    return { success: true, customer: updated }
  }

  /**
   * Activate customer
   * @param {string} tenantId
   * @returns {object}
   */
  activate(tenantId) {
    const customer = this.#customers.get(tenantId)
    if (!customer) return { success: false, error: `Customer ${tenantId} not found` }

    customer.status = CUSTOMER_STATUSES.ACTIVE
    customer.activatedAt = new Date().toISOString()
    customer.lastActivity = new Date().toISOString()

    this.#customers.set(tenantId, customer)
    this.#emit(LIFECYCLE_EVENTS.CUSTOMER_ACTIVATED, { customer })
    return { success: true, customer }
  }

  /**
   * Get customer segment
   * @param {string} tenantId
   * @returns {string}
   */
  getSegment(tenantId) {
    const customer = this.#customers.get(tenantId)
    if (!customer) return CUSTOMER_SEGMENTS.NEW_CUSTOMER
    return customer.segment
  }

  /**
   * Update customer segment
   * @param {string} tenantId
   * @param {string} segment
   * @returns {object}
   */
  updateSegment(tenantId, segment) {
    const customer = this.#customers.get(tenantId)
    if (!customer) return { success: false, error: `Customer ${tenantId} not found` }

    const previousSegment = customer.segment
    customer.segment = segment
    customer.lastActivity = new Date().toISOString()

    this.#customers.set(tenantId, customer)
    this.#emit(LIFECYCLE_EVENTS.CUSTOMER_SEGMENT_CHANGED, {
      tenantId,
      previousSegment,
      newSegment: segment,
    })
    return { success: true, segment }
  }

  /**
   * Update health score
   * @param {string} tenantId
   * @param {number} score
   * @param {object} factors
   * @returns {object}
   */
  updateHealthScore(tenantId, score, factors = {}) {
    const customer = this.#customers.get(tenantId)
    if (!customer) return { success: false, error: `Customer ${tenantId} not found` }

    customer.healthScore = Math.max(0, Math.min(100, score))
    customer.healthFactors = factors
    customer.lastActivity = new Date().toISOString()

    this.#customers.set(tenantId, customer)
    this.#emit(LIFECYCLE_EVENTS.CUSTOMER_HEALTH_UPDATED, {
      tenantId,
      score: customer.healthScore,
      factors,
    })
    return { success: true, score: customer.healthScore }
  }

  /**
   * Record activity
   * @param {string} tenantId
   * @param {string} activityType
   * @returns {object}
   */
  recordActivity(tenantId, activityType) {
    const customer = this.#customers.get(tenantId)
    if (!customer) return { success: false, error: `Customer ${tenantId} not found` }

    customer.lastActivity = new Date().toISOString()
    if (!customer.activities) customer.activities = []
    customer.activities.push({ type: activityType, timestamp: customer.lastActivity })
    if (customer.activities.length > 100) customer.activities = customer.activities.slice(-100)

    this.#customers.set(tenantId, customer)
    return { success: true }
  }

  /**
   * Get all customers
   * @param {object} filter - { status, segment, plan }
   * @returns {object[]}
   */
  getAll(filter = {}) {
    let customers = Array.from(this.#customers.values())
    if (filter.status) customers = customers.filter(c => c.status === filter.status)
    if (filter.segment) customers = customers.filter(c => c.segment === filter.segment)
    if (filter.plan) customers = customers.filter(c => c.plan === filter.plan)
    return customers
  }

  /**
   * Get customer count
   * @param {object} filter
   * @returns {number}
   */
  count(filter) {
    return this.getAll(filter).length
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
