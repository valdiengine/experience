# WordPress Provider Architecture

> P12.2.3 — First CMS Provider Implementation.
> Bridges Valdi Engine CMS Runtime with WordPress REST API.

## Architecture Position

```
Capabilities (via context.runtime.cms)
    ↓
┌──────────────────────────────────────────────────┐
│            CMS Runtime Integration                │
│  (cms.runtime.integration.js — P12.2.2)           │
└──────────────────────┬───────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│            CMS Provider Contract                  │
│  (CmsProviderRuntime — P12.2.1)                   │
└──────────────────────┬───────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│           WordPress Provider                       │
│                                                   │
│  wordpress.provider.js                            │
│    ├─ client/    (HTTP, auth, retry)              │
│    ├─ content/   (read, write, map)               │
│    ├─ media/     (upload, process)                │
│    ├─ seo/       (Yoast/RankMath)                │
│    ├─ webhook/   (verify, dispatch)              │
│    └─ sync/      (pull/push adapter)             │
└──────────────────────┬───────────────────────────┘
                       ↓
             WordPress REST API
             (example.com/wp-json/)
```

## Lifecycle

```
1. Platform Runtime initializes CMS Runtime Integration
2. CMS Runtime resolves provider = 'wordpress' from config
3. CMS Runtime Factory instantiates WordPressProvider
4. WordPressProvider.initialize():
   a. Resolves secrets from Secrets Runtime
   b. Creates WordPressClient
   c. Connects to WordPress REST API (wp-json/)
   d. Authenticates via Application Password
   e. Sets webhook signing secret
   f. Emits wordpress:connected
5. Provider ready — capabilities can use context.runtime.cms
6. On shutdown: disconnect, emit wordpress:disconnected
```

## Authentication

### Supported Methods

| Method | Mechanism | Configuration |
|--------|-----------|---------------|
| Application Password | `Authorization: Basic base64(user:pass)` | Default. Requires username + application password. |
| OAuth2 | `Authorization: Bearer <token>` | OAuth2 client credentials flow. Token in Secrets Runtime. |
| JWT | `Authorization: Bearer <token>` | JWT Authentication plugin token. |
| Custom Token | `X-WP-Token: <token>` | Custom header token for bespoke setups. |

### Credential Resolution

```js
// Secrets Runtime resolves credentials at initialization:
const secrets = await context.runtime.secrets.get('cms.provider.wordpress')
// {
//   username: 'wp_admin',
//   applicationPassword: 'xxxx xxxx xxxx xxxx xxxx xxxx',
//   webhookSecret: 'whsec_xxxx',
// }
```

Credentials are never logged, never serialized, never exposed to capabilities.

## Content Mapping

### WordPress → Engine

| WordPress Field | Engine Field | Notes |
|----------------|-------------|-------|
| `id` | `cmsId` | String |
| `type` | `type` | 'post' or 'page' |
| `title.rendered` | `title` | Stripped HTML |
| `slug` | `slug` | URL-safe |
| `content.rendered` | `content` | HTML preserved |
| `excerpt.rendered` | `excerpt` | HTML preserved |
| `status` | `status` | Mapped: publish→published, draft→draft, etc. |
| `author` | `authorId` | String |
| `categories` | `categoryIds` | Array of strings |
| `tags` | `tagIds` | Array of strings |
| `featured_media` | `featuredMediaId` | String |
| `date` | `createdAt` | ISO 8601 |
| `modified` | `updatedAt` | ISO 8601 |
| `_embedded` | `meta` | Extended data |
| `link` | `meta.wpLink` | Permalink |

### Engine → WordPress

| Engine Field | WordPress Field | Notes |
|-------------|----------------|-------|
| `title` | `title` | String |
| `slug` | `slug` | Optional |
| `status` | `status` | Reverse-mapped |
| `content` | `content` | HTML |
| `excerpt` | `excerpt` | HTML |
| `authorId` | `author` | Integer |
| `categoryIds` | `categories` | Integer array |
| `tagIds` | `tags` | Integer array |
| `featuredMediaId` | `featured_media` | Integer |

### Entities NOT Mapped

The following are NEVER mapped through WordPress:

- `Accommodation` — business data
- `Reservation` — transactional data
- `Business` — core entity
- `Destination` — territory entity
- `Visitor` — identity
- `Partner` — ecosystem participant
- `Species`, `Observation` — ecology data
- Any entity with `ownership: engine`

## Media Architecture

### Upload Flow

```
1. Capability uploads file via context.runtime.cms.media.upload(file, options)
2. WordPressProvider.mediaUpload() receives file
3. WordPressClient POST to /wp/v2/media with FormData
4. WordPress processes file (thumbnails, metadata extraction)
5. Response mapped to CMS Media entity
6. Engine stores reference (URL, thumbnails, metadata)
7. File stays in WordPress/CDN — Engine never stores raw files
```

### Media Reference Model

Engine stores:

```js
{
  mediaId: "uuid",
  provider: "wordpress",
  providerMediaId: "123",
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
  alt: "Description",
  caption: "Photo caption",
}
```

## SEO Integration

### Provider Support

| SEO Plugin | Read | Write | Notes |
|-----------|------|-------|-------|
| Yoast SEO | ✅ | ⚠️ Partial | Read via Yoast REST API. Write requires Yoast plugin support. |
| RankMath | ✅ | ❌ | Read via embedded post meta. Write not available via REST. |

### SEO Mapping

