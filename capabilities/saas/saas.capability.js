/**
 * SaaS Capability — v1.0.0
 *
 * SaaS Product & Subscription Architecture
 * Manages: products, plans, subscriptions, entitlements, features, limits, upgrades
 *
 * Dependencies: none (standalone SaaS layer)
 */
import { BaseCapability } from '../core/base.capability.js'
import { ProductCatalog } from './product.catalog.js'
import { PlanManager } from './plan.manager.js'
import { SubscriptionManager } from './subscription.manager.js'
import { EntitlementManager } from './entitlement.manager.js'
import { FeatureFlagManager } from './feature.flag.manager.js'
import { LimitsManager } from './limits.manager.js'
import { UpgradeManager } from './upgrade.manager.js'

export class SaaSCapability extends BaseCapability {
  static id = 'saas'
  static name = 'SaaS'
  static version = '1.0.0'
  static dependencies = []

  #productCatalog = null
  #planManager = null
  #subscriptionManager = null
  #entitlementManager = null
  #featureFlags = null
  #limitsManager = null
  #upgradeManager = null

  async init(context, config = {}) {
    await super.init(context, config)

    this.#productCatalog = new ProductCatalog()
    this.#planManager = new PlanManager(context.eventBus)
    this.#subscriptionManager = new SubscriptionManager(context.eventBus)
    this.#entitlementManager = new EntitlementManager(this.#planManager, context.eventBus)
    this.#featureFlags = new FeatureFlagManager(this.#entitlementManager, context.eventBus)
    this.#limitsManager = new LimitsManager(this.#planManager, context.eventBus)
    this.#upgradeManager = new UpgradeManager(this.#planManager, this.#limitsManager, context.eventBus)
  }

  async activate() {
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#productCatalog = null
    this.#planManager = null
    this.#subscriptionManager = null
    this.#entitlementManager = null
    this.#featureFlags = null
    this.#limitsManager = null
    this.#upgradeManager = null
    await super.destroy()
  }

  // ── Product Catalog ──

  getProduct(productId) {
    return this.#productCatalog.get(productId)
  }

  getAllProducts() {
    return this.#productCatalog.getAll()
  }

  getProductsByCategory(category) {
    return this.#productCatalog.getByCategory(category)
  }

  registerProduct(product) {
    return this.#productCatalog.register(product)
  }

  // ── Plans ──

  getPlan(planId) {
    return this.#planManager.get(planId)
  }

  getAllPlans() {
    return this.#planManager.getAll()
  }

  getPlansByCategory(category) {
    return this.#planManager.getByCategory(category)
  }

  comparePlans(planIdA, planIdB) {
    return this.#planManager.compare(planIdA, planIdB)
  }

  // ── Subscriptions ──

  assignPlan(tenantId, planId, options = {}) {
    return this.#planManager.assignPlan(tenantId, planId, options)
  }

  changePlan(tenantId, newPlanId) {
    return this.#planManager.changePlan(tenantId, newPlanId)
  }

  getSubscription(tenantId) {
    return this.#planManager.getSubscription(tenantId)
  }

  suspendSubscription(tenantId) {
    return this.#planManager.suspend(tenantId)
  }

  cancelSubscription(tenantId) {
    return this.#planManager.cancel(tenantId)
  }

  reactivateSubscription(tenantId) {
    return this.#planManager.reactivate(tenantId)
  }

  // ── Entitlements ──

  canAccessCapability(tenantId, capabilityId) {
    return this.#entitlementManager.canAccessCapability(tenantId, capabilityId)
  }

  hasFeature(tenantId, feature) {
    return this.#entitlementManager.hasFeature(tenantId, feature)
  }

  getAvailableFeatures(tenantId) {
    return this.#entitlementManager.getAvailableFeatures(tenantId)
  }

  getAccessibleCapabilities(tenantId) {
    return this.#entitlementManager.getAccessibleCapabilities(tenantId)
  }

  getEntitlements(tenantId) {
    return this.#entitlementManager.getEntitlements(tenantId)
  }

  // ── Feature Flags ──

  isFeatureEnabled(tenantId, feature) {
    return this.#featureFlags.isEnabled(tenantId, feature)
  }

  enableFeature(tenantId, feature) {
    return this.#featureFlags.enable(tenantId, feature)
  }

  disableFeature(tenantId, feature) {
    return this.#featureFlags.disable(tenantId, feature)
  }

  getAllFeatureFlags(tenantId) {
    return this.#featureFlags.getAllFeatures(tenantId)
  }

  // ── Limits ──

  checkLimit(tenantId, resource) {
    return this.#limitsManager.checkLimit(tenantId, resource)
  }

  increaseUsage(tenantId, resource, amount = 1) {
    return this.#limitsManager.increaseUsage(tenantId, resource, amount)
  }

  resetUsage(tenantId, resource) {
    this.#limitsManager.resetUsage(tenantId, resource)
  }

  getRemaining(tenantId) {
    return this.#limitsManager.getRemaining(tenantId)
  }

  getUsage(tenantId) {
    return this.#limitsManager.getUsage(tenantId)
  }

  getUsagePercentages(tenantId) {
    return this.#limitsManager.getUsagePercentages(tenantId)
  }

  // ── Upgrades ──

  recommendUpgrade(tenantId) {
    return this.#upgradeManager.recommendUpgrade(tenantId)
  }

  compareWithPlan(tenantId, targetPlanId) {
    return this.#upgradeManager.compareWithPlan(tenantId, targetPlanId)
  }

  getUpgradePath(tenantId) {
    return this.#upgradeManager.getUpgradePath(tenantId)
  }

  needsUpgrade(tenantId) {
    return this.#upgradeManager.needsUpgrade(tenantId)
  }

  analyzeGrowth(tenantId) {
    return this.#upgradeManager.analyzeGrowth(tenantId)
  }

  getAvailableUpgrades(tenantId) {
    return this.#upgradeManager.getAvailableUpgrades(tenantId)
  }

  // ── Manager Access ──

  getProductCatalog() { return this.#productCatalog }
  getPlanManager() { return this.#planManager }
  getSubscriptionManager() { return this.#subscriptionManager }
  getEntitlementManager() { return this.#entitlementManager }
  getFeatureFlags() { return this.#featureFlags }
  getLimitsManager() { return this.#limitsManager }
  getUpgradeManager() { return this.#upgradeManager }
}
