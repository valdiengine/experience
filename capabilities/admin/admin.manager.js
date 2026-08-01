/**
 * Admin Manager — Orchestrates all admin sub-modules
 *
 * Business-agnostic: manages users, tenants, billing, reservations, content, SEO, PWA, analytics
 * All operations go through capabilities — never bypasses boundaries
 */
import { UserManager } from './users/user.manager.js'
import { AdminRoleManager } from './users/role.manager.js'
import { TenantDashboard } from './tenant-admin/tenant.dashboard.js'
import { TenantSettings } from './tenant-admin/tenant.settings.js'
import { PlanManager } from './billing/plan.manager.js'
import { SubscriptionManager } from './billing/subscription.manager.js'
import { ReservationAdmin } from './reservation-admin/reservation.admin.js'
import { AvailabilityAdmin } from './availability-admin/availability.admin.js'
import { ContentAdmin } from './content-admin/content.admin.js'
import { SEOAdmin } from './seo-admin/seo.admin.js'
import { PWAAdmin } from './pwa-admin/pwa.admin.js'
import { AnalyticsAdmin } from './analytics-admin/analytics.admin.js'
import { ADMIN_EVENTS } from './admin.events.js'

export class AdminManager {
  #context = null
  #userManager = null
  #roleManager = null
  #tenantDashboard = null
  #tenantSettings = null
  #planManager = null
  #subscriptionManager = null
  #reservationAdmin = null
  #availabilityAdmin = null
  #contentAdmin = null
  #seoAdmin = null
  #pwaAdmin = null
  #analyticsAdmin = null
  #currentUser = null

  constructor(context) {
    this.#context = context
    this.#userManager = new UserManager(context)
    this.#roleManager = new AdminRoleManager(context)
    this.#tenantDashboard = new TenantDashboard(context)
    this.#tenantSettings = new TenantSettings(context)
    this.#planManager = new PlanManager(context)
    this.#subscriptionManager = new SubscriptionManager(context)
    this.#reservationAdmin = new ReservationAdmin(context)
    this.#availabilityAdmin = new AvailabilityAdmin(context)
    this.#contentAdmin = new ContentAdmin(context)
    this.#seoAdmin = new SEOAdmin(context)
    this.#pwaAdmin = new PWAAdmin(context)
    this.#analyticsAdmin = new AnalyticsAdmin(context)
  }

  // ── Getters ──

  get userManager() { return this.#userManager }
  get roleManager() { return this.#roleManager }
  get tenantDashboard() { return this.#tenantDashboard }
  get tenantSettings() { return this.#tenantSettings }
  get planManager() { return this.#planManager }
  get subscriptionManager() { return this.#subscriptionManager }
  get reservationAdmin() { return this.#reservationAdmin }
  get availabilityAdmin() { return this.#availabilityAdmin }
  get contentAdmin() { return this.#contentAdmin }
  get seoAdmin() { return this.#seoAdmin }
  get pwaAdmin() { return this.#pwaAdmin }
  get analyticsAdmin() { return this.#analyticsAdmin }

  // ── Authentication ──

  /**
   * Login user
   * @param {string} email
   * @param {string} tenantId
   * @returns {object|null}
   */
  login(email, tenantId) {
    const user = this.#userManager.authenticate(email, tenantId)
    if (user) {
      this.#currentUser = user
      this.#context?.eventBus?.emit(ADMIN_EVENTS.USER_LOGIN, {
        userId: user.id,
        tenantId,
      })
    }
    return user
  }

  /**
   * Logout current user
   */
  logout() {
    if (this.#currentUser) {
      this.#context?.eventBus?.emit(ADMIN_EVENTS.USER_LOGOUT, {
        userId: this.#currentUser.id,
        tenantId: this.#currentUser.tenantId,
      })
    }
    this.#currentUser = null
  }

  /**
   * Get current user
   * @returns {object|null}
   */
  getCurrentUser() {
    return this.#currentUser
  }

  /**
   * Check if current user has permission
   * @param {string} permission
   * @returns {boolean}
   */
  hasPermission(permission) {
    if (!this.#currentUser) return false
    return this.#userManager.hasPermission(this.#currentUser.id, permission)
  }

  // ── Dashboard ──

  /**
   * Get admin dashboard overview
   * @param {string} tenantId
   * @returns {object}
   */
  async getDashboard(tenantId) {
    const [tenant, reservations, analytics] = await Promise.all([
      this.#tenantDashboard.getOverview(tenantId),
      this.#reservationAdmin.getDashboard(tenantId),
      this.#analyticsAdmin.getDashboard(tenantId),
    ])

    return {
      tenant,
      reservations: {
        pending: reservations.pending.length,
        confirmed: reservations.confirmed.length,
        stats: reservations.stats,
      },
      analytics: analytics.business,
      system: analytics.system,
    }
  }

  // ── Cleanup ──

  destroy() {
    this.#currentUser = null
  }
}
