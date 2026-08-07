# Storage Provider Factory

## Purpose

`StorageProviderFactory` is a factory pattern implementation that creates storage providers based on configuration. It ensures that `StorageService` never directly imports provider implementations.

## Location

```
storage/providers/storage.provider.factory.js
```

## Interface

```javascript
class StorageProviderFactory {
  async create(type, config)
  async createAll(providerConfigs)
  clearCache()
  static getProviderTypes()
}
```

## Usage

### Creating a Single Provider

```javascript
import StorageProviderFactory from './storage/providers/storage.provider.factory.js'

const provider = await StorageProviderFactory.create('local', {
  rootPath: '/data/storage',
  baseUrl: 'http://localhost:3000/storage'
})

await provider.initialize()
```

### Creating Multiple Providers

```javascript
const providerConfigs = {
  default: { type: 'local', rootPath: '/data/storage' },
  s3: { type: 's3', bucket: 'my-bucket', region: 'us-east-1' }
}

const providers = await StorageProviderFactory.createAll(providerConfigs)
```

### Cache Management

Providers are cached by type and config to avoid recreating connections:

```javascript
StorageProviderFactory.clearCache()
```

## Configuration-Driven Selection

The factory enables pure configuration-driven provider selection:

```yaml
storage:
  default: local
  providers:
    local:
      type: local
      rootPath: /data/storage
    s3:
      type: s3
      enabled: true
      bucket: production-bucket
      region: us-east-1
```

## Design Principles

### No Direct Provider Imports

StorageService MUST use the factory:

```javascript
// CORRECT
import StorageProviderFactory from './providers/storage.provider.factory.js'
const provider = await StorageProviderFactory.create(type, config)

// WRONG
import { LocalStorageProvider } from './providers/local.provider.js'
const provider = new LocalStorageProvider(config)
```

### Provider Type Validation

The factory validates provider types:

```javascript
await factory.create('unknown', config)
// Throws: StorageProviderError: Unknown storage provider type: unknown
```

### Lazy Loading

Providers are loaded on-demand via dynamic imports:

```javascript
const { S3StorageProvider } = await import('./s3.provider.js')
```

## Guardian Validation

`StorageGuardian` verifies:

1. Factory exists at correct path
2. StorageService uses factory pattern
3. No direct provider imports in StorageService
4. Provider-specific SDKs only in correct providers

## Benefits

1. **Decoupling**: StorageService doesn't know concrete provider classes
2. **Testability**: Factory can return mock providers in tests
3. **Extensibility**: New providers can be added without modifying StorageService
4. **Security**: Guardian can verify no direct provider access
5. **Configuration**: Entire provider setup is configuration-driven
