# Storage Capability Boundary
## P12.3.2.0.2 — Storage Capability Boundary Implementation

---

## Overview

**Phase:** P12.3.2.0.2
**Date:** 2026-08-06
**Status:** IMPLEMENTED

This document defines the official Storage Capability boundary for Valdi Platform.

---

## Architecture

### Correct Access Pattern

```
BusinessService
       ↓
Storage Capability
       ↓
Storage Manager
       ↓
Storage Service
       ↓
Provider Adapter (Local/S3/R2)
```

### Forbidden Patterns

```
BusinessService ❌ AWS SDK ❌ Filesystem
BusinessService ❌ direct storage.service imports
BusinessService ❌ direct filesystem imports
```

---

## Directory Structure

```
capabilities/storage/
├── storage.capability.js    # Main capability class
├── storage.manager.js      # Business logic orchestration
├── storage.adapter.js      # Context adapter
└── storage.events.js      # Event definitions

storage/
├── storage.service.js     # Platform abstraction
├── storage.errors.js      # Error types
└── providers/
    ├── storage.provider.interface.js
    ├── local.provider.js
    ├── s3.provider.js
    └── r2.provider.js
```

---

## Capability Registration

### Register.js Update

```javascript
import { StorageCapability } from '../storage/storage.capability.js'

export const AVAILABLE_CAPABILITIES = {
  // ... existing capabilities ...
  storage: StorageCapability,
}
```

---

## Access Rules

### Business Layer Access

Business layer MUST NOT access storage directly. Correct pattern:

```javascript
// Correct
const storage = context.capabilities.get('storage')
await storage.upload({ buffer, fileName })

// Incorrect
import { storageService } from 'storage/service'
await storageService.upload({ buffer, fileName })
```

### Capability Layer Access

Capabilities access storage through the adapter:

```javascript
class SomeCapability extends BaseCapability {
  async doSomething() {
    const storage = this.context.storage
    await storage.upload({ buffer, fileName })
  }
}
```

---

## Tenant Isolation

All storage operations MUST include tenant context:

```javascript
// Manager validates tenant ownership
validateOwnership(assetData) {
  if (assetData.tenantId !== this.context.tenant.id) {
    throw new StorageError('Cannot upload asset for different tenant')
  }
}
```

---

## Guardian Integration

### Storage Guardian Checks

| Check | Purpose | Status |
|-------|---------|--------|
| No direct filesystem usage | Enforce storage layer boundary | ✅ |
| No direct cloud SDK usage | Enforce provider isolation | ✅ |
| Storage capability registered | Ensure capability exists | ✅ |
| Provider interface exists | Ensure abstraction layer | ✅ |

### Guardian Orchestrator Update

```javascript
import { StorageGuardian } from './storage.guardian.js'

this.guardians = {
  // ... existing guardians ...
  storage: new StorageGuardian()
}
```

---

## Files Created

### Capability Layer

```
capabilities/storage/
├── storage.capability.js    # StorageCapability extends BaseCapability
├── storage.manager.js      # StorageManager orchestrates operations
├── storage.adapter.js      # StorageAdapter wraps for context
└── storage.events.js       # STORAGE_EVENTS definitions
```

### Platform Layer

```
storage/
├── storage.service.js     # Already existed
├── storage.errors.js       # Already existed
└── providers/             # Already existed
```

---

## Validation

### Correct Imports

| Import From | Allowed | Notes |
|-------------|---------|-------|
| capabilities/* | ✅ Storage Capability | Through context |
| business/* | ❌ storage.service | Must use capability |
| api/* | ❌ storage.service | Must use capability |
| runtime/* | ❌ storage.service | Must use capability |

### Correct Access Patterns

```javascript
// Through capability context (CORRECT)
context.capabilities.get('storage').upload(...)

// Direct service import (INCORRECT)
import { StorageService } from 'storage'
```

---

## Design Freeze Compliance

| Freeze | Compliance |
|--------|------------|
| P13.8 Platform Core | ✅ NO MODIFICATIONS |
| P15.0 Platform Vision | ✅ NO MODIFICATIONS |

The Storage Capability is a NEW capability that does not modify any frozen components.

---

## Security Model

### Access Control

| Role | Access |
|------|--------|
| admin | All operations |
| storage_admin | All operations |
| company_owner | Own company assets |
| user | Own assets only |

### Validation

1. Tenant ownership verified on upload
2. Access permissions checked on read
3. Ownership verified on delete/move

---

## Next

**P12.3.2.1 — Storage Provider Interface Implementation**

Implement the actual provider interface with:
- Local provider completion
- S3 provider completion
- R2 provider completion
- CDN integration

---

**Status:** STORAGE CAPABILITY BOUNDARY IMPLEMENTED

**Guardian Score:** Must remain 100/100
