# Platform Runtime Architecture

> P12.0.5.1 — Platform Runtime Architecture.
> The single gateway between the platform and every infrastructure service.
> No capability knows PostgreSQL, Drizzle, JWT, OAuth, Redis, S3, Stripe, OpenAI, Mapbox, or any vendor exists.

---

## 1. Purpose

### Why the Platform Runtime Exists

The persistence stack solved data access. But the platform needs:

- Authentication
- Storage
- Media
- Notifications
- Email
- Payments
- Queue
- Search
- AI
- Cache
- Realtime
- Sync
- Analytics
- Weather
- Maps
- External APIs

Without a Runtime layer, every new infrastructure service leaks into capabilities. Each capability would need to know JWT, S3, Stripe, OpenAI — violating layer isolation.

The Platform Runtime prevents this forever.

### What It Is

A provider-agnostic abstraction layer that:

- Defines contracts for every infrastructure category
- Manages provider lifecycle (registration, initialization, health, shutdown)
- Provides feature detection per service
- Supports primary/fallback/disabled provider strategies
- Aggregates health across all services
- Gives capabilities a single entry point: `context.runtime`

### What It Is Not

- Not a provider implementation
- Not authentication logic
- Not storage logic
- Not payment logic
- Not AI logic
- Not business logic
- Not a database

---

## 2. Architecture Position

```
L0  Shared
L1  Core
L2  Providers              ← Data source abstraction (JSON, API, CMS)
L3  Tenant Manager
L4  Capabilities            ← Feature modules — only know context.runtime
L5  Plugins
L6  Business
L7  Workflows
L8  Automation
L9  Engines                 ← Repository Engine (P12.0.3)
L10 Admin
L11 Destination Ecosystem
```

### Data Flow

```
Capability
    ↓
context.runtime.database.find(...)
context.runtime.auth.login(...)
context.runtime.storage.upload(...)
context.runtime.payment.charge(...)
context.runtime.search.search(...)
context.runtime.ai.generate(...)
context.runtime.maps.geocode(...)
context.runtime.weather.forecast(...)
    ↓
Platform Runtime Engine
    ↓
Runtime Contract (abstract interface)
    ↓
Infrastructure Provider (concrete implementation)
    ↓
External Service (PostgreSQL, Stripe, OpenAI, S3, Mapbox, ...)
```

---

## 3. Directory Structure

```
runtime/
├── README.md                       — Runtime overview
├── runtime.engine.js               — Main entry point
├── runtime.context.js              — Context object injected into capabilities
├── runtime.registry.js             — Provider registration and resolution
├── runtime.factory.js              — Provider instantiation and caching
├── runtime.lifecycle.js            — Startup/shutdown ordering with dependency resolution
├── runtime.health.js               — Aggregate health across all modules
├── runtime.events.js               — Event definitions
├── runtime.errors.js               — Error hierarchy
│
└── contracts/
    ├── base.runtime.js             — Abstract base class for all contracts
    ├── database.runtime.js         — Database/repository access
    ├── auth.runtime.js             — Authentication and authorization
    ├── storage.runtime.js          — File storage (local/S3/R2/Azure/Google)
    ├── cache.runtime.js            — Caching (memory/Redis/IndexedDB)
    ├── queue.runtime.js            — Message queue (RabbitMQ/BullMQ/Cloud)
    ├── mail.runtime.js             — Email delivery (SendGrid/SES/SMTP)
    ├── notification.runtime.js     — Multi-channel notifications
    ├── payment.runtime.js          — Payment processing (Stripe/Transbank/MercadoPago)
    ├── media.runtime.js            — Media processing (images/video/audio)
    ├── search.runtime.js           — Search (Meilisearch/Elasticsearch/Algolia)
    ├── ai.runtime.js               — AI/ML (OpenAI/Gemini/Claude/Local)
    ├── sync.runtime.js             — Offline sync and conflict resolution
    ├── analytics.runtime.js        — Analytics (GA4/Matomo/Internal)
    ├── maps.runtime.js             — Maps and geospatial (Mapbox/OSM/Google)
    ├── weather.runtime.js          — Weather (OpenWeather/Meteoblue/NOAA)
    └── filesystem.runtime.js       — Local filesystem operations
```

---

## 4. Runtime Engine

### RuntimeEngine

The main entry point. Manages the full lifecycle.

