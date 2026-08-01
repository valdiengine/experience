export const WORDPRESS_EVENTS = {
  WORDPRESS_CONNECTED: 'wordpress:connected',
  WORDPRESS_DISCONNECTED: 'wordpress:disconnected',
  WORDPRESS_RECONNECTED: 'wordpress:reconnected',

  WORDPRESS_CONTENT_CREATED: 'wordpress:content_created',
  WORDPRESS_CONTENT_UPDATED: 'wordpress:content_updated',
  WORDPRESS_CONTENT_DELETED: 'wordpress:content_deleted',
  WORDPRESS_CONTENT_PUBLISHED: 'wordpress:content_published',
  WORDPRESS_CONTENT_UNPUBLISHED: 'wordpress:content_unpublished',

  WORDPRESS_MEDIA_UPLOADED: 'wordpress:media_uploaded',
  WORDPRESS_MEDIA_DELETED: 'wordpress:media_deleted',

  WORDPRESS_WEBHOOK_RECEIVED: 'wordpress:webhook_received',
  WORDPRESS_WEBHOOK_VERIFIED: 'wordpress:webhook_verified',
  WORDPRESS_WEBHOOK_FAILED: 'wordpress:webhook_failed',

  WORDPRESS_SYNC_STARTED: 'wordpress:sync_started',
  WORDPRESS_SYNC_COMPLETED: 'wordpress:sync_completed',
  WORDPRESS_SYNC_FAILED: 'wordpress:sync_failed',

  WORDPRESS_RATE_LIMITED: 'wordpress:rate_limited',
  WORDPRESS_ERROR: 'wordpress:error',
}

export function createWordPressEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'wordpress-provider', payload }
}

export default WORDPRESS_EVENTS