| WordPress SEO Field | Engine Field | Direction |
|-------------------|-------------|-----------|
| `yoast_head_json.title` | `title` | WP → Engine |
| `yoast_head_json.description` | `description` | WP → Engine |
| `yoast_head_json.canonical` | `canonicalUrl` | WP → Engine |
| `yoast_head_json.og_title` | `ogTitle` | WP → Engine |
| `yoast_head_json.og_description` | `ogDescription` | WP → Engine |
| `yoast_head_json.og_image` | `ogImage` | WP → Engine |
| `yoast_head_json.schema_type` | `schemaType` | WP → Engine |
| `yoast_head_json.noindex` | `noIndex` | WP → Engine |

## Webhook Architecture

### Verification

```js
// HMAC-SHA256 verification
function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(JSON.stringify(payload))
  const expected = `sha256=${hmac.digest('hex')}`
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

### Replay Protection

- Timestamp check: reject webhooks older than 300 seconds
- Configurable via `webhookMaxAge`

### Event Mapping

| WordPress Action | Engine Event |
|----------------|-------------|
| `post_created` | `wordpress:content_created` |
| `post_updated` | `wordpress:content_updated` |
| `post_deleted` | `wordpress:content_deleted` |
| `media_uploaded` | `wordpress:media_uploaded` |
| `media_deleted` | `wordpress:media_deleted` |

## Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `wordpress:connected` | `{ siteUrl, authMethod }` | Provider initialized |
| `wordpress:disconnected` | `{ siteUrl }` | Provider shutdown |
| `wordpress:content_created` | `{ type, cmsId, provider }` | Content created in WordPress |
| `wordpress:content_updated` | `{ type, cmsId, provider }` | Content updated |
| `wordpress:content_deleted` | `{ type, cmsId, provider }` | Content deleted |
| `wordpress:content_published` | `{ type, cmsId, provider }` | Content published |
| `wordpress:content_unpublished` | `{ type, cmsId, provider }` | Content unpublished |
| `wordpress:media_uploaded` | `{ mediaId, mimeType, provider }` | Media uploaded |
| `wordpress:media_deleted` | `{ mediaId, provider }` | Media deleted |
| `wordpress:webhook_received` | `{ eventType, entityId, entityType }` | Webhook received |
| `wordpress:webhook_verified` | `{ eventType, valid }` | Webhook verified |
| `wordpress:webhook_failed` | `{ eventType, reason }` | Webhook verification failed |
| `wordpress:sync_started` | `{ entityType, direction }` | Sync started |
| `wordpress:sync_completed` | `{ entityType, count }` | Sync completed |
| `wordpress:sync_failed` | `{ entityType, error }` | Sync failed |
| `wordpress:rate_limited` | `{ retryAfter }` | Rate limited |
| `wordpress:error` | `{ error, phase }` | Error |

## Error Hierarchy

```
RuntimeError
  └─ CmsError
       └─ CmsProviderError
            └─ WordPressProviderError
                 ├─ WordPressConnectionError
                 ├─ WordPressAuthenticationError
                 ├─ WordPressRateLimitError
                 ├─ WordPressTimeoutError
                 ├─ WordPressNotFoundError
                 ├─ WordPressMappingError
                 ├─ WordPressWebhookError
                 ├─ WordPressValidationError
                 └─ WordPressClientError
                      ├─ WordPressRequestError
                      ├─ WordPressResponseError
                      └─ WordPressSerializationError
```

## Security

### Isolation Rules

1. **No WordPress imports outside `providers/wordpress/`** — WordPress is completely isolated
2. **No capability changes** — capabilities continue using `context.runtime.cms`
3. **No business logic** — provider maps CMS entities only, never business entities
4. **Credential isolation** — secrets resolved via Secrets Runtime at init time
5. **Webhook verification** — HMAC-SHA256 with replay protection
6. **Tenant isolation** — each tenant has separate WordPress credentials
7. **No raw file storage** — Engine stores references only, files stay in WordPress/CDN

## Future Provider Compatibility

The same contract structure supports:

| Provider | REST | Webhooks | Media | SEO |
|----------|------|----------|-------|-----|
| WordPress | ✅ | ✅ | ✅ | ✅ Yoast/RankMath |
| Ghost | Ghost API | ✅ | ✅ | ✅ Built-in |
| Strapi | ✅ | ✅ | ✅ | ✅ Plugin |
| Directus | ✅ | ✅ | ✅ | ✅ Built-in |
| Contentful | ✅ | ✅ | ✅ | ✅ Built-in |
| Sanity | ✅ GROQ | ✅ | ✅ | ✅ Built-in |

Swap requires: new provider directory implementing `CmsProviderRuntime`, registration in `CmsRuntimeFactory`, zero changes to capabilities.

## Validation Checklist

- [x] No WordPress imports outside `providers/wordpress/`
- [x] No capability changes
- [x] No business logic inside provider
- [x] CMS entities only — no Accommodation, Reservation, Business, Destination
- [x] Provider replaceable — implements CmsProviderRuntime contract
- [x] Multi-tenant ready — tenant-scoped credentials
- [x] Event driven — 18 WordPress events
- [x] Credentials via Secrets Runtime — never in code
- [x] Webhook verification with HMAC-SHA256 + replay protection
- [x] Rate limit handling with exponential backoff
- [x] Ready for Sync Engine (P12.2.4) — WordPressSyncAdapter implemented
- [x] Architecture documentation complete