| Method | Description |
|--------|-------------|
| `register(name, ProviderClass, config)` | Register an infrastructure provider |
| `initialize()` | Initialize the engine and registry |
| `start()` | Start all registered providers in dependency order |
| `shutdown()` | Shutdown all providers in reverse order |
| `restart()` | Full restart cycle |
| `healthCheck()` | Aggregate health across all modules |
| `getModule(name)` | Get a specific runtime module |
| `getContext()` | Get the RuntimeContext for capabilities |
| `listModules()` | List all active modules |
| `isAvailable(name)` | Check if a module is available |
| `supports(name, feature)` | Feature detection |

### RuntimeContext

Every capability receives `context.runtime` with direct access to each service:

```js
context.runtime.database     — Database/repository operations
context.runtime.auth         — Authentication and authorization
context.runtime.storage      — File storage
context.runtime.media        — Media processing
context.runtime.payment      — Payment processing
context.runtime.mail         — Email delivery
context.runtime.notification — Multi-channel notifications
context.runtime.search       — Full-text search
context.runtime.ai           — AI/ML operations
context.runtime.cache        — Caching
context.runtime.queue        — Message queue
context.runtime.maps         — Geospatial and maps
context.runtime.weather      — Weather data
context.runtime.sync         — Offline synchronization
context.runtime.analytics    — Analytics tracking
context.runtime.filesystem   — Filesystem operations
```

---

## 5. Runtime Modules

### Database Runtime

Forwards to Repository Engine. Never exposes SQL.

| Method | Description |
|--------|-------------|
| `repositories` | Access to all registered repositories |
| `transactionManager` | Transaction lifecycle management |

**Features:** transaction, savepoint, migration, rollback, aggregate, search, pagination

### Auth Runtime

| Method | Description |
|--------|-------------|
| `authenticate(token)` | Validate credentials and return session |
| `authorize(user, action, resource)` | Check permission |
| `login(credentials)` | Create session |
| `logout(session)` | Destroy session |
| `refreshToken(token)` | Refresh expired token |
| `validateToken(token)` | Check token validity |
| `getUser(session)` | Resolve user from session |

**Features:** jwt, oauth, magic-link, api-key, session, rbac, mfa, passwordless

### Storage Runtime

| Method | Description |
|--------|-------------|
| `upload(path, data, options)` | Store file |
| `download(path)` | Retrieve file |
| `delete(path)` | Remove file |
| `exists(path)` | Check existence |
| `list(prefix)` | List files in prefix |
| `url(path, options)` | Get public URL |
| `presignedUrl(path, options)` | Get temporary signed URL |
| `copy(source, destination)` | Copy file |
| `move(source, destination)` | Move/rename file |
| `size(path)` | Get file size |

**Features:** presigned-url, public-url, private-url, versioning, encryption, cdn, batch

### Cache Runtime

| Method | Description |
|--------|-------------|
| `get(key)` | Retrieve cached value |
| `set(key, value, ttl)` | Store value with TTL |
| `delete(key)` | Remove key |
| `clear()` | Flush all cache |
| `has(key)` | Check key existence |
| `getMany(keys)` | Batch retrieve |
| `setMany(entries, ttl)` | Batch store |
| `deleteMany(keys)` | Batch delete |
| `increment(key, delta)` | Atomic increment |
| `ttl(key)` | Get remaining TTL |

**Features:** ttl, tag, namespace, transaction, pubsub, persistence, replication

### Queue Runtime

| Method | Description |
|--------|-------------|
| `publish(queue, message, options)` | Enqueue message |
| `subscribe(queue, handler)` | Register consumer |
| `unsubscribe(queue, handler)` | Remove consumer |
| `ack(queue, messageId)` | Acknowledge processed message |
| `nack(queue, messageId)` | Reject message |
| `requeue(queue, messageId, delay)` | Re-enqueue with delay |
| `purge(queue)` | Clear all messages |
| `stats(queue)` | Queue statistics |

**Features:** delay, retry, dead-letter, priority, scheduled, batch, fanout, durable

### Mail Runtime

| Method | Description |
|--------|-------------|
| `send(options)` | Send email |
| `sendTemplate(template, data, recipients)` | Send templated email |
| `sendBatch(messages)` | Batch send |
| `verifyAddress(email)` | Verify email deliverability |
| `getDeliveryStatus(messageId)` | Check delivery status |
| `unsubscribe(email, list)` | Handle unsubscribe |

**Features:** template, batch, attachment, tracking, sandbox, queue, bulk

