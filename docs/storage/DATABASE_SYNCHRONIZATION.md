# Database Synchronization

## Overview

Storage layer maintains synchronized state between providers and database through a strict operation pipeline.

## Synchronization Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                        UPLOAD FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Client Request                                               │
│         ↓                                                       │
│  2. StorageService.uploadAsset()                                 │
│         ↓                                                       │
│  3. Validate asset data                                          │
│         ↓                                                       │
│  4. Provider.upload()                                            │
│         ↓                                                       │
│  5. File stored (local/S3/R2)                                    │
│         ↓                                                       │
│  6. Database: INSERT assets                                       │
│         ↓                                                       │
│  7. Database: INSERT asset_metadata                               │
│         ↓                                                       │
│  8. Emit storage.asset.uploaded event                             │
│         ↓                                                       │
│  9. Return assetId + provider response                           │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

| Table | Purpose | Operations |
|-------|---------|------------|
| assets | Central asset registry | INSERT on upload, UPDATE on move, DELETE on remove |
| asset_metadata | Technical metadata | INSERT on upload, UPDATE on processing |
| asset_versions | Transformations | INSERT on thumbnail generation |
| asset_permissions | Access control | INSERT on grant, DELETE on revoke |
| storage_providers | Provider registry | SELECT for config |
| storage_locations | Physical paths | SELECT for URLs |

### Asset States

```javascript
const ASSET_STATUS = {
  ACTIVE: 'active',      // Normal state
  PROCESSING: 'processing', // Being processed
  ARCHIVED: 'archived',  // Soft deleted
  DELETED: 'deleted'    // Hard deleted
}
```

## Synchronization Points

### Upload Synchronization

```javascript
async uploadAsset(assetData, options = {}) {
  // 1. Validate
  this.validateAssetData(assetData)

  // 2. Get provider
  const provider = this.getProvider(options.provider)

  // 3. Upload to provider
  const result = await provider.upload(assetData, options)

  // 4. Sync to database
  const assetId = await this.syncAssetCreate({
    ...result,
    tenantId: options.tenantId,
    metadata: assetData.metadata
  })

  // 5. Emit event
  this.emit('storage.asset.uploaded', { assetId, provider: provider.type })

  return { ...result, assetId }
}
```

### Delete Synchronization

```javascript
async deleteAsset(assetId, options = {}) {
  // 1. Get provider
  const provider = this.getProvider(options.provider)

  // 2. Delete from provider
  await provider.delete(assetId, options)

  // 3. Sync to database
  await this.syncAssetDelete(assetId)

  // 4. Emit event
  this.emit('storage.asset.deleted', { assetId })

  return { deleted: true }
}
```

## Consistency Guarantees

### Atomic Operations

Upload is atomic - either all succeed or all fail:

```javascript
async uploadAsset(assetData) {
  const provider = this.getProvider()

  try {
    // Upload to provider
    const result = await provider.upload(assetData)

    // Sync to database
    await this.database.transaction(async (trx) => {
      await trx.assets.create({ ... })
      await trx.assetMetadata.create({ ... })
    })

    this.emit('storage.asset.uploaded', { ... })
    return result

  } catch (error) {
    // If database sync fails, cleanup provider
    await provider.delete(result.key)
    throw error
  }
}
```

### Synchronization Order

1. Provider operation first (source of truth)
2. Database sync second (metadata)
3. Event emission last (notifications)

### Failure Recovery

If database sync fails after provider upload:

1. Provider delete is called
2. Error is thrown to client
3. No orphaned files in storage

If event emission fails:

1. Database and provider are consistent
2. Event can be replayed from database state

## Multi-Tenant Synchronization

### Tenant Isolation

All operations filter by tenant:

```javascript
async syncAssetQuery(tenantId, filters) {
  return this.database.assets.findMany({
    where: {
      tenantId,
      ...filters
    }
  })
}
```

### Cross-Tenant Prevention

```javascript
async deleteAsset(assetId, options = {}) {
  const asset = await this.database.assets.findById(assetId)

  if (asset.tenantId !== options.tenantId) {
    throw new StorageAccessDeniedError(
      'Cross-tenant delete attempted',
      assetId,
      options.tenantId
    )
  }

  // Proceed with deletion
}
```

## Synchronized Queries

### List with Filters

```javascript
async listAssets(filter = {}) {
  const { tenantId, type, access, prefix } = filter

  return this.database.assets.findMany({
    where: {
      tenantId,
      type,
      access,
      folder: { startsWith: prefix }
    },
    include: {
      metadata: true,
      permissions: true
    }
  })
}
```

### Exists Check

```javascript
async assetExists(assetId) {
  const count = await this.database.assets.count({
    where: { id: assetId }
  })
  return count > 0
}
```

## Metadata Synchronization

### Technical Metadata

Stored in `asset_metadata` table:

```javascript
{
  width: 1920,
  height: 1080,
  duration: null,
  codec: 'jpeg',
  bitrate: null,
  colorspace: 'rgb',
  hasAlpha: false,
  isAnimated: false,
  processingStatus: 'completed',
  exif: { ... }
}
```

### Custom Metadata

Stored in `assets.metadata` JSONB:

```javascript
{
  originalName: 'vacation-photo.jpg',
  uploadedBy: 'user-123',
  purpose: 'accommodation_gallery',
  tags: ['beach', 'sunset']
}
```

## Version Tracking

### Asset Versions

When files are reprocessed:

```javascript
async createVersion(assetId, versionData) {
  return this.database.assetVersions.create({
    assetId,
    versionType: versionData.type, // 'thumbnail', 'optimized', etc.
    variant: versionData.variant,
    storedFileName: versionData.storedFileName,
    fileSize: versionData.fileSize,
    settings: versionData.settings
  })
}
```

## Validation Checklist

- [x] Upload syncs to database
- [x] Delete syncs to database
- [x] Move updates database
- [x] Copy creates database entry
- [x] Metadata stored correctly
- [x] Versions tracked
- [x] Permissions stored
- [x] Tenant isolation enforced
- [x] Events emitted
- [x] Atomic operations
- [x] Failure recovery
