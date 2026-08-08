# EXPERIENCE_ENGINE_BOUNDARIES.md

## Purpose

This document defines the exact boundaries of the Experience Engine — what it can and cannot modify, access, or depend upon.

## Constitutional Boundaries

### From PLATFORM_MANIFEST.md Section 3.4

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPERIENCE ENGINE IS NOT                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ Business rules                                               │
│  ❌ Data validation                                              │
│  ❌ API contracts                                                │
│  ❌ Business workflows                                           │
│  ❌ Domain models                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### From PLATFORM_MANIFEST.md Section 3.3

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPERIENCE ENGINE COMPOSES                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ PRODUCTS — Multiple capabilities into a product               │
│  ✅ MODULES — Active module selection and configuration           │
│  ✅ CAPABILITIES — Activation based on product needs             │
│  ✅ NAVIGATION — Header, footer, menu, breadcrumbs               │
│  ✅ BRANDING — Logo, colors, fonts, visual identity              │
│  ✅ LAYOUTS — Page templates, sections, component arrangements   │
│  ✅ WORKFLOWS — Multi-step workflows from atomic operations      │
│  ✅ PERMISSIONS — RBAC/ABAC rules for product context            │
│  ✅ SEO — Meta tags, OG cards, structured data                   │
│  ✅ LOCALIZATION — i18n strings, date/number formats            │
│  ✅ USER JOURNEYS — Onboarding, checkout, discovery flows        │
│  ✅ PRODUCT EXPERIENCES — Product pages from components          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Boundaries

### What Experience Engine OWNS

```
EXPERIENCE ENGINE OWNERSHIP
├── experience/
│   ├── experience.engine.js        — Core orchestration
│   ├── product.resolver.js         — Domain resolution
│   ├── ecosystem.loader.js         — Configuration loading
│   ├── config.resolver.js          — Inheritance resolution
│   ├── module.loader.js            — Module activation
│   ├── composition/                — Composition logic
│   │   ├── product.composer.js
│   │   ├── navigation.composer.js
│   │   ├── branding.composer.js
│   │   ├── layout.composer.js
│   │   └── seo.composer.js
│   └── bootstrap/                  — Experience bootstrap
│
├── ecosystems/                      — Configuration data
│   └── {country}/
│       └── {region}/
│           └── {destination}/
│               └── config.json
│
└── companies/                      — Company data
    └── {country}/
        └── {region}/
            └── {destination}/
                └── {company}/
                    └── config.json
```

