# CMS Domain & WordPress Integration Blueprint

> P12.2.0 — Architecture and domain model for CMS provider integration.
> WordPress is the first provider. The architecture supports Ghost, Strapi, Directus, Contentful, Sanity, and Custom CMS.

## 1. CMS Philosophy

### CMS as Content Infrastructure

The CMS is a **content infrastructure layer**, not a business logic layer. It stores and serves editorial content — articles, landing pages, marketing copy, media assets, SEO metadata — that enhances the Valdi Engine platform experience. It does NOT store or own business entities.

### CMS Is Not Business Logic

| Layer | Responsibility |
|-------|---------------|
| Valdi Engine | Business entities, reservations, availability, pricing, business rules, multi-tenant identity, authorization |
| CMS | Editorial content, landing pages, SEO metadata, media assets, translations, marketing content |

### CMS Stores Editorial Content

The CMS owns:
- Articles and blog posts
- Landing pages and marketing pages
- Rich text content blocks
- Media files and assets
- SEO metadata for CMS-owned content
- Author profiles and bios
- Categories and tags for content organization

### Engine Owns Business Entities

The Engine owns:
- Destinations, localities, places
- Businesses, accommodations, experiences
- Reservations, availability, pricing
- Visitors, identities, roles
- Routes, trails, mobility data
- Species, habitats, observations
- Partners, subscriptions, billing

### Synchronization Between Worlds

CMS and Engine communicate through a **CMS Sync Engine** that translates between two distinct domain models. Each entity knows its owner and synchronizer. No entity is owned by both. Shared entities (SEO metadata, media references) have explicit ownership boundaries.

### CMS Entity vs Engine Domain Entity

| CMS Entity | Engine Domain Entity |
|------------|---------------------|
| `Post` — article, news, blog | `Destination` — territory with identity |
| `Page` — landing, about, contact | `Business` — service provider inside destination |
| `Media` — images, video, files | `Accommodation` — bookable lodging |
| `Category` — content taxonomy | `Experience` — bookable activity |
| `Author` — content creator profile | `Route` — trail, path, mobility line |
| `Tag` — content metadata | `Species` — flora/fauna catalog entry |
| `Template` — layout blueprint | `Partner` — ecosystem participant |
| `Revision` — content version | `Story` — cultural memory narrative |
| `SEO Metadata` — search optimization | `Observation` — citizen science sighting |

## 2. CMS Domain Model

### CMSContent

| Property | Description |
|----------|-------------|
| **Purpose** | Abstract base for all CMS content types |
| **Ownership** | CMS |
| **Lifecycle** | draft → review → published → archived |
| **Identifiers** | `cmsId` (provider), `engineId` (local UUID), `slug` |
| **Relationships** | Author, Category, Media, SEO |
| **Tenant isolation** | `tenantId` on every content record |
| **Destination isolation** | `destinationId` on destination-scoped content |
| **Versioning** | Revision history through CMSRevision |
| **Sync rules** | Last-writer-wins with conflict detection |

### CMSPage

| Property | Description |
|----------|-------------|
| **Purpose** | Landing pages, about pages, contact pages, destination overview pages |
| **Ownership** | CMS |
| **Lifecycle** | draft → review → published → archived |
| **Identifiers** | `pageId`, `slug`, `providerPageId` |
| **Relationships** | Parent page (hierarchy), SEO, Media (featured image), Template |
| **Tenant isolation** | Scoped to one tenant |
| **Destination** | Optional destination association |
| **Versioning** | Full revision history |
| **Sync rules** | Push on publish, pull on schedule |

### CMSPost

| Property | Description |
|----------|-------------|
| **Purpose** | News articles, blog entries, editorial stories, destination highlights |
| **Ownership** | CMS |
| **Lifecycle** | draft → review → published → archived |
| **Identifiers** | `postId`, `slug`, `providerPostId` |
| **Relationships** | Author, Category, Tags, Media (featured image), SEO |
| **Tenant isolation** | Scoped to one tenant |
| **Destination** | Associated destination (optional) |
| **Versioning** | Full revision history |
| **Sync rules** | Pull on webhook, push on engine request |

### CMSMedia

