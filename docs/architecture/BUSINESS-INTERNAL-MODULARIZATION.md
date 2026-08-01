# Business Internal Modularization

> P13.2.1 — Structural refactoring to prevent BusinessManager from becoming a God Object.
> No behavior changed. No public API changed. No events/repositories/infrastructure changed.

---

## Why This Refactoring Happened

BusinessManager started as a single file orchestrating business CRUD and accommodation operations. With future phases adding:

- Availability management
- Reservations
- Payments
- CMS content
- Notifications
- Analytics
- Branding
- Statistics
- Owner management
- Search

...the single file would have exceeded several thousand lines and become a God Object.

This refactoring splits responsibilities into **domain-specific sub-managers** while preserving the exact same public interface.

---

## New Folder Layout

```
capabilities/business/
├── business.capability.js        # Entry point (unchanged)
├── business.service.js           # Public API (unchanged method signatures)
├── business.manager.js           # Thin orchestrator (277 lines, was 743)
├── business.events.js            # (unchanged)
├── business.errors.js            # (unchanged)
├── business.permissions.js       # (unchanged)
├── business.schema.js            # (unchanged)
├── business.validation.js        # (unchanged)
├── business.status.js            # (unchanged)
├── business.workflow.js          # (unchanged)
├── business.search.js            # (unchanged)
├── business.seo.js               # (unchanged)
├── business.media.js             # (unchanged)
├── README.md                     # Updated
└── manager/
    ├── README.md
    ├── business-accommodation.manager.js   # Accommodation operations (413 lines)
    ├── business-brand.manager.js           # Branding defaults (stub)
    ├── business-owner.manager.js           # Owner transfer (stub)
    ├── business-search.manager.js          # Search indexing (stub)
    ├── business-statistics.manager.js      # KPI retrieval (stub)
    └── business-cms.manager.js             # CMS sync (stub)
```

---

## Manager Responsibilities

### BusinessManager (orchestrator)

- Business CRUD: `createBusiness`, `getById`, `getMany`, `updateBusiness`
- Status transitions: `publish`, `suspend`, `archive`, `restore`, `delete`
- Permissions: `verify`, `transferOwner`
- Search: `findBySlug`, `findByTenant`, `findByDestination`, `getByStatus`, `getByCategory`
- SEO/Media: `getSEO`, `getMedia`
- **Coordination**: Calls `accommodation.cascadeArchive()` / `accommodation.cascadeRestore()` on business archive/delete/restore
- **Event emission**: Fires `BUSINESS_EVENTS` for business lifecycle

### BusinessAccommodationManager

All accommodation-related operations:

| Method | Purpose |
|--------|---------|
| `createAccommodation` | Create with brand defaults auto-applied |
| `attachAccommodation` | Attach existing orphan to business |
| `detachAccommodation` | Detach from business |
| `archiveAccommodation` | Archive with previousStatus |
| `publishAccommodation` | Publish with publishedAt |
| `hideAccommodation` | Hide with previousStatus |
| `restoreAccommodation` | Restore to previousStatus |
| `deleteAccommodation` | Soft delete |
| `duplicateAccommodation` | Duplicate as draft |
| `countAccommodations` | Total count |
| `countPublished` | Published count |
| `countDraft` | Draft count |
| `countArchived` | Archived count |
| `listAccommodations` | All accommodations |
| `listPublished` | Published accommodations |
| `listHidden` | Hidden accommodations |
| `getStatistics` | Aggregated counts (total, published, draft, hidden, archived) |
| `cascadeArchive` | Hide all non-archived/deleted accommodations (called by orchestrator) |
| `cascadeRestore` | Restore all to previousStatus (called by orchestrator) |

### BusinessBrandManager

- `getBranding` — Retrieve business branding defaults (logo, cover, colors, currency, language, timezone, policies)
- `updateBranding` — Update branding defaults
- Future: white-label, custom domain, brand kit

### BusinessOwnerManager