### What Experience Engine CAN Access

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPERIENCE ENGINE CAN ACCESS                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Platform Core via approved interfaces:                       │
│     • CapabilityLoader — activate/deactivate capabilities        │
│     • EventBus — subscribe to events                             │
│     • TenantManager — get tenant context                         │
│     • RuntimeEngine — via contracts only                        │
│                                                                  │
│  ✅ Configuration:                                               │
│     • ecosystems/*.json — destination configs                   │
│     • companies/*.json — company configs                         │
│     • config/*.config.js — platform/product configs             │
│                                                                  │
│  ✅ Infrastructure via Platform:                                 │
│     • Database — via repository pattern (NOT direct SQL)         │
│     • Storage — via StorageCapability (NOT direct provider)       │
│     • Media — via MediaCapability (NOT direct processor)         │
│     • Auth — via AuthRuntime (NOT direct JWT)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What Experience Engine CANNOT Access

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPERIENCE ENGINE CANNOT ACCESS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ Direct PostgreSQL queries                                    │
│  ❌ Direct storage provider SDKs (AWS S3, Cloudflare, R2)        │
│  ❌ Direct media processing libraries (Sharp, FFmpeg)            │
│  ❌ Business Aggregate entities directly                         │
│  ❌ API Layer endpoints directly                                 │
│  ❌ Repository Engine internals                                  │
│  ❌ Runtime Engine internals                                     │
│  ❌ Guardian System internals                                    │
│  ❌ Database provider internals                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Dependency Direction

```
EXPERIENCE ENGINE
       ↓
PLATFORM CORE APIs / contracts
       ↓
BUSINESS CAPABILITIES

NOT:
EXPERIENCE ENGINE
       ↑
PLATFORM CORE
```

## Protected Boundaries

### P13.8 Platform Core (NEVER MODIFY)

| Component | Type | Protection |
|-----------|------|------------|
| Runtime Engine | Core | PERMANENT |
| Repository Engine | Core | PERMANENT |
| Business Aggregate | Core | PERMANENT |
| BusinessService | Core | PERMANENT |
| Business Managers | Core | PERMANENT |
| API Layer | Core | PERMANENT |
| Capability System | Core | PERMANENT |
| Bootstrap System | Core | PERMANENT |
| Guardian System | Core | PERMANENT |
| Health Engine | Core | PERMANENT |
| AI Operating System | Core | PERMANENT |
| Event Model | Core | PERMANENT |

### P15.0 Platform Vision (NEVER MODIFY)

| Component | Type | Protection |
|-----------|------|------------|
| Platform Manifest | Philosophy | PERMANENT |
| Platform Vision | Philosophy | PERMANENT |
| Multi-Ecosystem Architecture | Architecture | PERMANENT |
| Experience Engine (architecture) | Architecture | PERMANENT |
| Ecosystem Loader (architecture) | Architecture | PERMANENT |
| Product Resolver (architecture) | Architecture | PERMANENT |
| Configuration Hierarchy | Architecture | PERMANENT |
| Country→Region→Destination→Company | Architecture | PERMANENT |

## Boundary Violation Examples

### FORBIDDEN (Will be blocked by Guardian)

```javascript
// ❌ WRONG — Direct database access
const result = await db.query('SELECT * FROM businesses')

// ❌ WRONG — Direct storage provider
import { S3Client } from '@aws-sdk/client-s3'

// ❌ WRONG — Direct media processing
import sharp from 'sharp'

// ❌ WRONG — Modifying Platform Core
runtime/engine.js.method = () => {}
```

### CORRECT (Uses Platform interfaces)

```javascript
// ✅ CORRECT — Via Capability
await context.capabilities.storage.upload(buffer, { name: 'file.jpg' })

// ✅ CORRECT — Via EventBus
eventBus.subscribe('media.processed', handler)

// ✅ CORRECT — Via Configuration
const destinationConfig = await ecosystemLoader.load(destinationId)
```

## Extension Points

### Where Experience Engine Plugs Into Platform Core

```
1. TenantManager.init(tenants)
   └─> Receives merged ecosystem config

2. CapabilityLoader.activate(capabilityId)
   └─> Activates based on enabledModules

3. UIManager.applyBranding(config)
   └─> Applies ecosystem branding

4. Router.registerRoutes(config)
   └─> Registers ecosystem navigation
```

## File Ownership Summary

| Directory | Owner | Access |
|-----------|-------|--------|
| runtime/ | Platform Core | Read only via contracts |
| repository/ | Platform Core | Read only via contracts |
| api/ | Platform Core | Read only |
| capabilities/ | Platform Core | Read only via CapabilityLoader |
| business/ | Platform Core | NO ACCESS |
| guardian/ | Platform Core | Read only |
| health/ | Platform Core | Read only |
| engine/ | Experience Engine | READ/WRITE (new implementation) |
| ecosystems/ | Experience Engine | READ/WRITE (new implementation) |
| companies/ | Experience Engine | READ/WRITE (new implementation) |
| config/ | Experience Engine | READ/WRITE (extend) |
| experience/ | Experience Engine | READ/WRITE (new implementation) |

## Validation

**Result: ✅ BOUNDARIES DEFINED AND ENFORCEABLE**

The Experience Engine boundaries are:
1. Clearly defined in constitutional documents
2. Enforceable via Guardian system
3. Implementable without modifying Platform Core

---

*EXPERIENCE_ENGINE_BOUNDARIES.md — Validated against PLATFORM_MANIFEST.md*