### Notification Runtime

| Method | Description |
|--------|-------------|
| `send(notification, channels)` | Multi-channel send |
| `sendPush(device, payload)` | Push notification |
| `sendSms(phone, message)` | SMS notification |
| `sendEmail(address, subject, body)` | Email notification |
| `sendInApp(userId, notification)` | In-app notification |
| `registerDevice(userId, device)` | Register push device |
| `unregisterDevice(userId, deviceId)` | Remove device |
| `getNotifications(userId, options)` | List user notifications |
| `markRead(notificationId)` | Mark as read |
| `markAllRead(userId)` | Mark all as read |

**Features:** push, sms, email, in-app, webhook, template, scheduled, bulk

### Payment Runtime

| Method | Description |
|--------|-------------|
| `charge(amount, currency, source, options)` | Process payment |
| `refund(transactionId, amount)` | Issue refund |
| `createCheckout(items, options)` | Create checkout session |
| `createSubscription(plan, customer, options)` | Create recurring subscription |
| `cancelSubscription(subscriptionId)` | Cancel subscription |
| `getTransaction(transactionId)` | Get transaction details |
| `listTransactions(options)` | List transactions |
| `createCustomer(info)` | Create customer profile |
| `getCustomer(customerId)` | Get customer details |
| `handleWebhook(payload, headers)` | Process webhook event |

**Features:** refund, subscription, checkout, webhook, customer, plan, coupon, invoice, payout

### Media Runtime

| Method | Description |
|--------|-------------|
| `upload(file, options)` | Upload media file |
| `delete(mediaId)` | Delete media |
| `get(mediaId)` | Get media metadata |
| `getUrl(mediaId, options)` | Get media URL |
| `process(mediaId, operations)` | Apply processing operations |
| `resize(mediaId, width, height)` | Resize image |
| `thumbnail(mediaId, size)` | Generate thumbnail |
| `blurhash(mediaId)` | Generate blurhash |
| `optimize(mediaId, format)` | Optimize format (AVIF, WebP) |
| `list(options)` | List media |

**Features:** image, video, audio, thumbnail, blurhash, optimization, transcode, stream

### Search Runtime

| Method | Description |
|--------|-------------|
| `index(entity, data)` | Index document |
| `update(entity, id, data)` | Update index entry |
| `delete(entity, id)` | Remove from index |
| `search(query, options)` | Full-text search |
| `suggest(query, options)` | Search suggestions |
| `facet(field, query, options)` | Faceted aggregation |
| `reindex(entity)` | Rebuild index |
| `clearIndex(entity)` | Clear index |
| `stats()` | Index statistics |

**Features:** fulltext, facet, filter, sort, fuzzy, synonym, highlight, suggest, geosearch

### AI Runtime

| Method | Description |
|--------|-------------|
| `generate(prompt, options)` | Text generation |
| `chat(messages, options)` | Multi-turn chat |
| `embed(text)` | Generate embeddings |
| `classify(text, categories)` | Text classification |
| `summarize(text, options)` | Text summarization |
| `translate(text, targetLanguage)` | Translation |
| `analyze(text, options)` | Text analysis |
| `moderate(text)` | Content moderation |
| `complete(prompt, options)` | Completion |

**Features:** chat, completion, embedding, vision, audio, moderation, streaming, function-calling

### Sync Runtime

| Method | Description |
|--------|-------------|
| `push(changes)` | Push local changes |
| `pull(since)` | Pull remote changes |
| `resolveConflict(conflict, resolution)` | Resolve conflict |
| `getConflicts(entity, id)` | Get conflicts for entity |
| `registerEntity(entity, config)` | Register sync entity |
| `getCheckpoint()` | Get sync checkpoint |
| `fullSync()` | Full sync cycle |

**Features:** push, pull, conflict-resolution, background-sync, offline-queue, delta, checkpoint

### Analytics Runtime

| Method | Description |
|--------|-------------|
| `track(event, properties)` | Track event |
| `identify(userId, traits)` | Identify user |
| `page(name, properties)` | Track page view |
| `screen(name, properties)` | Track screen view |
| `group(groupId, traits)` | Group users |
| `alias(previousId, newId)` | Alias identities |
| `query(analyticsQuery)` | Query analytics data |
| `report(name, options)` | Generate report |
| `dashboard(name)` | Get dashboard data |

**Features:** event, pageview, user, session, funnel, retention, cohort, realtime

