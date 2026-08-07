# Storage Integration

## Overview

P12.3.2.2 validates the complete storage pipeline from BusinessService through to Providers and Database.

## Architecture Validation

### Complete Pipeline

```
BusinessService
       ↓
StorageCapability
       ↓
StorageManager
       ↓
StorageService
       ↓
ProviderFactory
       ↓
┌─────────────────────────────────┐
│  LocalStorageProvider           │
│  S3StorageProvider              │
│  R2StorageProvider              │
└─────────────────────────────────┘
       ↓
Database
       ↓
Events
```

### Layer Responsibilities

| Layer | Responsibility | Validated |
|-------|---------------|-----------|
| BusinessService | Uses Storage Capability only | ✅ |
| StorageCapability | Entry point, context wiring | ✅ |
| StorageManager | Business logic, validation | ✅ |
| StorageService | Provider orchestration | ✅ |
| ProviderFactory | Configuration-driven creation | ✅ |
| Providers | Actual storage operations | ✅ |
| Database | Metadata persistence | ✅ |
| Events | Activity tracking | ✅ |

## Integration Points

### StorageCapability → StorageManager

```javascript
// StorageCapability initializes with context
const storageCapability = new StorageCapability()
await storageCapability.init(context, config)

// Adapter exposes interface to capability
this.context.storage = new StorageAdapter(context)
```

### StorageManager → StorageService

```javascript
// Manager delegates to service, adds business logic
class StorageManager {
  async uploadAsset(assetData, options = {}) {
    this.validateOwnership(assetData)
    return this.storageService.uploadAsset(assetData, options)
  }
}
```

### StorageService → ProviderFactory

```javascript
// Service uses factory, never imports providers directly
const provider = await StorageProviderFactory.create(type, config)
await provider.initialize()
```

## Database Synchronization

### Asset Lifecycle

1. **Upload Request** → StorageService.uploadAsset()
2. **Provider Operation** → Provider.upload()
3. **Asset Registration** → Database assets table
4. **Metadata Storage** → Database asset_metadata table
5. **Event Emission** → storage.asset.uploaded

### Synchronization Tables

| Table | Purpose | Sync Point |
|-------|---------|------------|
| assets | Central asset registry | On upload, delete, move |
| asset_metadata | Technical metadata | On upload, processing |
| asset_versions | Thumbnails, transforms | On processing |
| asset_permissions | Access control | On grant, revoke |
| storage_providers | Provider registry | On registration |
| storage_locations | Physical locations | On configuration |

## Provider Switching

### Configuration-Driven Selection

```javascript
// BusinessService never knows which provider is active
const storageService = new StorageService({
  local: { enabled: true, rootPath: '/data' },
  s3: { enabled: false },
  r2: { enabled: false }
})

// Switching is configuration-only
storageService.setDefaultProvider('s3') // Just changes reference
```

### Runtime Switching

```javascript
const integration = new StorageIntegration(config)
await integration.initialize()

// Switch provider at runtime
const result = await integration.switchProvider('r2')

// All subsequent operations use R2
await integration.getStorageService().uploadAsset(assetData)
```

## Event Generation

### Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| storage.asset.uploaded | Successful upload | assetId, provider, size |
| storage.asset.deleted | Successful delete | assetId, provider |
| storage.asset.accessed | Download/stream | assetId, accessType |
| storage.asset.copied | Copy operation | assetId, destPath |
| storage.asset.moved | Move operation | assetId, destPath |
| storage.asset.error | Operation failure | assetId, error |
| storage.quota.exceeded | Quota limit | tenantId, current, limit |
| storage.provider.switched | Provider change | from, to |

## Tenant Isolation

### Path Isolation

```javascript
// LocalProvider builds tenant-isolated paths
buildKey(destPath, fileName, tenantId) {
  const basePath = tenantId ? `tenants/${tenantId}` : ''
  return path.join(basePath, destPath, fileName)
}
```

### Database Isolation

- All asset queries filter by tenantId
- No cross-tenant data access
- Company, destination, user isolation maintained

## Testing Strategy

### Unit Tests

- Individual provider methods
- StorageService operations
- Manager validations

### Integration Tests

- Complete pipeline validation
- Provider switching
- Database synchronization
- Event generation

### Performance Tests

- Upload/download latency
- Provider initialization
- Memory usage benchmarks

## Validation Checklist

- [x] All layers wired correctly
- [x] No layer bypasses architecture
- [x] Provider factory pattern enforced
- [x] Database synchronization working
- [x] Events generated correctly
- [x] Tenant isolation maintained
- [x] Provider switching functional
- [x] No direct provider imports in service
