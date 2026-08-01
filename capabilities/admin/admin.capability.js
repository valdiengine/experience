/**
 * Admin Capability — v1.0.0
 *
 * Multi-tenant administration platform
 * Manages: users, roles, tenants, billing, reservations, availability, content, SEO, PWA, analytics
 *
 * Dependencies: onboarding, reservation, availability, cms, seo-intelligence, pwa-engine, observability
 */
import { BaseCapability } from '../core/base.capability.js'
import { AdminManager } from './admin.manager.js'
import { ADMIN_EVENTS } from './admin.events.js'

export class AdminCapability extends BaseCapability {
  static id = 'admin'
  static name = 'Admin'
  static version = '1.0.0'
  static dependencies = ['onboarding', 'reservation', 'availability', 'cms', 'seo-intelligence', 'pwa-engine', 'observability']

  #manager = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new AdminManager(context)
  }

  async activate() {
    await super.activate()
  }

  async deactivate() {
    this.#manager?.logout()
    await super.deactivate()
  }

  async destroy() {
    this.#manager?.destroy()
    this.#manager = null
    await super.destroy()
  }

  // ── Getters ──

  getManager() { return this.#manager }

  // ── Authentication ──

  login(email, tenantId) {
    return this.#manager?.login(email, tenantId) || null
  }

  logout() {
    this.#manager?.logout()
  }

  getCurrentUser() {
    return this.#manager?.getCurrentUser() || null
  }

  hasPermission(permission) {
    return this.#manager?.hasPermission(permission) || false
  }

  // ── Users ──

  createUser(userData) {
    return this.#manager?.userManager?.create(userData) || { success: false, error: 'Manager not initialized' }
  }

  getUsers(tenantId) {
    return this.#manager?.userManager?.getByTenant(tenantId) || []
  }

  updateUser(userId, updates) {
    return this.#manager?.userManager?.update(userId, updates) || { success: false, error: 'Manager not initialized' }
  }

  deleteUser(userId) {
    return this.#manager?.userManager?.delete(userId) || { success: false, error: 'Manager not initialized' }
  }

  // ── Tenant ──

  async getTenantOverview(tenantId) {
    return this.#manager?.tenantDashboard?.getOverview(tenantId) || null
  }

  async updateBranding(tenantId, branding) {
    return this.#manager?.tenantSettings?.updateBranding(tenantId, branding) || { success: false, error: 'Manager not initialized' }
  }

  async enableCapability(tenantId, capabilityId) {
    return this.#manager?.tenantSettings?.enableCapability(tenantId, capabilityId) || { success: false, error: 'Manager not initialized' }
  }

  async disableCapability(tenantId, capabilityId) {
    return this.#manager?.tenantSettings?.disableCapability(tenantId, capabilityId) || { success: false, error: 'Manager not initialized' }
  }

  async changePlan(tenantId, plan) {
    return this.#manager?.tenantSettings?.changePlan(tenantId, plan) || { success: false, error: 'Manager not initialized' }
  }

  // ── Billing ──

  getAllPlans() {
    return this.#manager?.planManager?.getAllPlans() || []
  }

  getPlan(planId) {
    return this.#manager?.planManager?.getPlan(planId) || null
  }

  getSubscription(tenantId) {
    return this.#manager?.subscriptionManager?.getSubscription(tenantId) || null
  }

  // ── Reservations ──

  async getReservationDashboard(tenantId) {
    return this.#manager?.reservationAdmin?.getDashboard(tenantId) || { pending: [], confirmed: [], cancelled: [], expired: [], stats: {} }
  }

  async confirmReservation(tenantId, reservationId) {
    return this.#manager?.reservationAdmin?.confirm(tenantId, reservationId) || { success: false, error: 'Manager not initialized' }
  }

  async rejectReservation(tenantId, reservationId, reason) {
    return this.#manager?.reservationAdmin?.reject(tenantId, reservationId, reason) || { success: false, error: 'Manager not initialized' }
  }

  async cancelReservation(tenantId, reservationId, reason) {
    return this.#manager?.reservationAdmin?.cancel(tenantId, reservationId, reason) || { success: false, error: 'Manager not initialized' }
  }

  // ── Availability ──

  async getAvailabilityCalendar(tenantId, year, month) {
    return this.#manager?.availabilityAdmin?.getCalendar(tenantId, year, month) || []
  }

  async blockDates(tenantId, blockData) {
    return this.#manager?.availabilityAdmin?.blockDates(tenantId, blockData) || { success: false, error: 'Manager not initialized' }
  }

  async openDates(tenantId, openData) {
    return this.#manager?.availabilityAdmin?.openDates(tenantId, openData) || { success: false, error: 'Manager not initialized' }
  }

  // ── Content ──

  async getContentPages(tenantId) {
    return this.#manager?.contentAdmin?.getPages(tenantId) || []
  }

  async updatePageSEO(pageId, seo) {
    return this.#manager?.contentAdmin?.updateSEO(pageId, seo) || { success: false, error: 'Manager not initialized' }
  }

  async publishPage(pageId) {
    return this.#manager?.contentAdmin?.publish(pageId) || { success: false, error: 'Manager not initialized' }
  }

  // ── SEO ──

  async getSEODashboard(tenantId) {
    return this.#manager?.seoAdmin?.getDashboard(tenantId) || { score: 0, issues: [], opportunities: [], recommendations: [] }
  }

  // ── PWA ──

  async getPWADashboard(tenantId) {
    return this.#manager?.pwaAdmin?.getDashboard(tenantId) || { config: {}, stats: {} }
  }

  async updatePWAConfig(tenantId, config) {
    return this.#manager?.pwaAdmin?.updateConfig(tenantId, config) || { success: false, error: 'Manager not initialized' }
  }

  // ── Analytics ──

  async getAnalyticsDashboard(tenantId) {
    return this.#manager?.analyticsAdmin?.getDashboard(tenantId) || { business: {}, system: {}, health: {}, alerts: [] }
  }

  // ── Dashboard ──

  async getDashboard(tenantId) {
    return this.#manager?.getDashboard(tenantId) || {}
  }
}
