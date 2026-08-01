/**
 * Notifications Capability — Batch Processor
 *
 * Handles batched notification sending for efficiency
 * Business-agnostic: batching is purely a performance optimization
 */
import { NOTIFICATION_EVENTS } from '../notification.events.js'
import { NOTIFICATION_STATUS } from '../notification.schema.js'

export class BatchProcessor {
  #batches = new Map()
  #eventBus = null
  #sendFn = null
  #defaultBatchSize = 50
  #defaultDelayMs = 1000

  constructor(eventBus, sendFn) {
    this.#eventBus = eventBus
    this.#sendFn = sendFn
  }

  /**
   * Create a batch of notifications
   * @param {object} config - { tenantId, channel, notifications, batchSize, delayMs }
   * @returns {{ success: boolean, batchId?: string, error?: string }}
   */
  createBatch(config) {
    const { tenantId, channel, notifications, batchSize, delayMs } = config

    if (!notifications || !notifications.length) {
      return { success: false, error: 'No notifications provided' }
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const batch = {
      id: batchId,
      tenantId,
      channel,
      notifications: notifications.map(n => ({
        ...n,
        batchId,
        status: NOTIFICATION_STATUS.QUEUED,
      })),
      count: notifications.length,
      sent: 0,
      failed: 0,
      status: 'pending',
      batchSize: batchSize || this.#defaultBatchSize,
      delayMs: delayMs || this.#defaultDelayMs,
      startedAt: new Date().toISOString(),
      completedAt: null,
    }

    this.#batches.set(batchId, batch)
    this.#eventBus?.emit(NOTIFICATION_EVENTS.BATCH_CREATED, {
      batchId,
      count: batch.count,
      channel,
    })

    return { success: true, batchId }
  }

  /**
   * Process a batch
   * @param {string} batchId
   * @returns {Promise<{ success: boolean, result?: object, error?: string }>}
   */
  async processBatch(batchId) {
    const batch = this.#batches.get(batchId)
    if (!batch) {
      return { success: false, error: `Batch ${batchId} not found` }
    }

    if (batch.status === 'processing' || batch.status === 'completed') {
      return { success: false, error: `Batch ${batchId} is ${batch.status}` }
    }

    batch.status = 'processing'

    try {
      const chunks = this.#chunk(batch.notifications, batch.batchSize)

      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map(notification => this.#sendFn(notification))
        )

        for (let i = 0; i < results.length; i++) {
          const result = results[i]
          if (result.status === 'fulfilled' && result.value?.success) {
            chunk[i].status = NOTIFICATION_STATUS.SENT
            batch.sent++
          } else {
            chunk[i].status = NOTIFICATION_STATUS.FAILED
            chunk[i].error = result.reason?.message || result.value?.error || 'Unknown error'
            batch.failed++
          }
        }

        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await this.#delay(batch.delayMs)
        }
      }

      batch.status = 'completed'
      batch.completedAt = new Date().toISOString()

      this.#eventBus?.emit(NOTIFICATION_EVENTS.BATCH_COMPLETED, {
        batchId,
        sent: batch.sent,
        failed: batch.failed,
        total: batch.count,
      })

      return {
        success: true,
        result: {
          batchId,
          sent: batch.sent,
          failed: batch.failed,
          total: batch.count,
        },
      }
    } catch (error) {
      batch.status = 'failed'
      this.#eventBus?.emit(NOTIFICATION_EVENTS.BATCH_FAILED, {
        batchId,
        error: error.message,
      })
      return { success: false, error: error.message }
    }
  }

  /**
   * Get batch by ID
   * @param {string} batchId
   * @returns {object|null}
   */
  get(batchId) {
    return this.#batches.get(batchId) || null
  }

  /**
   * Get all batches for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getByTenant(tenantId) {
    const batches = []
    for (const batch of this.#batches.values()) {
      if (batch.tenantId === tenantId) {
        batches.push({ ...batch })
      }
    }
    return batches
  }

  /**
   * Get batch statistics for a tenant
   * @param {string} tenantId
   * @returns {{ totalBatches: number, totalSent: number, totalFailed: number, avgBatchSize: number }}
   */
  getStats(tenantId) {
    const batches = this.getByTenant(tenantId)
    const totalSent = batches.reduce((sum, b) => sum + b.sent, 0)
    const totalFailed = batches.reduce((sum, b) => sum + b.failed, 0)
    const totalNotifications = batches.reduce((sum, b) => sum + b.count, 0)

    return {
      totalBatches: batches.length,
      totalSent,
      totalFailed,
      avgBatchSize: batches.length > 0 ? Math.round(totalNotifications / batches.length) : 0,
    }
  }

  #chunk(arr, size) {
    const chunks = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }

  #delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clear all data
   */
  clear() {
    this.#batches.clear()
  }
}
