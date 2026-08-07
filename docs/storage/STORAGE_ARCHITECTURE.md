# Storage Architecture
## Valdi Platform v4.2 — Product Runtime

---

## Overview

**Version:** 4.2
**Phase:** P12.3.2.0
**Status:** ARCHITECTURE DEFINED
**Last Updated:** 2026-08-06

---

## Executive Summary

The Storage Architecture defines the platform-level storage abstraction layer for Valdi Platform. This architecture enables any ecosystem, destination, company, or product to manage files and digital assets without modifying Platform Core, Runtime, Repository Engine, API Layer, or Design Freeze protected components.

**Core Principle:** PLATFORM OWNS STORAGE BEHAVIOR — PRODUCTS OWN IDENTITY — COMPANIES OWN CONTENT — EXPERIENCES CONSUME ASSETS

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXPERIENCE ENGINE                            │
│         (Consumes assets via Storage Service)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE CAPABILITY                            │
│         (Business orchestration layer)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE SERVICE                              │
│              (Platform-level abstraction)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐
     │   Local    │   │    S3     │   │    R2      │
     │  Provider  │   │  Provider  │   │  Provider  │
     └────────────┘   └────────────┘   └────────────┘
```

**Rule:** Business layer MUST NEVER communicate directly with providers.

---

## Directory Structure

```
storage/
├── index.js                    # Public API exports
├── storage.service.js         # Main storage service
├── storage.errors.js           # Error definitions
├── providers/
│   ├── index.js               # Provider exports
│   ├── storage.provider.interface.js  # Abstract interface
│   ├── local.provider.js       # Local filesystem (dev)
│   ├── s3.provider.js         # AWS S3
│   └── r2.provider.js          # Cloudflare R2
└── processors/
    ├── index.js
    ├── image.processor.js      # Image optimization
    └── video.processor.js      # Video transcoding
```

---

## Database Schema

### Storage Entities (6 tables)

| Table | Purpose |
|-------|---------|
| `storage_providers` | Provider registry (local, S3, R2) |
| `storage_locations` | Physical storage references |
| `assets` | Central registry of all stored objects |
| `asset_metadata` | Technical info (size, mime, dimensions) |
| `asset_versions` | Thumbnails, optimized images, transformations |
| `asset_permissions` | Access control rules |

### Entity Relationships

```
storage_providers (1) ─── (n) storage_locations
                                       │
                    ┌──────────────────┤
                    ▼                  ▼
                assets (n) ─── (1) asset_metadata
                    │
                    ├── (n) asset_versions
                    │
                    └── (n) asset_permissions
```

### Ownership Hierarchy

Every asset knows its:
- `tenantId` — Platform tenant
- `destinationId` — Tourism destination
- `companyId` — Business company
- `userId` — Uploader identity

---

## Supported Asset Types

| Type | Examples | Extensions |
|------|----------|------------|
| **Image** | Logos, galleries, attractions | jpg, png, webp, gif, svg |
| **Video** | Drone footage, promos | mp4, webm, mov |
| **Document** | Invoices, contracts, PDFs | pdf, doc, xls |
| **Audio** | Podcasts, audio guides | mp3, wav, ogg |
| **Archive** | Backups, packages | zip, tar, gz |

### Future Assets
- 3D models (.glb, .gltf)
- VR experiences (.vr)
- AI generated content

---

## Provider Types

### Local Provider (Development)
- Filesystem-based storage
- For local development only
- Not suitable for production

### S3 Provider (Production)
- AWS S3 compatibility
- Global availability
- Egress fees apply

### R2 Provider (GDPR-Compliant)
- Cloudflare R2 (S3-compatible)
- Zero egress fees
- GDPR-compliant storage

---

## Storage Service API

```javascript
// Upload
await storageService.uploadAsset({
  buffer,
  fileName: 'image.jpg',
  mimeType: 'image/jpeg',
  path: 'companies/123/',
})

// Download
await storageService.downloadAsset('companies/123/image.jpg')

// Delete
await storageService.deleteAsset('companies/123/image.jpg')

// Get URL
await storageService.getAssetUrl('companies/123/image.jpg')

// Signed URL (private assets)
await storageService.getAssetUrl('private/file.pdf', { signed: true })

// Metadata
await storageService.getAssetMetadata('companies/123/image.jpg')