| Property | Description |
|----------|-------------|
| **Purpose** | Images, video, drone content, documents, thumbnails |
| **Ownership** | CMS (file storage) / Engine (reference) |
| **Lifecycle** | uploaded → processed → optimized → available → archived |
| **Identifiers** | `mediaId`, `providerMediaId`, `checksum` |
| **Relationships** | Content items that embed or reference it |
| **Tenant isolation** | Scoped to tenant |
| **Destination** | Destination-scoped media (drone footage, photos) |
| **Versioning** | Versioned on replacement |
| **Sync rules** | Reference sync only (file stays in CMS/CDN) |

### CMSAuthor

| Property | Description |
|----------|-------------|
| **Purpose** | Content creator profile within CMS |
| **Ownership** | CMS |
| **Lifecycle** | active → inactive |
| **Identifiers** | `authorId`, `providerAuthorId`, `email` |
| **Relationships** | Posts, Pages |
| **Tenant isolation** | Scoped to tenant CMS instance |
| **Sync rules** | Pull on content sync |

### CMSCategory

| Property | Description |
|----------|-------------|
| **Purpose** | Content taxonomy for organizing posts and pages |
| **Ownership** | CMS |
| **Lifecycle** | active → inactive → merged |
| **Identifiers** | `categoryId`, `slug`, `providerCategoryId` |
| **Relationships** | Parent category (hierarchy), Posts, Pages |
| **Sync rules** | Pull on content sync, push on engine creation |

### CMSTag

| Property | Description |
|----------|-------------|
| **Purpose** | Lightweight content metadata for filtering and discovery |
| **Ownership** | CMS |
| **Lifecycle** | active → inactive |
| **Identifiers** | `tagId`, `slug`, `providerTagId` |
| **Relationships** | Posts |
| **Sync rules** | Pull on content sync |

### CMSCollection

| Property | Description |
|----------|-------------|
| **Purpose** | Curated group of content items (e.g., "Top 10 Destinations", "Summer Guide") |
| **Ownership** | CMS |
| **Lifecycle** | draft → published → archived |
| **Identifiers** | `collectionId`, `slug` |
| **Relationships** | Content items, Media, SEO |
| **Sync rules** | Push on publish |

### CMSRevision

| Property | Description |
|----------|-------------|
| **Purpose** | Immutable version snapshot of a content item |
| **Ownership** | CMS |
| **Lifecycle** | Created on content save |
| **Identifiers** | `revisionId`, `contentId`, `versionNumber` |
| **Relationships** | Content item it belongs to |
| **Retention** | Configurable (default: last 50 revisions) |
| **Sync rules** | Never synced — stays in source CMS |

### CMSSEO

| Property | Description |
|----------|-------------|
| **Purpose** | SEO metadata for any CMS content or engine entity |
| **Ownership** | Shared (CMS owns for CMS content, Engine owns for engine entities) |
| **Lifecycle** | Matches parent entity lifecycle |
| **Identifiers** | `seoId`, `entityId`, `entityType` |
| **Fields** | `title`, `description`, `canonicalUrl`, `ogTitle`, `ogDescription`, `ogImage`, `schemaType`, `keywords`, `noIndex`, `noFollow`, `structuredData` |
| **Sync rules** | Bidirectional with conflict resolution |

### CMSTemplate

| Property | Description |
|----------|-------------|
| **Purpose** | Layout blueprint for rendering content |
| **Ownership** | CMS (or theme/design system) |
| **Lifecycle** | active → deprecated → retired |
| **Identifiers** | `templateId`, `slug` |
| **Relationships** | Pages, Posts |
| **Sync rules** | Never synced — design system concern |

### CMSWebhook

| Property | Description |
|----------|-------------|
| **Purpose** | Real-time event notification from CMS provider |
| **Ownership** | CMS Runtime |
| **Lifecycle** | active → paused → disabled |
| **Identifiers** | `webhookId`, `providerWebhookId` |
| **Configuration** | URL, secret, events subscribed, retry policy |
| **Sync rules** | Inbound only — CMS to Engine |

### CMSSyncJob

| Property | Description |
|----------|-------------|
| **Purpose** | Record of a synchronization operation between CMS and Engine |
| **Ownership** | CMS Sync Engine |
| **Lifecycle** | pending → running → completed → failed |
| **Identifiers** | `syncJobId`, `correlationId` |
| **Fields** | `direction` (push/pull), `entityType`, `entityCount`, `startedAt`, `completedAt`, `status`, `errorLog` |
| **Retention** | Configurable (default: 30 days) |

## 3. CMS Ownership Model

### Engine Owns (No CMS involvement)

