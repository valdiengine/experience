# Storage Implementation Plan
## Valdi Platform v4.2 — Product Runtime

---

## Overview

Implementation roadmap for the Storage layer.

---

## Phase 1: Core Infrastructure (P12.3.2.1)

### Objective
Implement the storage provider interface and basic service.

### Deliverables

| File | Description |
|------|-------------|
| `storage/providers/storage.provider.interface.js` | Abstract interface |
| `storage/providers/local.provider.js` | Local filesystem provider |
| `storage/storage.service.js` | Main service |
| `storage/storage.errors.js` | Error definitions |
| `database/schema/storage/index.js` | Database schema |
| `guardian/storage.guardian.js` | Guardian rules |

### Tasks

1. Create `StorageProviderInterface`
2. Implement `LocalStorageProvider`
3. Create `StorageService` with provider registry
4. Define error classes
5. Create database schema
6. Implement storage guardian
7. Create documentation

### Effort
2 days

---

## Phase 2: Cloud Providers (P12.3.2.2)

### Objective
Implement production cloud providers.

### Deliverables

| File | Description |
|------|-------------|
| `storage/providers/s3.provider.js` | AWS S3 provider |
| `storage/providers/r2.provider.js` | Cloudflare R2 provider |

### Tasks

1. Implement S3 provider with all methods
2. Implement R2 provider (S3-compatible)
3. Add signed URL support
4. Add CDN URL support
5. Health check implementation
6. Configuration documentation

### Effort
2 days

---

## Phase 3: Processing (P12.3.2.3)

### Objective
Implement asset processing (images, thumbnails).

### Deliverables

| File | Description |
|------|-------------|
| `storage/processors/image.processor.js` | Image optimization |
| `database/schema/asset_metadata` | Metadata table |
| `database/schema/asset_versions` | Versions table |

### Tasks

1. Create image processor
2. Implement thumbnail generation
3. Add format conversion (webp, avif)
4. Create metadata tracking
5. Implement version management
6. Add responsive image support

### Effort
3 days

---

## Phase 4: Integration (P12.3.2.4)

### Objective
Integrate storage into Experience Engine and Business capabilities.

### Deliverables

- Experience Engine asset consumption
- Business capability integration
- Company module support
- CDN configuration

### Tasks

1. Create storage capability
2. Integrate with Experience Engine
3. Add asset selection to CMS
4. Implement company storage quotas
5. Configure per-destination settings
6. End-to-end testing

### Effort
3 days

---

## Database Migration

### Migration 0006: Storage Layer

```javascript
// 0006_storage_layer/index.js
export async function up(db) {
  // storage_providers
  await db.createTable('storage_providers', ...)

  // storage_locations
  await db.createTable('storage_locations', ...)

  // assets
  await db.createTable('assets', ...)

  // asset_metadata
  await db.createTable('asset_metadata', ...)

  // asset_versions
  await db.createTable('asset_versions', ...)

  // asset_permissions
  await db.createTable('asset_permissions', ...)
}
```

---

## Configuration

### Environment Variables

```bash
# Provider
STORAGE_PROVIDER=local  # local | s3 | r2

# Local
STORAGE_LOCAL_PATH=./uploads
STORAGE_LOCAL_URL=/uploads

# S3
AWS_BUCKET=valdi-assets
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# R2
R2_ACCOUNT_ID=
R2_BUCKET=valdi-assets
R2_PUBLIC_URL=https://assets.valdi.app

# Security
STORAGE_SECRET=...
```

### Per-Destination Config

```javascript
// config/ecosystems/chile/magallanes/natales/storage.config.js
export default {
  provider: 'r2',
  bucket: 'natales-assets',
  cdnUrl: 'https://assets.natales.app',
  limits: {
    maxFileSize: 50 * 1024 * 1024,
  },
}
```

---

## Testing Strategy

### Unit Tests
- Provider methods
- Service methods
- Validation rules

### Integration Tests
- Database operations
- Provider operations
- End-to-end flows

### Performance Tests
- Upload throughput
- Download latency
- Concurrent operations

---

## Rollback Plan

If issues arise:

1. **Phase 1 issues:** Disable storage capability, use external service
2. **Phase 2 issues:** Fall back to local provider
3. **Phase 3 issues:** Disable processing, serve originals
4. **Phase 4 issues:** Static asset URLs, no dynamic generation

---

## Effort Summary

| Phase | Days | Total |
|-------|------|-------|
| P12.3.2.1 | 2 | 2 |
| P12.3.2.2 | 2 | 4 |
| P12.3.2.3 | 3 | 7 |
| P12.3.2.4 | 3 | 10 |

**Total: 10 days**

---

## Dependencies

| Phase | Depends On |
|-------|-----------|
| P12.3.2.1 | Database Foundation (P12.3.1.5) |
| P12.3.2.2 | P12.3.2.1 |
| P12.3.2.3 | P12.3.2.2 |
| P12.3.2.4 | P12.3.2.3 |

---

## Next Phase

**P12.3.3 — Email Provider:** SMTP configuration and email service.
