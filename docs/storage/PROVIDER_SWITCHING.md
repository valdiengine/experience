# Provider Switching

## Overview

Storage supports runtime provider switching without code changes. BusinessService remains provider-agnostic.

## Architecture

```
BusinessService
       ↓ (uses Storage Capability)
StorageCapability
       ↓ (never specifies provider)
StorageManager
       ↓ (configuration-driven)
StorageService
       ↓ (factory-created)
ProviderFactory
       ↓ (lazy-loads by config)
┌─────────────────────────────────────┐
│  LOCAL ←→ S3 ←→ R2                │
└─────────────────────────────────────┘
```

## Configuration-Driven Selection

### Enabling Providers

```javascript
const storageService = new StorageService({
  local: { enabled: true, rootPath: '/data/storage' },
  s3: { enabled: true, region: 'us-east-1', bucket: 'prod' },
  r2: { enabled: false }
})
```

### Default Provider

First enabled provider becomes default:

1. If `local.enabled !== false`, local is default
2. Otherwise, first `enabled: true` provider

### Runtime Switching

```javascript
const integration = new StorageIntegration({
  storage: {
    local: { enabled: true },
    s3: { enabled: true },
    r2: { enabled: true }
  }
})

await integration.initialize()
console.log(integration.getActiveProvider()) // 'local'

// Switch to S3
await integration.switchProvider('s3')
console.log(integration.getActiveProvider()) // 's3'

// All operations now use S3
await integration.getStorageService().uploadAsset({ ... })
```

## Switching Rules

### BusinessService Isolation

BusinessService must NEVER:
- Import specific provider classes
- Reference provider type in logic
- Configure providers directly

BusinessService should:
- Use Storage Capability interface only
- Pass options without provider specification
- Let configuration control provider

### Provider Availability

Switching throws if provider not enabled:

```javascript
const integration = new StorageIntegration({
  storage: { local: { enabled: true } }
})

await integration.initialize()
await integration.switchProvider('s3') // Throws: Provider not available
```

### Supported Switches

| From | To | Supported |
|------|-----|-----------|
| LOCAL | S3 | ✅ |
| LOCAL | R2 | ✅ |
| S3 | LOCAL | ✅ |
| S3 | R2 | ✅ |
| R2 | LOCAL | ✅ |
| R2 | S3 | ✅ |

## Implementation Details

### StorageIntegration.switchProvider()

```javascript
async switchProvider(type) {
  const availableTypes = Array.from(this.storageService.providers.keys())

  if (!availableTypes.includes(type)) {
    throw new StorageValidationError(
      `Provider type not available: ${type}. Available: ${availableTypes.join(', ')}`
    )
  }

  const previousProvider = this.activeProvider
  this.storageService.setDefaultProvider(type)
  this.activeProvider = type

  return {
    previousProvider,
    currentProvider: type,
    availableProviders: availableTypes,
  }
}
```

### Event on Switch

```javascript
// When provider switches, event is emitted
{
  event: 'storage.provider.switched',
  timestamp: '2024-01-15T10:30:00Z',
  data: {
    from: 'local',
    to: 's3',
    user: 'system'
  }
}
```

## Use Cases

### Development → Production

```javascript
// Development: Local storage
const config = {
  storage: {
    local: { enabled: true },
    s3: { enabled: false }
  }
}

// Production: S3
const config = {
  storage: {
    local: { enabled: false },
    s3: { enabled: true, bucket: 'prod-bucket' }
  }
}
```

### Multi-Environment

```javascript
// Per-environment configuration
const configs = {
  dev: { provider: 'local', local: { rootPath: './data' } },
  staging: { provider: 's3', s3: { bucket: 'staging' } },
  prod: { provider: 'r2', r2: { bucket: 'production' } }
}

const activeConfig = configs[process.env.NODE_ENV]
const integration = new StorageIntegration({ storage: activeConfig })
```

### Failover

```javascript
// Primary fails, switch to backup
const integration = new StorageIntegration({
  storage: {
    s3: { enabled: true, primary: true },
    r2: { enabled: true, backup: true }
  }
})

try {
  await integration.getStorageService().uploadAsset(data)
} catch (error) {
  await integration.switchProvider('r2')
  await integration.getStorageService().uploadAsset(data)
}
```

## Validation Checklist

- [x] BusinessService never imports providers directly
- [x] Configuration controls provider selection
- [x] Runtime switching works
- [x] Events emitted on switch
- [x] Error on unavailable provider
- [x] All operations work after switch
- [x] No data loss during switch