### Maps Runtime

| Method | Description |
|--------|-------------|
| `geocode(address)` | Address to coordinates |
| `reverseGeocode(lat, lng)` | Coordinates to address |
| `autocomplete(query)` | Place autocomplete |
| `directions(origin, destination, options)` | Route calculation |
| `distanceMatrix(origins, destinations)` | Distance matrix |
| `isochrone(center, time, options)` | Travel time polygons |
| `places(query, options)` | Place search |
| `staticMap(center, zoom, size)` | Static map image |
| `tileUrl(x, y, z)` | Tile URL |

**Features:** geocode, reverse-geocode, directions, isochrone, places, static-map, tiles, elevation

### Weather Runtime

| Method | Description |
|--------|-------------|
| `current(lat, lng)` | Current weather |
| `forecast(lat, lng, days)` | Weather forecast |
| `historical(lat, lng, date)` | Historical weather |
| `alerts(lat, lng)` | Weather alerts |
| `airQuality(lat, lng)` | Air quality index |
| `uvIndex(lat, lng)` | UV index |
| `marine(lat, lng)` | Marine conditions |
| `astronomy(lat, lng, date)` | Sunrise/sunset/moon |

**Features:** current, forecast, historical, alerts, air-quality, uv-index, marine, astronomy

### Filesystem Runtime

| Method | Description |
|--------|-------------|
| `read(path)` | Read file |
| `write(path, data)` | Write file |
| `append(path, data)` | Append to file |
| `delete(path)` | Delete file |
| `exists(path)` | Check existence |
| `list(dir)` | List directory |
| `mkdir(dir)` | Create directory |
| `rmdir(dir)` | Remove directory |
| `copy(source, destination)` | Copy file/dir |
| `move(source, destination)` | Move file/dir |
| `stat(path)` | File metadata |
| `readStream(path)` | Readable stream |
| `writeStream(path)` | Writable stream |

**Features:** read, write, stream, watch, glob, temp, chmod, chown, symlink

---

## 6. Lifecycle

### Startup Order

Providers start in dependency order (topological sort):

1. **database** — no dependencies
2. **cache** — no dependencies
3. **filesystem** — no dependencies
4. **storage** — depends on filesystem
5. **auth** — depends on database
6. **queue** — depends on database
7. **mail** — depends on queue
8. **notification** — depends on queue, mail
9. **media** — depends on storage
10. **search** — depends on database
11. **ai** — no dependencies
12. **sync** — depends on database, cache
13. **analytics** — depends on database, queue
14. **maps** — no dependencies
15. **weather** — no dependencies
16. **payment** — depends on database, notification

### Shutdown Order

Reverse of startup order.

### State Machine

```
registered → initializing → initialized → starting → started
    → stopping → stopped → disposed
    → failed (any step)
```

---

## 7. Feature Detection

Every runtime module implements `supports(feature)`:

```js
const canRefund = context.runtime.payment.supports('refund')
const hasVision = context.runtime.ai.supports('vision')
const supportsSignedUrls = context.runtime.storage.supports('presigned-url')
```

Capabilities use this to adapt behavior:

```js
if (context.runtime.ai.supports('vision')) {
  const description = await context.runtime.ai.generate(['Describe this image', image])
}
```

---

## 8. Provider Selection

### Strategy

| Strategy | Behavior |
|----------|----------|
| `primary` | Use configured primary provider |
| `fallback` | Use secondary if primary fails |
| `auto` | Smart selection based on health/availability |
| `disabled` | Module unavailable, return defaults |

### Primary/Fallback Pattern

```
Primary: Stripe
Fallback: MercadoPago
Disabled: manual

Primary: OpenAI
Fallback: Claude
Disabled: local
```

---

## 9. Health

### Per-Module Health

Every module exposes `health()` returning:

```js
{
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline' | 'maintenance' | 'unknown',
  initialized: true,
  available: true,
  provider: 'stripe',
  timestamp: 1700000000000
}
```

### Aggregate Health

The RuntimeHealth module aggregates across all modules:

| Status | Condition |
|--------|-----------|
| `healthy` | All modules healthy |
| `degraded` | Some modules unhealthy/offline |
| `unhealthy` | Core modules unhealthy |
| `unknown` | Not yet checked |

### Events

Health changes emit `runtime:health_changed` with module name, previous status, and new status.

---

## 10. Events

