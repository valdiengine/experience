/**
 * Recovery Manager — Re-engage inactive customers
 *
 * Business-agnostic: recovery actions via CommunicationCapability (through context)
 */

import { LIFECYCLE_EVENTS } from '../lifecycle.events.js'

export class RecoveryManager {
  #recoveryActions = new Map()
  #context = null
  #eventBus = null

  constructor(context) {
    this.#context = context
    this.#eventBus = context.eventBus
  }

  /**
   * Create a recovery action for a tenant
   * @param {string} tenantId
   * @param {string} type - 'inactive', 'churn_risk', 'trial_expiring'
   * @param {object} data
   * @returns {object}
   */
  createAction(tenantId, type, data = {}) {
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const action = {
      id,
      tenantId,
      type,
      status: 'pending',
      message: this.#getMessage(type, data),
      channel: data.channel || 'email',
      data,
      createdAt: new Date().toISOString(),
      sentAt: null,
      responseAt: null,
    }

    this.#recoveryActions.set(id, action)
    return { success: true, action }
  }

  /**
   * Send recovery message
   * @param {string} actionId
   * @returns {object}
   */
  async send(actionId) {
    const action = this.#recoveryActions.get(actionId)
    if (!action) return { success: false, error: 'Action not found' }

    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication?.send) {
      return { success: false, error: 'Communication capability not available' }
    }

    const result = await communication.send({
      channel: action.channel,
      recipient: action.tenantId,
      body: action.message,
    })

    if (result.success) {
      action.status = 'sent'
      action.sentAt = new Date().toISOString()
      this.#recoveryActions.set(actionId, action)
    } else {
      action.status = 'failed'
      action.error = result.error
      this.#recoveryActions.set(actionId, action)
    }

    return result
  }

  /**
   * Get recovery actions for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getByTenant(tenantId) {
    return Array.from(this.#recoveryActions.values())
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get pending recovery actions
   * @returns {object[]}
   */
  getPending() {
    return Array.from(this.#recoveryActions.values())
      .filter(a => a.status === 'pending')
  }

  /**
   * Generate recovery suggestions for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getSuggestions(tenantId) {
    const suggestions = []
    const churnRisk = this.#context?.lifecycle?.churnManager?.getRisk?.(tenantId)

    if (churnRisk?.riskLevel === 'high' || churnRisk?.riskLevel === 'critical') {
      suggestions.push({
        type: 'churn_risk',
        priority: 'high',
        message: 'Customer at high churn risk — send re-engagement campaign',
        channel: 'email',
      })
    }

    const customer = this.#context?.lifecycle?.customerManager?.get?.(tenantId)
    if (customer?.lastActivity) {
      const daysSince = Math.floor((Date.now() - new Date(customer.lastActivity).getTime()) / 86400000)
      if (daysSince > 14) {
        suggestions.push({
          type: 'inactive',
          priority: 'medium',
          message: `No activity for ${daysSince} days — send welcome back message`,
          channel: 'email',
        })
      }
    }

    return suggestions
  }

  /**
   * Mark recovery as responded
   * @param {string} actionId
   * @returns {object}
   */
  markResponded(actionId) {
    const action = this.#recoveryActions.get(actionId)
    if (!action) return { success: false, error: 'Action not found' }

    action.status = 'responded'
    action.responseAt = new Date().toISOString()
    this.#recoveryActions.set(actionId, action)

    this.#emit(LIFECYCLE_EVENTS.CUSTOMER_RECOVERED, { tenantId: action.tenantId })
    return { success: true }
  }

  #getMessage(type, data) {
    const messages = {
      inactive: `We noticed you haven't been active recently. Your ${data.plan || 'business'} profile is waiting for you!`,
      churn_risk: `We'd love to help you get the most out of your platform. Let us know if you need anything!`,
      trial_expiring: `Your trial is ending soon. Upgrade now to keep all your features!`,
      renewal_reminder: `Your subscription is renewing soon. Make sure your payment method is up to date.`,
    }
    return messages[type] || `We miss you! Come back and see what's new.`
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
