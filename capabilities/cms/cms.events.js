/**
 * CMS Capability — Events
 *
 * Standard events for CMS lifecycle
 */
import { CAPABILITY_EVENTS } from '../core/events.js'

export const CMS_EVENTS = {
  CONTENT_LOADED: 'cms:content_loaded',
  CONTENT_UPDATED: 'cms:content_updated',
  CONTENT_DELETED: 'cms:content_deleted',
  SYNC_STARTED: 'cms:sync_started',
  SYNC_COMPLETED: 'cms:sync_completed',
  SYNC_FAILED: 'cms:sync_failed',
}
