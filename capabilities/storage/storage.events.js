/**
 * Storage Events
 *
 * P12.3.2.0.2 — Storage Capability Boundary Implementation
 *
 * Event definitions for storage operations.
 */

export const STORAGE_EVENTS = {
  ASSET_UPLOADED: 'storage.asset.uploaded',
  ASSET_DELETED: 'storage.asset.deleted',
  ASSET_ACCESSED: 'storage.asset.accessed',
  ASSETCopied: 'storage.asset.copied',
  ASSET_MOVED: 'storage.asset.moved',
  ASSET_ERROR: 'storage.asset.error',
  QUOTA_EXCEEDED: 'storage.quota.exceeded',
  PROVIDER_SWITCHED: 'storage.provider.switched',
}

export function createStorageEvent(eventName, data = {}) {
  return {
    event: eventName,
    timestamp: new Date().toISOString(),
    data,
  }
}

export default STORAGE_EVENTS
