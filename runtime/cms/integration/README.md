# CMS Runtime Integration

> P12.2.2 — Bridges the CMS Domain with the Platform Runtime.
> Capabilities only know `context.runtime.cms`. Never CmsEngine or CMS providers.

## Layer Position

```
Capabilities
    ↓
context.runtime.cms
    ↓
┌──────────────────────────────────────────────┐
│           CMS Runtime Integration              │
│                                                │
│  CmsRuntimeIntegration                        │
│    ├─ initialize() / shutdown() / dispose()    │
│    ├─ health() / available() / supports()      │
│    ├─ registerProvider() / setContracts()      │
│    │                                           │
│    ├─ CmsRuntimeContext ← context.runtime.cms  │
│    ├─ CmsRuntimeRegistry (internal)            │
│    ├─ CmsRuntimeFactory (engine resolution)    │
│    └─ CmsRuntimeHealth (component health)      │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│           CMS Contracts (P12.2.1)              │
│                                                │
│  ContentRuntime  MediaRuntime  SeoRuntime     │
│  SyncRuntime     TemplateRuntime PreviewRuntime│
│  WebhookRuntime  CmsProviderRuntime            │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│         WordPress Provider (P12.2.3)           │
│         Ghost | Strapi | Contentful | ...      │
└─────────────────────────────────────────────────┘
```

## Files

| File | Responsibility |
|------|---------------|
| `cms.runtime.integration.js` | Bridge: registers CMS Runtime inside Platform Runtime. Entry point. |
| `cms.runtime.context.js` | Exposes `context.runtime.cms`. Wraps CmsEngine. Capabilities only see this. |
| `cms.runtime.registry.js` | Internal registry: version, provider, features, priority, status. |
| `cms.runtime.factory.js` | Resolves which CMS engine to use. |
| `cms.runtime.health.js` | Health aggregation: CMS Engine + all sub-engines. |
| `cms.runtime.events.js` | Integration events. |
| `cms.runtime.errors.js` | Error types. |

## Usage

```js
// Inside Platform Runtime initialization:
const cmsIntegration = new CmsRuntimeIntegration(config)
cmsIntegration.setEventBus(eventBus)
await cmsIntegration.initialize()

// Register in runtime context:
runtimeContext.setModule('cms', cmsIntegration.context)

// Capability usage:
const posts = await context.runtime.cms.content.query({ type: 'post' }, { page: 1, pageSize: 10 })
const media = await context.runtime.cms.media.upload(file, { tenantId })
const seo = await context.runtime.cms.seo.get(entityId, 'destination')
```

## Rules

1. Capabilities never import CMS providers
2. Capabilities only use `context.runtime.cms`
3. CmsRuntimeIntegration is the only bridge
4. CmsRuntimeContext exposes exactly what capabilities need
5. No WordPress, Ghost, Strapi, Contentful, Sanity imports
6. Provider resolution happens via CmsRuntimeFactory
7. All sub-engine health is aggregated
8. Multi-tenant ready — every operation is tenant-scoped
9. Provider swap requires zero capability changes
