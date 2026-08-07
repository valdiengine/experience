/**
 * Media Events
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Event definitions for media operations.
 */

export const MEDIA_EVENTS = {
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_PROCESSING: 'media.processing',
  MEDIA_PROCESSED: 'media.processed',
  MEDIA_OPTIMIZED: 'media.optimized',
  MEDIA_VARIANTS_CREATED: 'media.variants.created',
  MEDIA_DELETED: 'media.deleted',
  MEDIA_FAILED: 'media.failed',
  MEDIA_STREAM_READY: 'media.stream.ready',
  MEDIA_METADATA_UPDATED: 'media.metadata.updated',
  MEDIA_CDN_PURGED: 'media.cdn.purged',
  MEDIA_QUEUE_ADDED: 'media.queue.added',
  MEDIA_QUEUE_COMPLETED: 'media.queue.completed',
  MEDIA_QUEUE_FAILED: 'media.queue.failed',
}

export function createMediaEvent(eventName, data = {}) {
  return {
    event: eventName,
    timestamp: new Date().toISOString(),
    data,
  }
}

export default MEDIA_EVENTS
