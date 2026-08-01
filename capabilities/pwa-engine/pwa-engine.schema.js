/**
 * PWA Engine Schema — Business-agnostic PWA data definitions
 *
 * Defines schemas for manifest, service worker, installation, offline
 */
import { createSchema } from '../core/schema.js'

export const PWA_INSTALL_STATE = {
  UNKNOWN: 'unknown',
  AVAILABLE: 'available',
  INSTALLED: 'installed',
  DISMISSED: 'dismissed',
  UNSUPPORTED: 'unsupported',
}

export const CACHE_STRATEGY = {
  CACHE_FIRST: 'cache_first',
  NETWORK_FIRST: 'network_first',
  STALE_WHILE_REVALIDATE: 'stale_while_revalidate',
  NETWORK_ONLY: 'network_only',
  CACHE_ONLY: 'cache_only',
}

export const PWA_MANIFEST_SCHEMA = createSchema({
  id: 'pwa_manifest',
  name: 'PWA Manifest',
  description: 'PWA manifest configuration for a tenant',
  fields: {
    name: { type: 'string', required: true },
    short_name: { type: 'string', required: true },
    description: { type: 'string', required: false },
    start_url: { type: 'string', required: true },
    display: { type: 'string', required: true, values: ['standalone', 'fullscreen', 'minimal-ui'] },
    theme_color: { type: 'string', required: true },
    background_color: { type: 'string', required: true },
    icons: { type: 'array', required: true },
    scope: { type: 'string', required: false },
    lang: { type: 'string', required: false },
    categories: { type: 'array', required: false },
  },
})

export const PWA_CACHE_CONFIG_SCHEMA = createSchema({
  id: 'pwa_cache_config',
  name: 'PWA Cache Configuration',
  description: 'Cache configuration for a tenant',
  fields: {
    tenantId: { type: 'string', required: true },
    cacheName: { type: 'string', required: true },
    staticAssets: { type: 'array', required: false },
    publicPages: { type: 'array', required: false },
    images: { type: 'array', required: false },
    offlineFallback: { type: 'string', required: false },
    maxAge: { type: 'number', required: false },
    maxEntries: { type: 'number', required: false },
  },
})

export const PWA_INSTALLATION_SCHEMA = createSchema({
  id: 'pwa_installation',
  name: 'PWA Installation',
  description: 'Tracks PWA installation state for a tenant',
  fields: {
    tenantId: { type: 'string', required: true },
    state: { type: 'string', required: true, values: Object.values(PWA_INSTALL_STATE) },
    installedAt: { type: 'string', required: false },
    dismissedAt: { type: 'string', required: false },
    platform: { type: 'string', required: false },
  },
})

export function validateManifest(data) {
  return PWA_MANIFEST_SCHEMA.validate(data)
}

export function validateCacheConfig(data) {
  return PWA_CACHE_CONFIG_SCHEMA.validate(data)
}

export function validateInstallation(data) {
  return PWA_INSTALLATION_SCHEMA.validate(data)
}
