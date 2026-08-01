# Infrastructure Wiring Architecture

> P12.3.0 — Conecta toda la infraestructura existente para que Valdi Engine pueda iniciar correctamente como un sistema ejecutable.

## Objective

Transition from architecture design to a working executable system. This phase does NOT create new layers, redefine contracts, or modify the architecture. Its sole responsibility is wiring existing infrastructure so the full startup flow works end-to-end.

## Layer Position

```
Application
     │
     ▼
Bootstrap Pipeline     ← P12.3.0
     │
     ▼
RuntimeEngine
     │
     ▼
RuntimeRegistry → RuntimeFactory → RuntimeLifecycle
     │
     ▼
Infrastructure Providers
  ├── PostgresProvider (database)
  ├── DrizzleProvider (ORM)
  ├── JwtProvider (authentication)
  ├── RepositoryEngine (persistence)
  ├── CmsRuntimeIntegration (CMS)
  └── Future Provider Slots (10)
     │
     ▼
Capabilities (via context)
```

## Startup Lifecycle

```
loadConfiguration()
     │
     ▼
buildRuntime()
     │
     ▼
registerProviders()
     │
     ▼
initializeRepositories()
     │
     ▼
initializeCapabilities()
     │
     ▼
initializeCMS()
     │
     ▼
initializeAuthentication()
     │
     ▼
initializeRuntime()
     │
     ▼
healthCheck()
     │
     ▼
Application Ready
```

### Explicit Startup Order

```
1. Configuration (env, .env, feature flags, secrets)
2. PostgresProvider (connection pool)
3. DrizzleProvider (ORM client)
4. Database contract
5. RepositoryEngine (entity repositories)
6. JwtProvider (token management)
7. AuthRuntimeIntegration (authentication)
8. AuthorizationRuntimeIntegration (authorization)
9. CmsRuntimeIntegration (content management)
10. Future provider slots (storage, mail, queue, cache, payment, search, media, maps, analytics, ai)
11. Capabilities (via context)
12. Application ready signal
```

All ordering uses RuntimeLifecycle dependency resolution — NOT import order.

## Dependency Graph

```
postgres (900)
   └── drizzle (850)
         └── database (800)
               └── repository (700)
                     └── jwt (600)
                           └── auth (400)
                                 └── authorization (350)
                                       └── cms (300)
                                             └── future providers (250-100)
```

Priority values in parentheses. Higher = starts first.

## Bootstrap Pipeline

### BootstrapConfig (`runtime/bootstrap/bootstrap.config.js`)

Loads configuration from multiple sources with precedence:

| Priority | Source | Example |
|----------|--------|---------|
| 1 (lowest) | Hardcoded defaults | POSTGRES_HOST=localhost |
| 2 | .env file | POSTGRES_HOST=prod-db.example.com |
| 3 | Environment variables | export POSTGRES_HOST=... |
| 4 | Tenant configuration | per-tenant overrides |
| 5 | Destination configuration | per-destination overrides |
| 6 | Provider overrides | runtime parameter overrides |
| 7 (highest) | Secrets provider | Vault, AWS Secrets Manager |

Supports:
- `.env` file loading with `fs/promises`
- Environment variable coercion (string → number/boolean)
- Feature flags (all 14 features)
- Database connection config
- JWT/auth config
- Runtime behavior config
- Secret masking in `toJSON()`

### BootstrapPipeline (`runtime/bootstrap/bootstrap.pipeline.js`)

Orchestrates the full startup sequence:

1. **loadConfiguration()** — Creates BootstrapConfig and loads all sources
2. **buildRuntime()** — Creates RuntimeEngine with config
3. **registerProviders()** — Registers Postgres, Drizzle, Repository, JWT, Auth, Authz, CMS + 10 future slots
4. **initializeRepositories()** — Repository registration slot (future: entity auto-discovery)
5. **initializeCapabilities()** — Capability initialization slot (future: capability loader)
6. **initializeCMS()** — CMS wiring with WordPress provider
7. **initializeAuthentication()** — Auth wiring with JWT provider
8. **initializeRuntime()** — Calls engine.initialize() → engine.start(), wires providers together
9. **healthCheck()** — Health check across all components
10. **Application Ready** — Returns full bootstrap result

Each step emits bootstrap events. Failure in any step stops the pipeline.

## Runtime Initialization

### RuntimeEngine Enhancements

The `RuntimeEngine.start()` method now:

1. **Validates** all registrations (duplicates, missing deps, circular deps)
2. **Creates** each registered provider via RuntimeFactory
3. **Initializes** providers in dependency order via RuntimeLifecycle
4. **Wires** auth → authorization context
5. **Wires** JWT provider into auth integration
6. **Wires** CMS contracts
7. **Marks** engine as started

### Validation Checks

- **Duplicate providers**: Throws error if same name registered twice
- **Unregistered dependencies**: Throws error if dependency not found
- **Circular dependencies**: DFS cycle detection throws error
- **Future providers**: Skipped during start (no class to instantiate)

## Shutdown Lifecycle

### Explicit Shutdown Order

```
1. CMS (shutdown content engines)
2. Authorization (shutdown policy engine)
3. Authentication (shutdown auth providers)
4. Repository (shutdown repository engine)
5. Database contract
6. DrizzleProvider (destroy ORM client)
7. PostgresProvider (close connection pool)
8. Future providers (if initialized)
```

This reverses the startup order. Active transactions are rolled back via the TransactionManager, connection pools are drained, and all resources are released.

## Health Model

### Health Check Response

```json
{
  "database": "healthy",
  "repository": "healthy",
  "runtime": "healthy",
  "authentication": "healthy",
  "authorization": "healthy",
  "cms": "healthy",
  "providers": "healthy",
  "application": "ready"
}
```

Health is checked per-component:
- **database**: PostgresProvider.healthCheck()
- **repository**: DrizzleProvider.healthCheck()
- **runtime**: engine started status
- **authentication**: AuthRuntimeIntegration.health()
- **authorization**: AuthorizationRuntimeIntegration.health()
- **cms**: CmsRuntimeIntegration.health()
- **providers**: module count > 0
- **application**: aggregate — 'ready' if database healthy, 'degraded' otherwise

## Configuration Model

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Runtime environment |
| DEBUG | false | Debug mode |
| POSTGRES_HOST | localhost | Database host |
| POSTGRES_PORT | 5432 | Database port |
| POSTGRES_DATABASE | valdi | Database name |
| POSTGRES_USER | postgres | Database user |
| POSTGRES_PASSWORD | '' | Database password |
| POSTGRES_SSL | false | SSL mode |
| POSTGRES_POOL_MIN | 2 | Minimum pool size |
| POSTGRES_POOL_MAX | 10 | Maximum pool size |
| DATABASE_URL | null | Connection string override |
| JWT_ISSUER | valdi-engine | Token issuer |
| JWT_AUDIENCE | valdi-platform | Token audience |
| JWT_ACCESS_TTL | 900 | Access token TTL (seconds) |
| JWT_REFRESH_TTL | 604800 | Refresh token TTL (seconds) |
| JWT_SECRET | null | HMAC secret |
| JWT_ALGORITHM | HS256 | Signing algorithm |

### Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| FEATURE_DATABASE | true | Enable PostgreSQL |
| FEATURE_AUTH | true | Enable authentication |
| FEATURE_CMS | true | Enable CMS |
| FEATURE_REPOSITORIES | true | Enable Repository Engine |
| FEATURE_STORAGE | false | Future: Storage provider |
| FEATURE_MAIL | false | Future: Mail provider |
| FEATURE_QUEUE | false | Future: Queue provider |
| FEATURE_CACHE | false | Future: Cache provider |
| FEATURE_PAYMENT | false | Future: Payment provider |
| FEATURE_SEARCH | false | Future: Search provider |
| FEATURE_MEDIA | false | Future: Media provider |
| FEATURE_MAPS | false | Future: Maps provider |
| FEATURE_ANALYTICS | false | Future: Analytics provider |
| FEATURE_AI | false | Future: AI provider |

## Future Provider Slots

10 provider slots are pre-registered at predefined priority levels, ready for when the corresponding provider is implemented:

| Provider | Priority | Category |
|----------|----------|----------|
| storage | 750 | storage |
| cache | 650 | infrastructure |
| queue | 550 | infrastructure |
| media | 500 | media |
| mail | 450 | communication |
| payment | 400 | payment |
| search | 350 | search |
| maps | 250 | maps |
| analytics | 200 | analytics |
| ai | 150 | ai |

Each slot is registered with version '0.0.0' and `future: true`, which tells the engine to skip instantiation during start().

## Bootstrap Events

