# CMS Runtime Contracts

> P12.2.1 — CMS Runtime Contracts Layer.
> Immutable interfaces that every CMS provider must implement.
> Contracts only. No implementations. No WordPress. No provider code.

## Layer Position

```
context.runtime.cms
    ↓
CMS Runtime Contracts           ← YOU ARE HERE
    ↓
CMS Domain Engine (P12.2.2)
    ↓
CMS Provider Interface
    ↓
WordPress | Ghost | Strapi | Contentful | Sanity | Custom CMS
```

## Contracts

| File | Responsibility |
|------|---------------|
| `cms.runtime.js` | Top-level CMS runtime — content, media, seo, sync, preview accessors |
| `content.runtime.js` | Content lifecycle — get, query, create, update, delete, publish, unpublish |
| `media.runtime.js` | Media management — upload, get, delete, serve, process |
| `seo.runtime.js` | SEO metadata — get, set, validate, sitemap |
| `sync.runtime.js` | Synchronization — trigger, status, history, pull, push, resolve |
| `webhook.runtime.js` | Webhook handling — subscribe, unsubscribe, verify, process |
| `preview.runtime.js` | Content preview — generate, resolve, expire |
| `template.runtime.js` | Template resolution — resolve, render, list |
| `cms-provider.runtime.js` | CMS provider interface — content, media, seo, sync, webhook |

## Rules

1. All contracts are abstract — no implementation
2. No WordPress-specific code in contracts
3. No REST API calls in contracts
4. No HTML/rendering logic in contracts
5. No vendor SDK imports in contracts
6. Every contract implements initialize(), shutdown(), dispose(), health(), available()
7. Every contract implements supports(feature) for capability detection
8. Contracts are provider-independent
9. Contracts are tenant-aware
10. All errors extend RuntimeError hierarchy
11. No capability imports — contracts only depend on base.runtime.js
12. Events use `cms:` prefix — never prefixed with provider name
