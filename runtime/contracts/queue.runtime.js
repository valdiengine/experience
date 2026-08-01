import { BaseRuntimeContract } from './base.runtime.js'

export class QueueRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'queue'
  }

  async publish(queue, message, options) {
    return null
  }

  async subscribe(queue, handler) {}

  async unsubscribe(queue, handler) {}

  async ack(queue, messageId) {}

  async nack(queue, messageId) {}

  async requeue(queue, messageId, delay) {}

  async purge(queue) {}

  async stats(queue) {
    return { pending: 0, processing: 0, failed: 0, delayed: 0 }
  }

  supports(feature) {
    const features = ['delay', 'retry', 'dead-letter', 'priority', 'scheduled', 'batch', 'fanout', 'durable']
    return features.includes(feature)
  }
}

export default QueueRuntime
