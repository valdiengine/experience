# PUBLIC_API.md

> Public services available to external consumers.

---

## Overview

The platform exposes public APIs through capabilities. Currently, the public API is limited to the CMS bridge and PWA engine. Full REST/GraphQL APIs are planned for P12.

---

## Current Public Interfaces

### CMS Bridge

**Capability:** `cms`
**Purpose:** WordPress content synchronization

| Method | Description |
|--------|-------------|
| `loadContent(type, id)` | Load content from CMS |
| `syncContent(type)` | Sync content from CMS |
| `mapContent(raw)` | Map CMS content to engine format |

### PWA Engine

**Capability:** `pwa-engine`
**Purpose:** PWA manifest and service worker management

| Method | Description |
|--------|-------------|
| `generateManifest(tenant)` | Generate manifest.json for tenant |
| `registerServiceWorker()` | Register service worker |
| `getCacheStrategy(strategy)` | Get cache strategy configuration |
| `promptInstall()` | Show PWA install prompt |

### Public Experience

**Capability:** `public`
**Purpose:** Public page rendering and navigation

| Method | Description |
|--------|-------------|
| `renderPage(config)` | Render a complete page |
| `renderSection(type, data)` | Render a section (11 types) |
| `generateMetadata(entity)` | Generate SEO metadata |
| `generateSchema(entity)` | Generate JSON-LD schema |

---

## Planned Public APIs (P12)

### REST API

```
GET    /api/v1/destinations
GET    /api/v1/destinations/:id
GET    /api/v1/destinations/:id/localities
GET    /api/v1/destinations/:id/places
GET    /api/v1/destinations/:id/experiences
GET    /api/v1/experiences/:id
POST   /api/v1/reservations
GET    /api/v1/reservations/:id
PUT    /api/v1/reservations/:id
DELETE /api/v1/reservations/:id
GET    /api/v1/visitors/:id/profile
GET    /api/v1/visitors/:id/memories
POST   /api/v1/visitors/:id/memories
GET    /api/v1/visitors/:id/reviews
POST   /api/v1/visitors/:id/reviews
```

### Authentication

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

### Admin API

```
GET    /api/v1/admin/tenants
POST   /api/v1/admin/tenants
PUT    /api/v1/admin/tenants/:id
GET    /api/v1/admin/users
POST   /api/v1/admin/users
PUT    /api/v1/admin/users/:id
GET    /api/v1/admin/analytics
```

---

## See Also

- [DATA_CONTRACTS.md](./DATA_CONTRACTS.md) — Data schemas
- [EVENT_CONTRACTS.md](./EVENT_CONTRACTS.md) — Event contracts
- [INTERNAL_EVENTS.md](./INTERNAL_EVENTS.md) — Internal event catalog