| Entity | Reason |
|--------|--------|
| Accommodation | Business data, pricing, availability |
| Reservation | Transactional data |
| Availability | Real-time inventory |
| Business | Core multi-tenant entity |
| Destination | Territory hierarchy root |
| Visitor | Identity and profile |
| Partner | Ecosystem participant |
| Route | Mobility intelligence |
| Species | Ecology catalog |
| Observation | Citizen science data |

### CMS Owns (No Engine involvement)

| Entity | Reason |
|--------|--------|
| Article / Blog Post | Editorial content |
| Landing Page | Marketing content |
| Media File (raw) | File storage and processing |
| Author Profile | Content creator identity |
| Content Taxonomy | Categories and tags |
| Template | Layout blueprint |
| Revision History | Content versioning |

### Shared (Explicit Ownership Border)

| Entity | CMS Owns | Engine Owns | Sync Direction |
|--------|----------|-------------|----------------|
| SEO Metadata | For CMS content | For engine entities | Bidirectional per owner |
| Media Reference | File storage | Entity→media association | Reference sync |
| Translation | Translated content | Entity identity | Content: CMS→Engine; Entity refs: Engine→CMS |
| Featured Image | Image file | Which image is featured | Reference sync |
| Slug | URL path | Entity identifier | Engine canonical, CMS editorial |

### Ownership Rules

1. **No duplicated ownership.** Every field has exactly one owner.
2. **Engine-canonical fields** (IDs, timestamps, tenant) always come from Engine.
3. **CMS-canonical fields** (content body, media, author) always come from CMS.
4. **Sync direction** is determined by ownership, not by convenience.
5. **Conflict resolution** favors the owner. If engine and CMS disagree, the owner wins.

## 4. CMS Runtime Architecture

