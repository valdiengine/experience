/**
 * Activation Manager — Onboarding progress tracking
 *
 * Business-agnostic: tracks activation steps per business type
 */

import { ACTIVATION_STEPS } from '../lifecycle.schema.js'
import { LIFECYCLE_EVENTS } from '../lifecycle.events.js'

export class ActivationManager {
  #activations = new Map()
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
  }

  /**
   * Get activation steps for a business type
   * @param {string} businessType
   * @returns {object[]}
   */
  getSteps(businessType) {
    return ACTIVATION_STEPS[businessType] || ACTIVATION_STEPS.service
  }

  /**
   * Get or create activation for a tenant
   * @param {string} tenantId
   * @param {string} businessType
   * @returns {object}
   */
  getOrCreate(tenantId, businessType = 'service') {
    if (this.#activations.has(tenantId)) {
      return this.#activations.get(tenantId)
    }

    const steps = this.getSteps(businessType)
    const activation = {
      tenantId,
      businessType,
      steps: steps.map(s => ({ ...s, completed: false, completedAt: null })),
      startedAt: new Date().toISOString(),
      completedAt: null,
    }

    this.#activations.set(tenantId, activation)
    return activation
  }

  /**
   * Complete an activation step
   * @param {string} tenantId
   * @param {string} stepId
   * @returns {object}
   */
  completeStep(tenantId, stepId) {
    const activation = this.#activations.get(tenantId)
    if (!activation) return { success: false, error: 'Activation not found' }

    const step = activation.steps.find(s => s.id === stepId)
    if (!step) return { success: false, error: `Step ${stepId} not found` }
    if (step.completed) return { success: false, error: 'Step already completed' }

    step.completed = true
    step.completedAt = new Date().toISOString()

    this.#activations.set(tenantId, activation)

    this.#emit(LIFECYCLE_EVENTS.ACTIVATION_STEP_COMPLETED, { tenantId, stepId })

    if (this.isComplete(tenantId)) {
      activation.completedAt = new Date().toISOString()
      this.#activations.set(tenantId, activation)
      this.#emit(LIFECYCLE_EVENTS.ACTIVATION_COMPLETED, { tenantId })
    }

    return { success: true, step }
  }

  /**
   * Check if activation is complete
   * @param {string} tenantId
   * @returns {boolean}
   */
  isComplete(tenantId) {
    const activation = this.#activations.get(tenantId)
    if (!activation) return false
    return activation.steps.every(s => s.completed)
  }

  /**
   * Get activation progress
   * @param {string} tenantId
   * @returns {object}
   */
  getProgress(tenantId) {
    const activation = this.#activations.get(tenantId)
    if (!activation) return { percentage: 0, completed: 0, total: 0, blockers: [] }

    const completed = activation.steps.filter(s => s.completed).length
    const total = activation.steps.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const blockers = activation.steps
      .filter(s => !s.completed)
      .map(s => ({ id: s.id, name: s.name, weight: s.weight }))

    return {
      percentage,
      completed,
      total,
      blockers,
      isComplete: percentage === 100,
      startedAt: activation.startedAt,
      completedAt: activation.completedAt,
    }
  }

  /**
   * Get activation status
   * @param {string} tenantId
   * @returns {object}
   */
  getStatus(tenantId) {
    const activation = this.#activations.get(tenantId)
    if (!activation) return { exists: false }

    return {
      exists: true,
      businessType: activation.businessType,
      ...this.getProgress(tenantId),
    }
  }

  /**
   * Get all activations
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#activations.values())
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
