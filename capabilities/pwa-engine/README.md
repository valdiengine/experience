# PWA Engine Capability

**Version:** 1.0.0
**Status:** Stable
**Dependencies:** notifications, communication, public, observability

## Purpose

Complete Progressive Web App engine for multi-tenant SaaS. Every tenant becomes an installable mobile application without creating separate apps.

## Architecture

```
pwa-engine.capability.js → PWAEngineManager
                            ├── ManifestGenerator
                            ├── ServiceWorkerManager → CacheStrategy
                            ├── InstallManager
                            └── OfflineManager
                                    |
                                    ↓
                            Notifications Capability
```

## Modules

### ManifestGenerator
- Dynamic manifest from tenant config (branding, theme, routes)
- Multi-domain support: tenant.app, custom-domain, valdi.app/tenant-slug
- Validation against PWA_MANIFEST_SCHEMA
- Apple Touch Icon and theme-color meta injection

### ServiceWorkerManager
- Tenant-scoped registration
- Tenant-isolated cache (tenant-cache-{slug}-v1)
- Update detection and skip-waiting
- Never caches private reservation data

### CacheStrategy
- 5 strategies: cache_first, network_first, stale_while_revalidate, network_only, cache_only
- Pre-caching static assets
- Cache size limits and TTL
- Public request detection (no private data)

### InstallManager
- beforeinstallprompt detection
- Installation state tracking (unknown, available, installed, dismissed)
- Platform detection (android, ios, desktop)
- localStorage persistence

### OfflineManager
- Online/offline detection
- Offline fallback page (tenant-branded)
- Public page registration for offline access
- Custom offline pages from tenant config

## Events

| Event | Description |
|-------|-------------|
| `pwa-engine:manifest_injected` | Manifest injected into document |
| `pwa-engine:sw_registered` | Service worker registered |
| `pwa-engine:sw_activated` | New service worker activated |
| `pwa-engine:install_available` | Install prompt available |
| `pwa-engine:installed` | App installed |
| `pwa-engine:install_dismissed` | Install prompt dismissed |
| `pwa-engine:offline_detected` | Network offline |
| `pwa-engine:offline_restored` | Network restored |
| `pwa-engine:push_permission_granted` | Push permission granted |
| `pwa-engine:push_permission_denied` | Push permission denied |

## Usage

```javascript
// Initialize PWA for tenant
await pwaEngine.init(tenant)

// Prompt installation
const installed = await pwaEngine.promptInstall('tenant_123')

// Check install state
const state = pwaEngine.getInstallState('tenant_123')

// Check offline status
const online = pwaEngine.isOnline()
const available = pwaEngine.isAvailableOffline('/services')

// Register page for offline
pwaEngine.registerOfflinePage('/custom', '<html>...</html>')

// Clear cache
await pwaEngine.clearCache('tenant_123')

// Get manifest
const manifest = pwaEngine.getManifestGenerator().generate(tenant)

// Subscribe to events
eventBus.on('pwa-engine:installed', (data) => {
  console.log('App installed:', data.tenantId)
})
```
