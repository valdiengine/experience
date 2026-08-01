# WordPress CMS Provider

> P12.2.3 — First CMS Provider Implementation for Valdi Engine.
> Connects the CMS Runtime with WordPress REST API.

## Architecture Position

```
Capabilities → context.runtime.cms
    ↓
CMS Runtime Integration (P12.2.2)
    ↓
CMS Contracts (P12.2.1)
    ↓
WordPress Provider              ← YOU ARE HERE
    ↓
WordPress REST API (wp-json)
```

## Directory Structure

| Path | Responsibility |
|------|---------------|
| `wordpress.provider.js` | Main provider entry — implements CmsProviderRuntime contract |
| `client/wordpress.client.js` | HTTP client — GET, POST, PUT, DELETE against wp-json |
| `client/wordpress.auth.js` | Authentication — Application Password, OAuth2, JWT, custom tokens |
| `client/wordpress.request.js` | Request layer — timeout, retry, backoff, rate limiting |
| `client/wordpress.errors.js` | Client-level errors |
| `content/wordpress.content.mapper.js` | Bidirectional mapping between WordPress and engine entities |
| `content/wordpress.content.reader.js` | Read content from WordPress |
| `content/wordpress.content.writer.js` | Write content to WordPress |
| `content/wordpress.post.mapper.js` | Post-specific mapping |
| `content/wordpress.page.mapper.js` | Page-specific mapping |
| `media/wordpress.media.client.js` | Media upload/download |
| `media/wordpress.media.mapper.js` | Media entity mapping |
| `media/wordpress.media.processor.js` | Thumbnails, geo-metadata, image variants |
| `seo/wordpress.seo.mapper.js` | Yoast/RankMath SEO metadata mapping |
| `seo/wordpress.seo.sync.js` | SEO data sync |
| `webhook/wordpress.webhook.handler.js` | Webhook dispatch and event routing |
| `webhook/wordpress.webhook.validator.js` | HMAC-SHA256 signature verification, replay protection |
| `sync/wordpress.sync.adapter.js` | Sync adapter for P12.2.4 integration |
| `events/wordpress.events.js` | WordPress-specific events |
| `errors/wordpress.provider.errors.js` | WordPress error hierarchy |

## Authentication

| Method | Support | Notes |
|--------|---------|-------|
| Application Password | ✅ Default | Basic Auth header |
| OAuth2 | ✅ Prepared | Bearer token |
| JWT | ✅ Prepared | Bearer token via JWT plugin |
| Custom Token | ✅ Prepared | X-WP-Token header |

Credentials resolved via `runtime/security/secrets` at initialization time.

## Content Mapping

| WordPress Entity | Engine Entity | Direction |
|-----------------|---------------|-----------|
| `wp/v2/posts` | CMS Content (post) | Bidirectional |
| `wp/v2/pages` | CMS Content (page) | Bidirectional |
| `wp/v2/media` | CMS Media | Pull |
| `wp/v2/categories` | CMS Taxonomy | Pull |
| `wp/v2/tags` | CMS Taxonomy | Pull |
| `wp/v2/users` | CMS Author | Pull |

## Events

All events prefixed with `wordpress:`. See `events/wordpress.events.js` for full list.

## Security

- Credentials stored in Secrets Runtime, never in code
- Webhook payloads verified with HMAC-SHA256
- Replay attack prevention via timestamp validation
- Rate limit tracking and graceful backoff

## Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `CMS_WORDPRESS_URL` | — | WordPress site URL |
| `CMS_WORDPRESS_USERNAME` | — | WordPress username |
| `CMS_WORDPRESS_APPLICATION_PASSWORD` | — | WordPress application password |
| `CMS_WORDPRESS_WEBHOOK_SECRET` | — | Webhook HMAC secret |
| `CMS_WORDPRESS_TIMEOUT` | 30000 | Request timeout (ms) |
| `CMS_WORDPRESS_RETRY` | 3 | Retry count |
| `CMS_WORDPRESS_AUTH_METHOD` | application_password | Authentication method |

## Dependencies

- No WordPress PHP code
- No third-party SDKs
- Uses `fetch` (platform native)
- Uses `crypto` (platform native)
