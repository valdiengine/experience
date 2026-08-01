/**
 * Lifecycle Capability — v1.0.0
 *
 * SaaS Customer Lifecycle & Revenue Management
 * Manages: customers, trials, activation, growth, retention, churn, recovery
 *
 * Dependencies: saas, billing, communication, engagement, observability
 */
import { BaseCapability } from '../core/base.capability.js'
import { CustomerManager } from './customer/customer.manager.js'
import { CustomerProfile } from './customer/customer.profile.js'
import { CustomerSegment } from './customer/customer.segment.js'
import { TrialManager } from './onboarding/trial.manager.js'
import { ActivationManager } from './onboarding/activation.manager.js'
import { ChecklistManager } from './onboarding/checklist.manager.js'
import { UpgradeManager } from './growth/upgrade.manager.js'
import { RecommendationManager } from './growth/recommendation.manager.js'
import { UsageAnalyzer } from './growth/usage.analyzer.js'
import { ChurnManager } from './retention/churn.manager.js'
import { RenewalManager } from './retention/renewal.manager.js'
import { RecoveryManager } from './retention/recovery.manager.js'
import { LIFECYCLE_EVENTS } from './lifecycle.events.js'

export class LifecycleCapability extends BaseCapability {
  static id = 'lifecycle'
  static name = 'Lifecycle'
  static version = '1.0.0'
  static dependencies = ['saas', 'billing', 'communication', 'engagement', 'observability']

  #customerManager = null
  #customerProfile = null
  #customerSegment = null
  #trialManager = null
  #activationManager = null
  #checklistManager = null
  #upgradeManager = null
  #recommendationManager = null
  #usageAnalyzer = null
  #churnManager = null
  #renewalManager = null
  #recoveryManager = null

  async init(context, config = {}) {
    await super.init(context, config)

    this.#customerManager = new CustomerManager(context.eventBus)
    this.#customerProfile = new CustomerProfile()
    this.#customerSegment = new CustomerSegment()
    this.#trialManager = new TrialManager(context)
    this.#activationManager = new ActivationManager(context.eventBus)
    this.#checklistManager = new ChecklistManager()
    this.#upgradeManager = new UpgradeManager(context)
    this.#recommendationManager = new RecommendationManager(context)
    this.#usageAnalyzer = new UsageAnalyzer(context)
    this.#churnManager = new ChurnManager(context)
    this.#renewalManager = new RenewalManager(context)
    this.#recoveryManager = new RecoveryManager(context)

    context.lifecycle = this
  }

  async activate() {
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#customerManager = null
    this.#customerProfile = null
    this.#customerSegment = null
    this.#trialManager = null
    this.#activationManager = null
    this.#checklistManager = null
    this.#upgradeManager = null
    this.#recommendationManager = null
    this.#usageAnalyzer = null
    this.#churnManager = null
    this.#renewalManager = null
    this.#recoveryManager = null
    await super.destroy()
  }

  // ── Customer ──