| Event | When |
|-------|------|
| runtime:boot_started | Pipeline starts |
| runtime:configuration_loaded | Configuration loaded |
| runtime:runtime_built | RuntimeEngine created |
| runtime:providers_registered | All providers registered |
| runtime:repositories_initialized | Repositories initialized |
| runtime:capabilities_initialized | Capabilities initialized |
| runtime:cms_initialized | CMS initialized |
| runtime:authentication_initialized | Auth initialized |
| runtime:runtime_initialized | Runtime initialized |
| runtime:health_check_completed | Health check done |
| runtime:application_ready | Full system ready |
| runtime:boot_step_started | Individual step starts |
| runtime:boot_step_completed | Individual step completes |
| runtime:boot_step_failed | Individual step fails |
| runtime:boot_failed | Pipeline fails |
| runtime:shutdown_started | Shutdown begins |
| runtime:shutdown_completed | Shutdown complete |

## Bootstrap Errors

| Error | When |
|-------|------|
| BootstrapError | Base bootstrap error |
| BootstrapConfigurationError | Invalid configuration |
| ProviderRegistrationError | Provider registration fails |
| BootstrapInitializationError | Provider initialization fails |
| StartupOrderError | Startup order violation |
| DependencyResolutionError | Unresolvable dependency |
| CircularDependencyError | Circular dependency detected |
| DuplicateProviderError | Provider registered twice |
| UnregisteredProviderError | Dependency not registered |
| PendingMigrationsError | Unrun migrations detected |

All extend RuntimeError.

## Bootstrap API

```js
import { createEventBus } from '../../shared/events/eventbus.js'
import { BootstrapPipeline } from '../../runtime/bootstrap/bootstrap.pipeline.js'

const eventBus = createEventBus()

const pipeline = new BootstrapPipeline(eventBus)

const result = await pipeline.run({
  envFile: '.env',
  overrides: {
    POSTGRES_HOST: 'localhost',
    POSTGRES_DATABASE: 'valdi_dev',
  },
})

const { engine, config, health } = result

console.log(engine.database)   // => DatabaseRuntime
console.log(engine.auth)        // => AuthRuntimeIntegration
console.log(engine.runtime)     // => RuntimeContext
console.log(health)             // => { database: 'healthy', ... }
console.log(await engine.healthCheck())
```

## Context Injection

All capabilities receive context automatically through RuntimeContext:

```js
// Inside any capability:
this.context.runtime.database  // Database runtime contract
this.context.runtime.auth       // AuthRuntimeContext
this.context.runtime.storage    // Future: Storage provider
this.context.runtime.cms        // CmsRuntimeContext
this.context.runtime.cache      // Future: Cache provider
this.context.runtime.mail       // Future: Mail provider
```

Capabilities never import providers, SDKs, or vendors directly.

## Architecture Rules

| Rule | Description |
|------|-------------|
| WR-001 | Bootstrap pipeline is the only entry point for system startup |
| WR-002 | All providers must be registered before engine.start() |
| WR-003 | Startup order is determined by priority values, not import order |
| WR-004 | Shutdown order reverses startup order |
| WR-005 | Future providers are registered as slots (no class) |
| WR-006 | Configuration must be validated before engine starts |
| WR-007 | Circular dependencies must be detected at registration |
| WR-008 | Bootstrap errors must extend BootstrapError |
| WR-009 | Each bootstrap step emits a corresponding event |
| WR-010 | Engine must emit health status for all registered components |
| WR-011 | Active transactions roll back on shutdown |
| WR-012 | Capabilities only access infrastructure through RuntimeContext |

## Validation Checklist

- [ ] BootstrapConfig loads from .env file
- [ ] BootstrapConfig merges all sources with correct precedence
- [ ] BootstrapConfig validates required fields
- [ ] BootstrapPipeline executes all steps in order
- [ ] Each step emits start/completed events
- [ ] Failed step stops the pipeline
- [ ] PostgresProvider registered as 'postgres'
- [ ] DrizzleProvider registered as 'drizzle' with postgres dependency
- [ ] RepositoryEngine registered as 'repository'
- [ ] JwtProvider registered as 'jwt'
- [ ] AuthRuntimeIntegration registered as 'auth'
- [ ] AuthorizationRuntimeIntegration registered as 'authorization'
- [ ] CmsRuntimeIntegration registered as 'cms'
- [ ] JWT provider wired into auth integration
- [ ] Auth wired into authorization context
- [ ] 10 future provider slots registered
- [ ] Duplicate provider detection works
- [ ] Missing dependency detection works
- [ ] Circular dependency detection works
- [ ] Shutdown reverses startup order
- [ ] Health check returns structured response
- [ ] Engine.start() returns after full initialization
- [ ] Direct usage: `await RuntimeEngine.start()` works
- [ ] Bootstrap pipeline usage: `new BootstrapPipeline(eventBus).run()` works