| Event | Description |
|-------|-------------|
| `runtime:registered` | Provider registered in registry |
| `runtime:initialized` | Runtime engine initialized |
| `runtime:provider_changed` | Active provider changed |
| `runtime:provider_failed` | Provider initialization/operation failed |
| `runtime:health_changed` | Module health status changed |
| `runtime:shutdown` | Runtime shutting down |
| `runtime:error` | Runtime error occurred |

```js
{
  event: 'runtime:provider_failed',
  timestamp: 1700000000000,
  source: 'platform-runtime',
  payload: { module: 'payment', error: 'Connection refused' }
}
```

---

## 11. Errors

| Error | Description |
|-------|-------------|
| `RuntimeError` | Base error for all runtime errors |
| `RuntimeUnavailableError` | Service unavailable |
| `RuntimeProviderError` | Provider failure |
| `RuntimeConfigurationError` | Configuration error |
| `RuntimeFeatureUnavailableError` | Feature not supported |
| `RuntimeInitializationError` | Initialization failure |

---

## 12. Architecture Rules (RT-001 through RT-012)

| Rule | Description |
|------|-------------|
| RT-001 | Capabilities must never import infrastructure providers, SDKs, or vendor libraries |
| RT-002 | Capabilities must access infrastructure exclusively through `context.runtime` |
| RT-003 | Runtime modules must be vendor-agnostic — no vendor imports in contract files |
| RT-004 | Runtime must never contain business logic — only orchestration |
| RT-005 | All SQL, ORM, and database access must be behind the database runtime contract |
| RT-006 | All provider implementations must implement the corresponding runtime contract |
| RT-007 | Runtime contracts must support multi-tenant context propagation |
| RT-008 | Runtime contracts must be offline-first — return safe defaults when unavailable |
| RT-009 | Feature detection via `supports(feature)` must be provided by every runtime module |
| RT-010 | Provider selection must support primary/fallback/disabled strategies |
| RT-011 | Runtime health must be aggregated across all modules |
| RT-012 | Runtime events must use the `runtime:` prefix and standard event format |

---

## 13. Future Providers

| Module | Future Providers |
|--------|-----------------|
| Database | Drizzle, Prisma, Knex, Mongoose, Supabase, SQLite |
| Auth | JWT, OAuth, Passport, Firebase Auth, Auth0, Supabase Auth |
| Storage | Local FS, S3, R2, Azure Blob, Google Cloud Storage, MinIO |
| Cache | Memory, Redis, Memcached, IndexedDB, Cloudflare KV |
| Queue | BullMQ, RabbitMQ, SQS, Redis Queue, Google Pub/Sub |
| Mail | SendGrid, SES, Mailgun, Postmark, SMTP, Mailtrap |
| Payment | Stripe, MercadoPago, Transbank, PayPal, Manual |
| Media | Sharp, FFmpeg, Cloudinary, Imgix, ImageKit |
| Search | Meilisearch, Elasticsearch, Algolia, Typesense, PostgreSQL FTS |
| AI | OpenAI, Gemini, Claude, Ollama, Local LLM, HuggingFace |
| Maps | Mapbox, OpenStreetMap, Google Maps, MapLibre, Leaflet |
| Weather | OpenWeather, Meteoblue, NOAA, WeatherAPI, Windy |
| Analytics | GA4, Matomo, Plausible, PostHog, Umami, Internal |
| Notification | Firebase, OneSignal, Twilio, SendGrid, WebPush, Pusher |

---

## 14. Validation Checklist

- [ ] Capabilities never import providers
- [ ] Capabilities never import SDKs
- [ ] Capabilities never import vendor libraries
- [ ] Capabilities only use `context.runtime.*`
- [ ] Runtime contracts are abstract (no vendor code)
- [ ] Runtime engine manages lifecycle
- [ ] Runtime registry supports registration and resolution
- [ ] Runtime factory supports caching and tenant isolation
- [ ] Every module implements `supports(feature)`
- [ ] Provider selection supports primary/fallback/disabled
- [ ] Health is aggregated across all modules
- [ ] Health changes emit events
- [ ] Startup follows dependency order
- [ ] Shutdown follows reverse order
- [ ] Errors extend RuntimeError hierarchy
- [ ] Events use `runtime:` prefix
- [ ] Database runtime forwards to Repository Engine
- [ ] No business logic in runtime
- [ ] Multi-tenant context propagation
- [ ] Offline-first defaults