// Copy/Move
await storageService.copyAsset('source.jpg', 'dest/path.jpg')
await storageService.moveAsset('old/path.jpg', 'new/path.jpg')

// List
await storageService.listAssets('companies/123/')
```

---

## Security Model

### Access Levels

| Access | Description |
|--------|-------------|
| `public` | Anyone can access |
| `private` | Signed URL required |
| `company` | Company members only |
| `user` | Owner only |

### Tenant Isolation

All assets are scoped to a `tenantId`. Cross-tenant access is never allowed.

### Upload Validation

| Rule | Limit |
|------|-------|
| Max file size | 100MB (configurable) |
| Allowed MIME types | Whitelist-based |
| Malware scanning | Ready (future) |

### Signed URLs

Private assets use time-limited signed URLs:
- Default expiration: 1 hour
- Configurable per-asset

---

## Experience Engine Integration

The Experience Engine consumes assets through the Storage Service:

```javascript
// Experience configuration references assets
const experience = {
  hero: {
    image: 'assets/destinations/valdivia/hero.jpg',
  },
  gallery: [
    { src: 'assets/companies/123/gallery/1.jpg', alt: '...' },
  ],
}

// Storage Service provides optimized URLs
const url = await storageService.getAssetUrl('assets/...', {
  variant: 'thumbnail',  // 200x200
})
```

**Rule:** Experience Engine MUST NOT know filesystem paths, cloud provider, or storage implementation.

---

## Ecosystem Configuration

Each destination can define storage configuration:

```javascript
// config/ecosystems/chile/magallanes/natales/storage.config.js
export default {
  provider: 'r2',
  bucket: 'natales-assets',
  cdnUrl: 'https://assets.natales.app',
  optimization: {
    image: {
      quality: 85,
      formats: ['webp', 'avif'],
      responsive: true,
    },
  },
  limits: {
    maxFileSize: 50 * 1024 * 1024,
    allowedTypes: ['image', 'video'],
  },
}
```

---

## Migration Strategy

### Phase 1: Core (P12.3.2.1)
- Storage provider interface
- Local provider implementation
- Basic CRUD operations

### Phase 2: Providers (P12.3.2.2)
- S3 provider
- R2 provider
- Signed URL support

### Phase 3: Processing (P12.3.2.3)
- Image optimization
- Thumbnail generation
- Video transcoding

### Phase 4: Integration (P12.3.2.4)
- Experience Engine integration
- Business capability integration
- CDN configuration

---

## Compatibility

### Design Freezes
| Freeze | Status |
|--------|--------|
| P13.8 Platform Core | COMPATIBLE — No modifications |
| P15.0 Platform Vision | COMPATIBLE — No modifications |

### Architecture Documents
| Document | Status |
|----------|--------|
| PLATFORM_MANIFEST.md | COMPATIBLE |
| VALDI_PLATFORM_VISION.md | COMPATIBLE |
| MULTI-ECOSYSTEM-ARCHITECTURE.md | COMPATIBLE |
| DATABASE_FOUNDATION_v4.1.1.md | COMPATIBLE |

---

## Guardian Validation

The Storage Guardian validates:

1. **No direct filesystem usage** outside `storage/` directory
2. **No direct cloud SDK** imports outside providers
3. **Provider interface** is implemented correctly
4. **Storage service** follows abstraction pattern
5. **Database schema** follows ownership model
6. **Configuration-driven** provider selection

---

## Files Created

```
storage/
├── index.js
├── storage.service.js
├── storage.errors.js
├── providers/
│   ├── index.js
│   ├── storage.provider.interface.js
│   ├── local.provider.js
│   ├── s3.provider.js
│   └── r2.provider.js

database/schema/storage/
└── index.js

guardian/
└── storage.guardian.js

docs/storage/
├── STORAGE_ARCHITECTURE.md
├── STORAGE_PROVIDER_SPEC.md
├── STORAGE_SECURITY_MODEL.md
└── STORAGE_IMPLEMENTATION_PLAN.md
```

---

## Final Verdict

**STORAGE ARCHITECTURE READY**

The storage architecture is defined and ready for implementation.

**Ready for:** P12.3.2.1 — Storage Provider Interface Implementation

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2026-08-06 | Initial architecture definition |
