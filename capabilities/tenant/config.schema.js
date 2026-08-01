/**
 * TenantConfigSchema — Schema definition for tenant configuration
 *
 * Defines the structure and defaults for tenant configs.
 * Does NOT know about specific tenants or business logic.
 */

/**
 * Default tenant configuration
 */
export const DEFAULT_TENANT_CONFIG = {
  id: 'default',
  name: 'Default Tenant',
  slug: 'default',
  domain: null,

  branding: {
    logo: null,
    favicon: null,
    colors: {
      primary: '#c8a55c',
      secondary: '#1a1a2e',
      accent: '#e8d5a3',
      background: '#03050a',
      surface: '#0a0a1a',
      text: '#f5f5f5',
      textSecondary: '#8a8a9a',
    },
    fonts: {
      display: 'Cabinet Grotesk',
      body: 'Inter',
      mono: 'JetBrains Mono',
    },
  },

  theme: {
    mode: 'dark',
    borderRadius: '8px',
    animations: true,
  },

  provider: {
    type: 'json',
    config: {},
  },

  locale: 'es-MX',
  timezone: 'America/Mexico_City',

  capabilities: [],
  plugins: [],

  routes: {
    home: '/',
    services: '/servicios',
    portfolio: '/portfolio',
    about: '/nosotros',
    contact: '/contacto',
    blog: '/blog',
  },
}

/**
 * Required fields for a valid tenant config
 */
export const REQUIRED_FIELDS = ['id', 'name', 'slug']

/**
 * Validate tenant configuration
 * @param {object} config - Tenant configuration to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTenantConfig(config) {
  const errors = []

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be an object'] }
  }

  for (const field of REQUIRED_FIELDS) {
    if (!config[field]) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  if (config.slug && !/^[a-z0-9-]+$/.test(config.slug)) {
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens')
  }

  if (config.provider && !['json', 'api', 'cms', 'graphql'].includes(config.provider.type)) {
    errors.push(`Invalid provider type: ${config.provider.type}`)
  }

  if (config.locale && typeof config.locale !== 'string') {
    errors.push('Locale must be a string')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Merge tenant config with defaults
 * @param {object} config - Partial tenant configuration
 * @returns {object} - Full tenant configuration with defaults
 */
export function mergeWithDefaults(config) {
  return {
    ...DEFAULT_TENANT_CONFIG,
    ...config,
    branding: {
      ...DEFAULT_TENANT_CONFIG.branding,
      ...config.branding,
      colors: {
        ...DEFAULT_TENANT_CONFIG.branding.colors,
        ...config.branding?.colors,
      },
      fonts: {
        ...DEFAULT_TENANT_CONFIG.branding.fonts,
        ...config.branding?.fonts,
      },
    },
    theme: {
      ...DEFAULT_TENANT_CONFIG.theme,
      ...config.theme,
    },
    provider: {
      ...DEFAULT_TENANT_CONFIG.provider,
      ...config.provider,
    },
    routes: {
      ...DEFAULT_TENANT_CONFIG.routes,
      ...config.routes,
    },
  }
}
