# Storage Events

## Overview

Storage layer emits events for all significant operations, enabling reactive patterns and audit trails.

## Event Definitions

### Event Registry

```javascript
export const STORAGE_EVENTS = {
  ASSET_UPLOADED: 'storage.asset.uploaded',
  ASSET_DELETED: 'storage.asset.deleted',
  ASSET_ACCESSED: 'storage.asset.accessed',
  ASSET_COPIED: 'storage.asset.copied',
  ASSET_MOVED: 'storage.asset.moved',
  ASSET_ERROR: 'storage.asset.error',
  QUOTA_EXCEEDED: 'storage.quota.exceeded',
  PROVIDER_SWITCHED: 'storage.provider.switched',
}
```

## Event Payloads

### storage.asset.uploaded

Emitted when an asset is successfully uploaded.

```javascript
{
  event: 'storage.asset.uploaded',
  timestamp: '2024-01-15T10:30:00.000Z',
  data: {
    assetId: 'uuid',
    provider: 'local',
    fileName: 'photo.jpg',
    fileSize: 102400,
    mimeType: 'image/jpeg',
    path: 'tenants/123/photos/photo.jpg',
    url: 'http://localhost:3000/storage/tenants/123/photos/photo.jpg',
    checksum: 'abc123',
    tenantId: 'tenant-uuid',
    destinationId: 'dest-uuid',
    metadata: { uploadedBy: 'user-123' }
  }
}
```

### storage.asset.deleted

Emitted when an asset is deleted.

```javascript
{
  event: 'storage.asset.deleted',
  timestamp: '2024-01-15T11:00:00.000Z',
  data: {
    assetId: 'uuid',
    provider: 'local',
    fileName: 'photo.jpg',
    tenantId: 'tenant-uuid'
  }
}
```

### storage.asset.accessed

Emitted when an asset is downloaded or streamed.

```javascript
{
  event: 'storage.asset.accessed',
  timestamp: '2024-01-15T12:00:00.000Z',
  data: {
    assetId: 'uuid',
    accessType: 'download', // or 'stream'
    userId: 'user-uuid',
    tenantId: 'tenant-uuid'
  }
}
```

### storage.asset.copied

Emitted when an asset is copied to a new location.

```javascript
{
  event: 'storage.asset.copied',
  timestamp: '2024-01-15T13:00:00.000Z',
  data: {
    assetId: 'uuid',
    sourcePath: 'photos/original.jpg',
    destPath: 'photos/copy.jpg',
    provider: 'local',
    tenantId: 'tenant-uuid'
  }
}
```

### storage.asset.moved

Emitted when an asset is moved to a new location.

```javascript
{
  event: 'storage.asset.moved',
  timestamp: '2024-01-15T14:00:00.000Z',
  data: {
    assetId: 'uuid',
    sourcePath: 'uploads/old-name.jpg',
    destPath: 'uploads/new-name.jpg',
    provider: 'local',
    tenantId: 'tenant-uuid'
  }
}
```

### storage.asset.error

Emitted when an asset operation fails.

```javascript
{
  event: 'storage.asset.error',
  timestamp: '2024-01-15T15:00:00.000Z',
  data: {
    assetId: 'uuid',
    operation: 'upload',
    error: 'File too large',
    errorCode: 'STORAGE_VALIDATION_ERROR',
    provider: 'local',
    tenantId: 'tenant-uuid'
  }
}
```

### storage.quota.exceeded

Emitted when tenant storage quota is exceeded.

```javascript
{
  event: 'storage.quota.exceeded',
  timestamp: '2024-01-15T16:00:00.000Z',
  data: {
    tenantId: 'tenant-uuid',
    quotaType: 'storage_bytes',
    currentUsage: 10737418240, // 10GB
    quotaLimit: 10737418240,   // 10GB
    percentUsed: 100
  }
}
```

### storage.provider.switched

Emitted when the active storage provider changes.

```javascript
{
  event: 'storage.provider.switched',
  timestamp: '2024-01-15T17:00:00.000Z',
  data: {
    previousProvider: 'local',
    currentProvider: 's3',
    userId: 'admin-uuid',
    reason: 'manual' // or 'automatic', 'failure'
  }
}
```

## Event Creation

### Helper Function

```javascript
export function createStorageEvent(eventName, data = {}) {
  return {
    event: eventName,
    timestamp: new Date().toISOString(),
    data,
  }
}
```

### Usage

```javascript
import { STORAGE_EVENTS, createStorageEvent } from './storage.events.js'

// In StorageService
this.emit(
  STORAGE_EVENTS.ASSET_UPLOADED,
  createStorageEvent(STORAGE_EVENTS.ASSET_UPLOADED, { assetId, provider })
)
```

## Event Subscription

### In Capabilities

```javascript
import { STORAGE_EVENTS } from './storage.events.js'

class MyCapability {
  async init(context) {
    context.eventBus.subscribe(
      STORAGE_EVENTS.ASSET_UPLOADED,
      this.handleAssetUploaded.bind(this)
    )
  }

  async handleAssetUploaded(event) {
    console.log('Asset uploaded:', event.data.assetId)
  }
}
```

### In Business Services

```javascript
import { STORAGE_EVENTS } from '../../capabilities/storage/storage.events.js'

class NotificationService {
  async onAssetUploaded(event) {
    await this.sendUploadNotification(event.data)
  }
}
```

## Event Filtering

### By Tenant

```javascript
context.eventBus.subscribe(
  STORAGE_EVENTS.ASSET_UPLOADED,
  (event) => event.data.tenantId === context.tenant.id
)
```

### By Provider

```javascript
context.eventBus.subscribe(
  STORAGE_EVENTS.ASSET_UPLOADED,
  (event) => event.data.provider === 's3'
)
```

## Audit Trail

Events form an audit trail for compliance:

```javascript
// Query events for audit
const events = await eventStore.findMany({
  where: {
    event: STORAGE_EVENTS.ASSET_DELETED,
    'data.tenantId': tenantId,
    timestamp: {
      gte: startDate,
      lte: endDate
    }
  }
})
```

## Validation Checklist

- [x] All events defined
- [x] Payloads documented
- [x] Helper function exists
- [x] Events emitted on operations
- [x] Events include tenant context
- [x] Events include provider context
- [x] Error events include error details
