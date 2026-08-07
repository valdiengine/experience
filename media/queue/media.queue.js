/**
 * Media Queue
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Queue architecture for asynchronous media processing.
 * Future-ready for job workers like BullMQ, RabbitMQ, etc.
 */

import { MediaQueueError } from '../media.errors.js'
import { MEDIA_EVENTS, createMediaEvent } from '../media.events.js'

export class MediaQueue {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled || false,
      provider: config.provider || 'memory',
      concurrency: config.concurrency || 3,
      ...config,
    }
    this.jobs = new Map()
    this.processors = new Map()
    this.eventBus = null
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus
  }

  async enqueue(assetData, options = {}) {
    const jobId = this.generateJobId()

    const job = {
      id: jobId,
      status: 'pending',
      data: assetData,
      options,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      progress: 0,
    }

    this.jobs.set(jobId, job)

    if (this.eventBus) {
      this.eventBus.emit(
        MEDIA_EVENTS.MEDIA_QUEUE_ADDED,
        createMediaEvent(MEDIA_EVENTS.MEDIA_QUEUE_ADDED, { jobId, status: 'pending' })
      )
    }

    if (this.config.enabled) {
      this.processJob(job).catch((error) => {
        job.status = 'failed'
        job.error = error.message
        this.emitJobEvent(job)
      })
    }

    return job
  }

  async processJob(job) {
    job.status = 'processing'
    job.startedAt = new Date().toISOString()
    this.emitJobEvent(job)

    try {
      if (this.config.provider === 'bullmq') {
        await this.processWithBullMQ(job)
      } else {
        await this.processWithMemory(job)
      }

      job.status = 'completed'
      job.completedAt = new Date().toISOString()
      job.progress = 100

      this.emitJobEvent(job)

      return job
    } catch (error) {
      job.status = 'failed'
      job.error = error.message
      job.completedAt = new Date().toISOString()

      this.emitJobEvent(job)

      throw error
    }
  }

  async processWithMemory(job) {
    const processor = this.getProcessor(job.data.mimeType)

    if (!processor) {
      throw new MediaQueueError('No processor available for media type', job.id)
    }

    await processor(job.data, (progress) => {
      job.progress = progress
      this.emitJobEvent(job)
    })
  }

  async processWithBullMQ(job) {
    console.warn('[MediaQueue] BullMQ processing requires bullmq dependency')
    throw new MediaQueueError('BullMQ provider not fully implemented')
  }

  getProcessor(mimeType) {
    if (this.processors.has('default')) {
      return this.processors.get('default')
    }

    if (mimeType?.startsWith('image/')) {
      return this.processors.get('image') || this.processors.get('default')
    }

    if (mimeType?.startsWith('video/')) {
      return this.processors.get('video') || this.processors.get('default')
    }

    return this.processors.get('default')
  }

  registerProcessor(type, processor) {
    this.processors.set(type, processor)
  }

  async getJob(jobId) {
    return this.jobs.get(jobId) || null
  }

  async getJobs(filter = {}) {
    const jobs = Array.from(this.jobs.values())

    if (filter.status) {
      return jobs.filter((job) => job.status === filter.status)
    }

    if (filter.limit) {
      return jobs.slice(0, filter.limit)
    }

    return jobs
  }

  async cancelJob(jobId) {
    const job = this.jobs.get(jobId)

    if (!job) {
      throw new MediaQueueError('Job not found', jobId)
    }

    if (job.status === 'completed') {
      throw new MediaQueueError('Cannot cancel completed job', jobId)
    }

    if (job.status === 'processing') {
      throw new MediaQueueError('Cannot cancel in-progress job', jobId)
    }

    job.status = 'cancelled'
    job.completedAt = new Date().toISOString()

    this.emitJobEvent(job)

    return job
  }

  async retryJob(jobId) {
    const job = this.jobs.get(jobId)

    if (!job) {
      throw new MediaQueueError('Job not found', jobId)
    }

    if (job.status !== 'failed' && job.status !== 'cancelled') {
      throw new MediaQueueError('Can only retry failed or cancelled jobs', jobId)
    }

    job.status = 'pending'
    job.error = null
    job.progress = 0
    job.completedAt = null

    if (this.config.enabled) {
      this.processJob(job).catch((error) => {
        job.status = 'failed'
        job.error = error.message
        this.emitJobEvent(job)
      })
    }

    return job
  }

  emitJobEvent(job) {
    if (!this.eventBus) return

    const eventMap = {
      pending: MEDIA_EVENTS.MEDIA_QUEUE_ADDED,
      processing: MEDIA_EVENTS.MEDIA_PROCESSING,
      completed: MEDIA_EVENTS.MEDIA_QUEUE_COMPLETED,
      failed: MEDIA_EVENTS.MEDIA_QUEUE_FAILED,
    }

    const event = eventMap[job.status]

    if (event) {
      this.eventBus.emit(
        event,
        createMediaEvent(event, {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          error: job.error,
        })
      )
    }
  }

  generateJobId() {
    return `media_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async healthCheck() {
    return {
      queue: 'healthy',
      provider: this.config.provider,
      enabled: this.config.enabled,
      pending: Array.from(this.jobs.values()).filter((j) => j.status === 'pending').length,
      processing: Array.from(this.jobs.values()).filter((j) => j.status === 'processing').length,
      completed: Array.from(this.jobs.values()).filter((j) => j.status === 'completed').length,
      failed: Array.from(this.jobs.values()).filter((j) => j.status === 'failed').length,
    }
  }

  async clear() {
    this.jobs.clear()
  }

  static getSupportedProviders() {
    return ['memory', 'bullmq', 'rabbitmq', 'sqs']
  }
}

export default MediaQueue
