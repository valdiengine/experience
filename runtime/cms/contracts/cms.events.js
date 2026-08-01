export const CMS_EVENTS = {
  // Content
  CMS_CONTENT_CREATED: 'cms:content_created',
  CMS_CONTENT_UPDATED: 'cms:content_updated',
  CMS_CONTENT_DELETED: 'cms:content_deleted',
  CMS_CONTENT_PUBLISHED: 'cms:content_published',
  CMS_CONTENT_UNPUBLISHED: 'cms:content_unpublished',
  CMS_CONTENT_ARCHIVED: 'cms:content_archived',
  CMS_CONTENT_RESTORED: 'cms:content_restored',

  // Media
  CMS_MEDIA_UPLOADED: 'cms:media_uploaded',
  CMS_MEDIA_PROCESSED: 'cms:media_processed',
  CMS_MEDIA_DELETED: 'cms:media_deleted',

  // SEO
  CMS_SEO_UPDATED: 'cms:seo_updated',
  CMS_SITEMAP_GENERATED: 'cms:sitemap_generated',

  // Sync
  CMS_SYNC_STARTED: 'cms:sync_started',
  CMS_SYNC_COMPLETED: 'cms:sync_completed',
  CMS_SYNC_FAILED: 'cms:sync_failed',
  CMS_SYNC_CONFLICT: 'cms:sync_conflict',
  CMS_SYNC_CANCELLED: 'cms:sync_cancelled',

  // Webhook
  CMS_WEBHOOK_RECEIVED: 'cms:webhook_received',
  CMS_WEBHOOK_VERIFIED: 'cms:webhook_verified',
  CMS_WEBHOOK_FAILED: 'cms:webhook_failed',

  // Preview
  CMS_PREVIEW_GENERATED: 'cms:preview_generated',
  CMS_PREVIEW_EXPIRED: 'cms:preview_expired',

  // Provider
  CMS_PROVIDER_CHANGED: 'cms:provider_changed',
  CMS_PROVIDER_UNAVAILABLE: 'cms:provider_unavailable',

  // Error
  CMS_ERROR: 'cms:error',
}

export function createCmsEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'cms-contracts', payload }
}

export default CMS_EVENTS
