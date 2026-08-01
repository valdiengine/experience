import { JobStatus } from './sync.job.js'
import { SYNC_EVENTS, createSyncEvent } from '../events/sync.events.js'
import { SyncQueueError } from '../errors/sync.errors.js'

export class SyncQueue {
  #queues = new Map()
  #eventBus = null
  #maxQueueSize = 1000
  #maxConcurrent = 5

  constructor(options = {}) {
    this.#maxQueueSize = options.maxQueueSize || 1000
    this.#maxConcurrent = options.maxConcurrent || 5
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  enqueue(job, options = {}) {
    const priority = options.priority || 0
    const queueName = options.queueName || 'default'

    if (!this.#queues.has(queueName)) {
      this.#queues.set(queueName, [])
    }

    const queue = this.#queues.get(queueName)

    if (queue.length >= this.#maxQueueSize) {
      this.#emit(SYNC_EVENTS.SYNC_QUEUE_BACKPRESSURE, {
        queueName,
        size: queue.length,
        maxSize: this.#maxQueueSize,
      })
      throw new SyncQueueError(`Queue "${queueName}" is full (max: ${this.#maxQueueSize})`, { queueName, size: queue.length })
    }

    queue.push({
      job,
      priority,
      enqueuedAt: Date.now(),
      attempts: 0,
    })

    queue.sort((a, b) => b.priority - a.priority)

    return job.id
  }

  dequeue(queueName = 'default') {
    const queue = this.#queues.get(queueName)
    if (!queue || queue.length === 0) return null

    const item = queue.shift()
    return item
  }

  dequeueByPriority(queueName = 'default') {
    const queue = this.#queues.get(queueName)
    if (!queue || queue.length === 0) return null

    let highestIdx = 0
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].priority > queue[highestIdx].priority) {
        highestIdx = i
      }
    }

    return queue.splice(highestIdx, 1)[0]
  }

  peek(queueName = 'default') {
    const queue = this.#queues.get(queueName)
    if (!queue || queue.length === 0) return null
    return { ...queue[0] }
  }

  remove(jobId, queueName = 'default') {
    const queue = this.#queues.get(queueName)
    if (!queue) return false

    const idx = queue.findIndex(item => item.job?.id === jobId)
    if (idx === -1) return false

    queue.splice(idx, 1)
    return true
  }

  cancel(jobId, queueName = 'default') {
    const queue = this.#queues.get(queueName)
    if (!queue) return false

    const item = queue.find(i => i.job?.id === jobId)
    if (!item) return false

    item.job.cancel()
    this.remove(jobId, queueName)
    return true
  }

  size(queueName = 'default') {
    const queue = this.#queues.get(queueName)
    return queue?.length || 0
  }

  totalSize() {
    let total = 0
    for (const queue of this.#queues.values()) {
      total += queue.length
    }
    return total
  }

  isEmpty(queueName = 'default') {
    return this.size(queueName) === 0
  }

  listQueues() {
    const result = {}
    for (const [name, queue] of this.#queues) {
      result[name] = {
        size: queue.length,
        pending: queue.filter(i => i.job?.status === JobStatus.PENDING || i.job?.status === JobStatus.QUEUED).length,
      }
    }
    return result
  }

  clear(queueName = 'default') {
    if (queueName) {
      this.#queues.delete(queueName)
    } else {
      this.#queues.clear()
    }
  }

  drain() {
    this.#queues.clear()
    this.#emit(SYNC_EVENTS.SYNC_QUEUE_DRAINED, { timestamp: Date.now() })
  }

  #emit(event, payload) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createSyncEvent(event, payload))
    }
  }
}

export default SyncQueue
