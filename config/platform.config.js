/**
 * Platform Configuration — Valdi Engine
 *
 * Platform-wide settings that apply to all products/deployments.
 * These values are shared across all tenants and products.
 *
 * @IMPORTANT: This file MUST NOT contain product-specific values.
 * Product config belongs in product.config.js.
 */

export const PLATFORM_CONFIG = {
  id: 'valdi-engine',
  name: 'Valdi Engine',
  version: '4.0.0',

  theme: {
    storageKey: 'valdi-theme',
    defaultMode: 'dark',
  },

  storage: {
    prefix: 'valdi_',
  },

  api: {
    timeout: 30000,
    retryAttempts: 3,
  },

  i18n: {
    defaultLocale: 'es-MX',
    fallbackLocale: 'en-US',
  },
}

export default PLATFORM_CONFIG