### Layer Position

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
│    │                                           │
│    ├─ CmsRuntimeContext ← context.runtime.cms  │
│    ├─ CmsRuntimeRegistry                       │
│    ├─ CmsRuntimeFactory                        │
│    └─ CmsRuntimeHealth                         │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│              CMS Domain Engine                 │
│                                                │
│  CmsEngine                                     │
│    ├─ ContentEngine (get, create, update,      │
│    │   delete, search, publish)                │
│    ├─ MediaEngine (upload, process,            │
│    │   optimize, serve)                        │
│    ├─ SeoEngine (metadata, schema, sitemap)    │
│    ├─ SyncEngine (pull, push, webhook,         │
│    │   scheduled, conflict resolve)            │
│    ├─ TemplateEngine (resolve, render)         │
│    └─ PreviewEngine (generate preview)         │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│             CMS Contracts                      │
│                                                │
│  ContentRuntime        MediaRuntime            │
│  SeoRuntime            SyncRuntime             │
│  TemplateRuntime       PreviewRuntime          │
│  WebhookRuntime                                │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│            CMS Provider Interface              │
│                                                │
│  CmsProviderRuntime                            │
│    ├─ content / media / seo / sync / webhook   │
│    ├─ health() / supports() / available()      │
│    └─ name / version / features                │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│          WordPress Provider (P12.2.3)          │
│                                                │
│  REST API Client                               │
│  Webhook Handler                               │
│  Content Mapper (WP↔Engine)                    │
│  Media Sync                                    │
│  SEO Sync                                      │
└─────────────────────────────────────────────────┘
```

### context.runtime.cms

Expected API surface (contracts, not implementation):

**Content:**
- `cms.content.get(id, options)` — Get content by ID
- `cms.content.query(filters, pagination)` — Search content
- `cms.content.create(data)` — Create content in CMS
- `cms.content.update(id, data)` — Update content in CMS
- `cms.content.delete(id)` — Delete content from CMS
- `cms.content.publish(id)` — Publish content
- `cms.content.unpublish(id)` — Unpublish content

**Media:**
- `cms.media.upload(file, options)` — Upload media to CMS
- `cms.media.get(id)` — Get media metadata
- `cms.media.delete(id)` — Delete media from CMS
- `cms.media.serve(id, transforms)` — Get optimized URL

**SEO:**
- `cms.seo.get(entityId, entityType)` — Get SEO metadata
- `cms.seo.set(entityId, entityType, data)` — Set SEO metadata
- `cms.seo.sitemap.generate()` — Generate XML sitemap
- `cms.seo.validate(url)` — Validate SEO metadata on URL

**Sync:**
- `cms.sync.trigger(entityType, direction)` — Start sync job
- `cms.sync.status(jobId)` — Check sync job status
- `cms.sync.history(filters)` — List sync history

**Preview:**
- `cms.preview.generate(contentId)` — Generate preview URL
- `cms.preview.resolve(token)` — Resolve preview token

## 5. CMS Provider Architecture

### Provider Interface

```js
class CmsProviderRuntime {
  async initialize(config) { }
  async health() { }
  available() { }
  supports(feature) { }
  // Content
  async contentGet(id, options) { }
  async contentQuery(filters, pagination) { }
  async contentCreate(data) { }
  async contentUpdate(id, data) { }
  async contentDelete(id) { }
  async contentPublish(id) { }
  async contentUnpublish(id) { }
  // Media
  async mediaUpload(file, options) { }
  async mediaGet(id) { }
  async mediaDelete(id) { }
  async mediaServe(id, transforms) { }
  // SEO
  async seoGet(entityId, entityType) { }
  async seoSet(entityId, entityType, data) { }
  // Sync
  async syncPull(entityType, options) { }
  async syncPush(entityType, items) { }
  // Webhook
  async webhookSubscribe(events, url, secret) { }
  async webhookUnsubscribe(id) { }
  async webhookVerify(payload, signature) { }
}
```

### Future Provider Compatibility

| Provider | REST | GraphQL | Webhooks | Media | SEO |
|----------|------|---------|----------|-------|-----|
| WordPress | ✅ WP REST API | ✅ WPGraphQL | ✅ | ✅ | ✅ Yoast/RankMath |
| Ghost | ✅ Ghost API | ❌ | ✅ | ✅ | ✅ Built-in |
| Strapi | ✅ | ❌ | ✅ | ✅ | ✅ Plugin |
| Directus | ✅ | ❌ | ✅ | ✅ | ✅ Built-in |
| Contentful | ✅ | ✅ Contentful API | ✅ | ✅ | ✅ Built-in |
| Sanity | ✅ | ✅ GROQ | ✅ | ✅ | ✅ Built-in |
| Custom CMS | Implement contract | — | — | — | — |

### Provider Selection

Provider is selected at **deployment configuration time**, not at build time. The `CmsRuntimeFactory` resolves the provider class based on config:

```js
const provider = config.cms.provider || 'wordpress'
const ProviderClass = CMS_PROVIDER_REGISTRY[provider]
```

## 6. WordPress Integration Strategy

### WordPress Role: Editorial CMS Provider

WordPress serves as the **editorial content backend**. It is NOT the application backend. WordPress handles:
- WYSIWYG content creation for editors
- Media library management
- SEO metadata through Yoast/RankMath
- Content scheduling and workflow
- Taxonomy management
- User roles for content authors

### WordPress Is Not

- A business data store
- A reservation system
- A user identity provider
- An API gateway
- A caching layer for Engine data
- A real-time data source

### WordPress REST API Usage

| WordPress Endpoint | CMS Runtime Mapping | Direction |
|-------------------|-------------------|-----------|
| `GET /wp/v2/posts` | `content.query({ type: 'post' })` | Pull |
| `POST /wp/v2/posts` | `content.create({ type: 'post' })` | Push |
| `PUT /wp/v2/posts/{id}` | `content.update(id, data)` | Push |
| `DELETE /wp/v2/posts/{id}` | `content.delete(id)` | Push |
| `GET /wp/v2/pages` | `content.query({ type: 'page' })` | Pull |
| `GET /wp/v2/media` | `media.get(id)` | Pull |
| `POST /wp/v2/media` | `media.upload(file)` | Push |
| `GET /wp/v2/categories` | Sync taxonomy | Pull |
| `GET /wp/v2/users` | `author.sync()` | Pull |
| `GET /yoast/v1/*` | `seo.get(entityId, type)` | Pull |

### WordPress REST API Integration

The WordPress provider will:
1. Connect to `example.com/wp-json/wp/v2/` endpoints
2. Authenticate via Application Password or OAuth
3. Map WordPress entities to Engine CMS entities
4. Transform WordPress response format to Engine format
5. Handle pagination, embedding, and field selection
6. Respect WordPress capabilities and permissions

### WordPress Webhooks

WordPress webhooks notify Engine of:
- `post_created` / `post_updated` / `post_deleted`
- `page_created` / `page_updated` / `page_deleted`
- `media_uploaded` / `media_deleted`
- `category_created` / `category_updated`

Webhook payload is verified using HMAC-SHA256 signature.

## 7. Synchronization Architecture

### Architecture

```
WordPress Site
    ↑↓ REST + Webhooks
CMS Sync Engine
    ↑↓ CmsDomainEngine
Valdi Engine Runtime
```

### Sync Modes

| Mode | Direction | Trigger | Use Case |
|------|-----------|---------|----------|
| Pull | CMS → Engine | Scheduled / Webhook | Content updates from WordPress |
| Push | Engine → CMS | Manual / API | Creating content from Engine admin |
| Webhook | CMS → Engine | Real-time | Instant content sync |
| Full sync | Bidirectional | Scheduled | Reconciliation |

### Pull Flow

```
1. Webhook received or schedule triggered
2. SyncEngine identifies changed entities
3. For each entity type:
   a. Fetch modified entities from CMS (since last sync)
   b. Map CMS entities to Engine CMS entities
   c. Check conflict (was entity modified in Engine since last sync?)
   d. If no conflict: update Engine entity
   e. If conflict: apply conflict resolution policy
4. Record sync job result
5. Emit cms:sync_completed or cms:sync_failed
```

### Push Flow

```
1. Capability creates content through context.runtime.cms
2. CmsEngine validates and maps content
3. SyncEngine pushes to CMS provider
4. CMS returns providerId
5. Engine stores providerId mapping
6. Emit cms:content_created
```

### Conflict Resolution

| Scenario | Resolution |
|----------|------------|
| CMS modified, Engine not modified | Accept CMS version |
| Engine modified, CMS not modified | Accept Engine version |
| Both modified | Last-writer-wins with owner preference |
| Deleted in CMS, modified in Engine | Flag for manual review |
| Deleted in Engine, modified in CMS | Flag for manual review |

### Retry Strategy

| Attempt | Delay | Backoff |
|---------|-------|---------|
| 1 | 5s | — |
| 2 | 15s | 3x |
| 3 | 45s | 3x |
| 4 | 2min | 2.7x |
| 5 | 5min | 2.5x |
| 6+ | 15min | 3x (capped) |

### Failed Sync Recovery

1. Sync failure is recorded in `CMSSyncJob` with error details
2. Failed items are queued for retry
3. After 5 consecutive failures, item is flagged for manual review
4. Admin can trigger manual re-sync per item or per entity type
5. Full sync can be triggered to reset sync state

## 8. CMS Events

### Content Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `cms:content_created` | `{ contentId, type, provider, tenantId }` | Content created in CMS |
| `cms:content_updated` | `{ contentId, type, provider, tenantId, changedFields }` | Content updated |
| `cms:content_deleted` | `{ contentId, type, provider, tenantId }` | Content deleted |
| `cms:content_published` | `{ contentId, type, provider, tenantId }` | Content published |
| `cms:content_unpublished` | `{ contentId, type, provider, tenantId }` | Content unpublished |
| `cms:content_archived` | `{ contentId, type, provider, tenantId }` | Content archived |

### Media Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `cms:media_uploaded` | `{ mediaId, mimeType, size, tenantId }` | Media uploaded |
| `cms:media_processed` | `{ mediaId, thumbnails, tenantId }` | Media processed |
| `cms:media_deleted` | `{ mediaId, tenantId }` | Media deleted |

### SEO Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `cms:seo_updated` | `{ entityId, entityType, tenantId }` | SEO metadata changed |
| `cms:sitemap_generated` | `{ url, count, tenantId }` | Sitemap generated |

### Sync Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `cms:sync_started` | `{ jobId, direction, entityType, tenantId }` | Sync job started |
| `cms:sync_completed` | `{ jobId, direction, entityType, count, tenantId }` | Sync job completed |
| `cms:sync_failed` | `{ jobId, direction, entityType, error, tenantId }` | Sync job failed |
| `cms:sync_conflict` | `{ jobId, entityId, entityType, engineVersion, cmsVersion, tenantId }` | Sync conflict detected |

### Webhook Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `cms:webhook_received` | `{ provider, event, entityType, entityId, tenantId }` | Webhook received |
| `cms:webhook_verified` | `{ provider, event, valid }` | Webhook signature verified |
| `cms:webhook_failed` | `{ provider, event, error }` | Webhook processing failed |

## 9. CMS Security Model

### API Authentication

| Provider | Auth Method | Credential Storage |
|----------|-------------|-------------------|
| WordPress | Application Password / OAuth | Secrets Runtime |
| Ghost | Admin API Key | Secrets Runtime |
| Strapi | API Token | Secrets Runtime |
| Directus | Static Token | Secrets Runtime |
| Contentful | CMA Token | Secrets Runtime |
| Sanity | Project Token | Secrets Runtime |

### Provider Credentials

Credentials are stored in the **Secrets Runtime** (`runtime/security/secrets.runtime.js`), never in code, config files, or environment variables that could leak. The CMS Runtime resolves secrets at initialization time and keeps them in memory only.

```js
// CMS Runtime initialization flow
const secrets = await context.runtime.secrets.get(`cms.provider.${providerName}`)
// secrets contains { host, username, password, token }
// Never logged, never serialized
```

### Webhook Verification

Every CMS webhook must be verified before processing:

| Provider | Method |
|----------|--------|
| WordPress | HMAC-SHA256 of payload using shared secret |
| Ghost | Webhook secret header verification |
| Strapi | Custom X-Strapi-Signature |
| Directus | Webhook token matching |
| Contentful | X-Contentful-Signature |
| Sanity | Webhook secret verification |

### Signature Validation

```js
// Pseudocode for signature validation
function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(JSON.stringify(payload))
  const expected = `sha256=${hmac.digest('hex')}`
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

### Rate Limits

| Level | Limit | Applied |
|-------|-------|---------|
| Per tenant | 100 req/min | API requests to CMS provider |
| Per provider | 500 req/min | Across all tenants for same provider |
| Per webhook | 50 events/min | Incoming webhook processing |
| Per sync job | 1000 items/job | Entity sync per job |

### Tenant Isolation

- Each tenant maps to a separate CMS site/space/instance
- Tenant A can never access Tenant B's content
- CMS credentials are tenant-scoped
- Webhook endpoints include tenant ID for routing
- Sync jobs are tenant-isolated

### Permission Checks

All CMS Runtime operations go through `context.runtime.auth.can()`:

| Action | Resource | Permission Description |
|--------|----------|-----------------------|
| `cms:content_read` | `cms:content:{type}` | Read content |
| `cms:content_create` | `cms:content:{type}` | Create content |
| `cms:content_update` | `cms:content:{id}` | Update specific content |
| `cms:content_delete` | `cms:content:{id}` | Delete specific content |
| `cms:content_publish` | `cms:content:{type}` | Publish content |
| `cms:media_upload` | `cms:media` | Upload media |
| `cms:media_delete` | `cms:media:{id}` | Delete media |
| `cms:seo_manage` | `cms:seo:{entityType}` | Manage SEO metadata |
| `cms:sync_trigger` | `cms:sync` | Trigger sync job |
| `cms:settings_manage` | `cms:settings` | Manage CMS provider settings |

## 10. Multi-Tenant CMS Strategy

### Tenant ↔ CMS Instance Mapping

| Deployment Model | CMS Setup | Tenant Isolation |
|-----------------|-----------|-----------------|
| One tenant, one WP | Single WordPress site | N/A (single tenant) |
| Multi-tenant, multi-WP | One WordPress site per tenant | **Full isolation** — each tenant has own WordPress |
| Multi-tenant, single WP | One WordPress multisite | **Site-level isolation** — each tenant is a sub-site |
| Multi-tenant, shared WP | One WordPress with custom tax | **Content-level isolation** — content tagged by tenant |

### Tenant Mapping

```js
// CMS provider config per tenant
{
  tenantId: "tenant_abc",
  cms: {
    provider: "wordpress",
    config: {
      siteUrl: "https://tenant-abc.example.com",
      applicationPassword: "****",  // stored in Secrets Runtime
      webhookSecret: "****",
      restApiVersion: "wp/v2",
    }
  }
}
```

### Destination Mapping

Destinations within a tenant can map to:
- WordPress categories (for filtering)
- WordPress tags (for cross-cutting content)
- Custom post types (for destination-specific content)
- WordPress multisite sub-sites

### Ownership Rules

| Scope | Content Owner | Identifier |
|-------|---------------|------------|
| Platform | Admin content | `{ tenant: null, destination: null }` |
| Tenant | Tenant landing pages | `{ tenant: tenantId, destination: null }` |
| Destination | Destination content | `{ tenant: tenantId, destination: destId }` |
| Business | Business profile content | `{ tenant: tenantId, destination: destId, business: businessId }` |

### Access Control

- Platform admins can manage CMS provider configuration
- Tenant admins can manage their tenant's CMS content
- Destination managers can manage destination-scoped content
- Content authors can only edit their own content
- All operations pass through `context.runtime.auth.can()`

## 11. SEO Integration Model

### Architecture

```
SEO Intelligence Capability (P9.1)
    ↓
context.runtime.seo (future)
    ↓
┌──────────────────────────────────────────────┐
│              CMS SEO Engine                    │
│                                                │
│  SeoEngine module inside CmsEngine             │
│    ├─ get(entityId, entityType)                │
│    ├─ set(entityId, entityType, data)          │
│    ├─ validate(url)                            │
│    └─ sitemap.generate(tenantId)               │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│         WordPress SEO Provider                 │
│                                                │
│  Yoast SEO / RankMath API integration          │
│    ├─ Read metadata from WordPress             │
│    ├─ Write metadata to WordPress              │
│    ├─ Generate sitemap via WordPress           │
│    └─ Validate URL structure                   │
└─────────────────────────────────────────────────┘
```

### SEO Metadata Schema

| Field | Source | Sync |
|-------|--------|------|
| `title` | CMS (editorial) | CMS → Engine |
| `description` | CMS (editorial) | CMS → Engine |
| `canonicalUrl` | Engine (canonical) | Engine → CMS |
| `ogTitle` | CMS | CMS → Engine |
| `ogDescription` | CMS | CMS → Engine |
| `ogImage` | CMS media | Reference sync |
| `schemaType` | Engine (entity type) | Engine → CMS |
| `keywords` | CMS + Engine | Bidirectional |
| `noIndex` | Engine (business rule) | Engine → CMS |
| `noFollow` | Engine (business rule) | Engine → CMS |
| `structuredData` | Engine | Engine → CMS |

### Sitemap Strategy

| Sitemap Type | Generated By | Includes |
|-------------|--------------|----------|
| CMS content | WordPress (Yoast) | Posts, pages, categories |
| Engine entities | Valdi Engine | Destinations, businesses, accommodations |
| Combined | Valdi Engine (future) | Both CMS + Engine entities |

### Key Principle

**SEO metadata is synchronized between CMS and Engine.** The CMS provides editorial SEO (titles, descriptions, social cards). The Engine provides canonical SEO (URLs, schema types, structured data). Both sides contribute to the final SEO output without duplicating ownership.

## 12. Media Architecture

### Media Lifecycle

```
Upload
  │
  ▼
Process ───→ Optimize ───→ Store Reference ───→ Serve through CDN
  │                                                      │
  ▼                                                      ▼
Thumbnails                                          Responsive URLs
  │
  ▼
Metadata Extraction
```

### Media Types

| Type | Processing | Storage |
|------|------------|---------|
| Images | Resize, optimize, generate thumbnails | CMS media library + CDN |
| Video | Transcode, generate poster | CMS media library + CDN |
| Drone Content | Geo-tag, extract metadata | CMS media library + specialized storage |
| Documents | Extract text, generate preview | CMS media library |
| Thumbnails | Auto-generated from originals | CDN (originals stay in CMS) |

### Media Reference Model

Engine does NOT store media files. Engine stores **media references**:

```js
{
  mediaId: "uuid",
  providerMediaId: "123",          // WordPress attachment ID
  provider: "wordpress",
  url: "https://cdn.example.com/wp-content/uploads/photo.jpg",
  thumbnails: {
    thumbnail: "https://.../photo-150x150.jpg",
    medium: "https://.../photo-300x200.jpg",
    large: "https://.../photo-1024x678.jpg",
  },
  mimeType: "image/jpeg",
  size: 245000,
  width: 1920,
  height: 1280,
  alt: "Sunset over Torres del Paine",
  caption: "Photo by Visitor",
  copyright: "© 2026 Visitor Name",
  checksum: "sha256-hash",
  tenantId: "tenant_abc",
  destinationId: "dest_patagonia",
  tags: ["drone", "landscape", "featured"],
}
```

### Responsive Images

The CMS provider delivers responsive image URLs. The Engine stores the URL template and breakpoints, not the files. Image transformations happen at the CDN/provider level.

### Copyright & Attribution

- Copyright information is stored in both CMS (EXIF/metadata) and Engine (media reference)
- Attribution is required for community-contributed media
- Drone content has additional geo-tagging and compliance metadata

## 13. Offline Strategy

### CMS Content Offline Behavior

| Scenario | Behavior |
|----------|----------|
| CMS provider unavailable | Serve cached content from Engine cache |
| Network unavailable | Serve last-synced version |
| Stale content | Serve with stale-while-revalidate header |
| Sync failure | Retry with exponential backoff, flag for review |
| Priority content | Pre-synced and pinned in cache |

### Cache Strategy

```
context.runtime.cms.content.get(id)
  │
  ├─ Check Engine cache (Redis/memory)
  │   └─ Hit → return cached content
  │
  ├─ Check CMS provider
  │   ├─ Available → fetch, cache, return
  │   └─ Unavailable → return stale cache with warning header
  │
  └─ Cache miss + CMS unavailable → return error
```

### Cache TTLs

| Content Type | Cache TTL | Stale TTL |
|-------------|-----------|-----------|
| Published posts | 5 min | 1 hour |
| Pages | 10 min | 2 hours |
| Media metadata | 30 min | 6 hours |
| Categories/Tags | 1 hour | 12 hours |
| SEO metadata | 15 min | 2 hours |

### Priority Content

Content marked as `priority: true` is:
- Pre-synced to Engine storage on publish
- Pinned in cache (never evicted)
- Available offline even on first request
- Used for critical pages (landing, about, contact)

### Patagonia Environments

For low-connectivity environments (Patagonia, rural areas):
1. **Critical content bundles** are pre-synced during deployment
2. **Content manifests** list all available content
3. **Sync-on-connect** resumes when connectivity returns
4. **Offline-first** rendering uses cached content by default
5. **Background sync** updates content when network available
6. **Conflict queue** stores changes made offline for later sync

## 14. CMS Architecture Rules

| Rule | Description |
|------|-------------|
| CMS-001 | Capabilities never import CMS providers |
| CMS-002 | WordPress is replaceable — no WordPress-specific code outside provider |
| CMS-003 | CMS does not own business entities — ownership is strict |
| CMS-004 | All CMS communication goes through `context.runtime.cms` |
| CMS-005 | Events are provider independent — no WordPress event names |
| CMS-006 | Tenant isolation is mandatory — content never crosses tenant boundary |
| CMS-007 | SEO metadata synchronization is controlled — per-field ownership |
| CMS-008 | Media ownership is explicit — Engine stores references, not files |
| CMS-009 | CMS credentials never leak — stored in Secrets Runtime, never in code |
| CMS-010 | No provider-specific logic outside provider directory |
| CMS-011 | Sync direction follows ownership — never sync what you don't own |
| CMS-012 | Webhook payloads must be verified before processing |
| CMS-013 | CMS Runtime follows Platform Runtime lifecycle |
| CMS-014 | Offline content is a first-class concern, not an afterthought |

## 15. Validation Checklist

- [x] Provider independent — all CMS providers implement the same contract
- [x] Multi-tenant ready — tenant isolation, per-tenant provider config, destination scoping
- [x] Offline compatible — cache strategy, stale content, priority content, Patagonia environments
- [x] Event driven — 22 CMS events across content, media, SEO, sync, webhook domains
- [x] SEO ready — Yoast/RankMath integration, sitemap strategy, field-level ownership
- [x] Media ready — lifecycle, responsive images, CDN integration, copyright model
- [x] WordPress replaceable — no WordPress-specific code in CMS Runtime, contracts define the boundary
- [x] No capability coupling — capabilities only use `context.runtime.cms`, never import providers
- [x] Future CMS compatible — Ghost, Strapi, Directus, Contentful, Sanity, Custom CMS
- [x] Security hardened — credential isolation, webhook verification, rate limits, permission checks
- [x] Ownership model strict — no duplicated ownership, clear sync direction per entity
- [x] Synchronization robust — pull/push/webhook/scheduled, conflict resolution, retry, recovery

---

## Next Phases

| Phase | Description |
|-------|-------------|
| P12.2.1 | CMS Runtime Contracts — abstract interfaces for Content, Media, SEO, Sync, Webhook, Preview |
| P12.2.2 | CMS Runtime Integration — bridge between CMS Runtime and Platform Runtime |
| P12.2.3 | WordPress Provider Implementation — REST API client, webhooks, content mapping |
| P12.2.4 | CMS Synchronization Engine — bidirectional sync with conflict resolution |