- `getOwner` — Get current ownerId
- `transferOwner` — Change business owner
- Future: staff management, role-based invitations, permission delegation

### BusinessSearchManager

- `index` — Index business in search engine
- `remove` — Remove business from search index
- `syncPush` — Push business to sync engine
- `search` — Execute search query with BusinessSearch payload
- Future: Elastic/OpenSearch integration, reindex all

### BusinessStatisticsManager

- `getKPIs` — Retrieve business KPIs (published/draft counts, rating, categories)
- Future: occupancy rate, revenue statistics, cached metrics, analytics dashboards

### BusinessCmsManager

- `syncContent` — Push business data to CMS runtime
- `previewRefresh` — Trigger CMS preview refresh
- Future: WordPress synchronization, SEO sync, publishing workflows

---

## Dependency Graph

```
BusinessService
    │
    ▼
BusinessManager (orchestrator)
    │
    ├──► BusinessAccommodationManager ──► context.repositories.accommodation
    ├──► BusinessBrandManager ──────────► context.repositories.business
    ├──► BusinessOwnerManager ──────────► context.repositories.business
    ├──► BusinessSearchManager ─────────► context.repositories.business + runtime.search
    ├──► BusinessStatisticsManager ─────► context.repositories.business
    └──► BusinessCmsManager ───────────► context.repositories.business + runtime.cms
```

**Forbidden:**
```
BusinessAccommodationManager ──► BusinessBrandManager  ✗ NO
BusinessBrandManager ──────────► BusinessOwnerManager   ✗ NO
Any sub-manager ──────────────► PostgreSQL/Drizzle/JWT ✗ NO
```

---

## Architecture Rules

1. **Zero public API changes** — BusinessService exposes exactly the same methods
2. **Zero behavior changes** — Cascade logic, events, permissions, validation all preserved
3. **Zero repository changes** — Same `context.repositories.business/accommodation` getters
4. **Zero event changes** — Same `BUSINESS_EVENTS` and `BUSINESS_ACCOMMODATION_EVENTS`
5. **Zero infrastructure leakage** — No PostgreSQL, No Drizzle, No WordPress, No JWT imports
6. **Orchestrator-only BusinessManager** — Does not contain domain logic, only delegates and coordinates
7. **No circular imports** — Sub-managers never import each other; only BusinessManager imports them
8. **Context-only dependency injection** — Sub-managers receive `context` and extract their own dependencies

---

## Future Expansion

Extension points reserved for future phases (DO NOT IMPLEMENT YET):

| Future Manager | Phase | TODO Stub |
|---------------|-------|-----------|
| `BusinessAvailabilityManager` | P13.3.1 | ✅ completed |
| `BusinessReservationManager` | P13.4.1 | ✅ completed |
| `BusinessVisitorManager` | P13.5.1 | ✅ completed |
| `BusinessPaymentManager` | P13.6 | `/* TODO: P13.x */` |
| `BusinessNotificationManager` | P13.7 | `/* TODO: P13.x */` |
| `BusinessWorkflowManager` | P14+ | `/* TODO: P13.x */` |

When adding a new sub-manager:
1. Create file in `manager/`
2. Import and instantiate in `business.manager.js` constructor
3. Add delegation methods
4. Update `README.md` and this document
5. NEVER break the BusinessService public API

---

## Validation Checklist

- [x] Zero public API changes
- [x] Zero behavior changes
- [x] Zero repository changes
- [x] Zero event changes
- [x] BusinessManager reduced from 743 → 277 lines
- [x] Accommodation logic isolated in dedicated manager
- [x] 5 stub managers created for future expansion
- [x] No circular dependencies
- [x] No PostgreSQL/Drizzle/WordPress/JWT imports
- [x] BusinessService interface identical to pre-refactoring
- [x] All cascade logic preserved (archive→hide, delete→archive, restore→restore)
- [x] All event emissions preserved
- [x] All permission checks preserved
- [x] Ready for P13.3 (Availability Capability)
