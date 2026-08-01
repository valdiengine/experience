/**
 * Transaction Manager — Central transaction history
 *
 * Business-agnostic: records all financial movements
 */

import { TRANSACTION_TYPES, TRANSACTION_SCHEMA } from './billing.schema.js'
import { BILLING_EVENTS } from './billing.events.js'

export class TransactionManager {
  #transactions = new Map()
  #counter = 0
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
  }

  /**
   * Create a transaction record
   * @param {object} data - { tenantId, type, amount, currency, status, invoiceId, paymentId, reference, metadata }
   * @returns {object}
   */
  create(data) {
    if (!data?.tenantId) return { success: false, error: 'Tenant ID is required' }
    if (!data?.type) return { success: false, error: 'Transaction type is required' }
    if (!Object.values(TRANSACTION_TYPES).includes(data.type)) {
      return { success: false, error: `Invalid transaction type: ${data.type}` }
    }

    this.#counter++
    const id = `txn_${Date.now()}_${this.#counter}`

    const transaction = {
      ...TRANSACTION_SCHEMA,
      id,
      tenantId: data.tenantId,
      type: data.type,
      amount: data.amount || 0,
      currency: data.currency || 'CLP',
      status: data.status || 'completed',
      invoiceId: data.invoiceId || null,
      paymentId: data.paymentId || null,
      reference: data.reference || null,
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
    }

    this.#transactions.set(id, transaction)
    return { success: true, transaction }
  }

  /**
   * Get transaction by ID
   * @param {string} transactionId
   * @returns {object|null}
   */
  get(transactionId) {
    return this.#transactions.get(transactionId) || null
  }

  /**
   * Get all transactions for a tenant
   * @param {string} tenantId
   * @param {object} filter - { type, status }
   * @returns {object[]}
   */
  getByTenant(tenantId, filter = {}) {
    let txns = Array.from(this.#transactions.values()).filter(t => t.tenantId === tenantId)
    if (filter.type) txns = txns.filter(t => t.type === filter.type)
    if (filter.status) txns = txns.filter(t => t.status === filter.status)
    return txns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get transactions by type
   * @param {string} type
   * @returns {object[]}
   */
  getByType(type) {
    return Array.from(this.#transactions.values())
      .filter(t => t.type === type)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get transaction report for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getReport(tenantId) {
    const txns = this.getByTenant(tenantId)

    const byType = {}
    const byStatus = {}
    let totalAmount = 0

    for (const txn of txns) {
      byType[txn.type] = (byType[txn.type] || 0) + 1
      byStatus[txn.status] = (byStatus[txn.status] || 0) + 1
      if (txn.status === 'completed') totalAmount += txn.amount
    }

    return {
      tenantId,
      totalTransactions: txns.length,
      totalAmount,
      byType,
      byStatus,
      lastTransaction: txns[0] || null,
    }
  }

  /**
   * Get all transactions
   * @param {object} filter
   * @returns {object[]}
   */
  getAll(filter = {}) {
    let txns = Array.from(this.#transactions.values())
    if (filter.tenantId) txns = txns.filter(t => t.tenantId === filter.tenantId)
    if (filter.type) txns = txns.filter(t => t.type === filter.type)
    if (filter.status) txns = txns.filter(t => t.status === filter.status)
    return txns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get transaction count
   * @param {string} tenantId
   * @returns {number}
   */
  count(tenantId) {
    if (tenantId) return this.getByTenant(tenantId).length
    return this.#transactions.size
  }
}