  getCustomer(tenantId) { return this.#customerManager.get(tenantId) }
  createCustomer(data) { return this.#customerManager.create(data) }
  updateCustomer(tenantId, updates) { return this.#customerManager.update(tenantId, updates) }
  activateCustomer(tenantId) { return this.#customerManager.activate(tenantId) }
  getSegment(tenantId) { return this.#customerManager.getSegment(tenantId) }
  updateSegment(tenantId, segment) { return this.#customerManager.updateSegment(tenantId, segment) }
  updateHealthScore(tenantId, score, factors) { return this.#customerManager.updateHealthScore(tenantId, score, factors) }
  recordActivity(tenantId, type) { return this.#customerManager.recordActivity(tenantId, type) }
  getAllCustomers(filter) { return this.#customerManager.getAll(filter) }

  // ── Profile ──

  getProfile(tenantId) { return this.#customerProfile.get(tenantId) }
  upsertProfile(tenantId, data) { return this.#customerProfile.upsert(tenantId, data) }
  updateProfile(tenantId, updates) { return this.#customerProfile.update(tenantId, updates) }
  getProfileCompleteness(tenantId) { return this.#customerProfile.completeness(tenantId) }

  // ── Segment ──

  evaluateSegment(customer) { return this.#customerSegment.evaluate(customer) }
  getSegmentDescription(segment) { return this.#customerSegment.getDescription(segment) }

  // ── Trial ──

  startTrial(tenantId, planId, durationDays) { return this.#trialManager.start(tenantId, planId, durationDays) }
  getTrial(tenantId) { return this.#trialManager.get(tenantId) }
  checkTrialExpiration(tenantId) { return this.#trialManager.checkExpiration(tenantId) }
  convertTrial(tenantId) { return this.#trialManager.convert(tenantId) }
  expireTrial(tenantId) { return this.#trialManager.expire(tenantId) }

  // ── Activation ──

  getActivationStatus(tenantId) { return this.#activationManager.getStatus(tenantId) }
  getActivationProgress(tenantId) { return this.#activationManager.getProgress(tenantId) }
  completeActivationStep(tenantId, stepId) { return this.#activationManager.completeStep(tenantId, stepId) }
  getActivationSteps(businessType) { return this.#activationManager.getSteps(businessType) }

  // ── Checklist ──

  getChecklist(businessType) { return this.#checklistManager.getChecklist(businessType) }
  getChecklistProgress(businessType, completedIds) { return this.#checklistManager.getProgress(businessType, completedIds) }

  // ── Growth ──

  getUpgradeRecommendation(tenantId) { return this.#upgradeManager.getRecommendation(tenantId) }
  requestUpgrade(tenantId, targetPlanId) { return this.#upgradeManager.requestUpgrade(tenantId, targetPlanId) }
  getAvailableUpgrades(tenantId) { return this.#upgradeManager.getAvailableUpgrades(tenantId) }
  getRecommendations(tenantId) { return this.#recommendationManager.getRecommendations(tenantId) }
  getFeatureRecommendations(tenantId) { return this.#recommendationManager.getFeatureRecommendations(tenantId) }

  // ── Usage ──

  recordUsage(tenantId, resource, amount) { return this.#usageAnalyzer.record(tenantId, resource, amount) }
  getUsageSummary(tenantId) { return this.#usageAnalyzer.getSummary(tenantId) }
  getUsageTrend(tenantId, resource, days) { return this.#usageAnalyzer.getTrend(tenantId, resource, days) }
  analyzeUpgradeReadiness(tenantId) { return this.#usageAnalyzer.analyzeUpgradeReadiness(tenantId) }

  // ── Churn ──

  getChurnRisk(tenantId) { return this.#churnManager.calculateRisk(tenantId) }
  getChurnDistribution() { return this.#churnManager.getDistribution() }
  getHighRiskCustomers() { return this.#churnManager.getHighRisk() }
  markRecovered(tenantId) { return this.#churnManager.markRecovered(tenantId) }

  // ── Renewal ──

  setRenewal(tenantId, date) { return this.#renewalManager.setRenewal(tenantId, date) }
  checkRenewal(tenantId) { return this.#renewalManager.checkRenewal(tenantId) }
  getUpcomingRenewals(days) { return this.#renewalManager.getUpcoming(days) }
  processRenewal(tenantId) { return this.#renewalManager.process(tenantId) }

  // ── Recovery ──

  createRecoveryAction(tenantId, type, data) { return this.#recoveryManager.createAction(tenantId, type, data) }
  getRecoverySuggestions(tenantId) { return this.#recoveryManager.getSuggestions(tenantId) }
  getRecoveryActions(tenantId) { return this.#recoveryManager.getByTenant(tenantId) }

  // ── Manager Access ──

  getCustomerManager() { return this.#customerManager }
  getTrialManager() { return this.#trialManager }
  getActivationManager() { return this.#activationManager }
  getUpgradeManager() { return this.#upgradeManager }
  getRecommendationManager() { return this.#recommendationManager }
  getUsageAnalyzer() { return this.#usageAnalyzer }
  getChurnManager() { return this.#churnManager }
  getRenewalManager() { return this.#renewalManager }
  getRecoveryManager() { return this.#recoveryManager }
}
