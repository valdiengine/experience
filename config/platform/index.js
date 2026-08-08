/**
 * Platform Configuration
 * 
 * Platform-level defaults for Valdi Platform.
 */

export default {
  id: 'valdi',
  code: 'valdi',
  name: 'Valdi Platform',
  version: '4.2.0',
  configVersion: '1.0',

  theme: {
    mode: 'dark',
    borderRadius: '8px',
    spacing: '8px'
  },

  i18n: {
    defaultLocale: 'es-CL',
    fallbackLocale: 'es',
    supportedLocales: ['es-CL', 'es', 'en', 'pt-BR']
  },

  storage: {
    prefix: 'valdi_',
    provider: 'local'
  },

  capabilities: {
    defaults: ['persistence', 'media', 'storage', 'notifications']
  },

  modules: {
    defaults: ['gallery', 'media', 'notifications'],
    available: [
      'reservations',
      'availability',
      'ecommerce',
      'quotations',
      'blog',
      'tickets',
      'agenda',
      'crm',
      'chat',
      'payments',
      'inventory',
      'notifications',
      'analytics',
      'maps',
      'gallery',
      'media',
      'seo',
      'pwa',
      'owner-portal',
      'visitor-portal'
    ]
  },

  experiences: {
    defaults: ['default', 'tourism-directory', 'tourism-booking', 'company-profile'],
    available: [
      'tourism-directory',
      'tourism-booking',
      'company-profile',
      'ecommerce',
      'restaurant',
      'accommodation',
      'marketplace',
      'real-estate',
      'corporate',
      'service-company',
      'default'
    ]
  },

  countries: {
    supported: ['cl', 'ar', 'pe', 'co', 'mx'],
    default: 'cl'
  },

  security: {
    tenantIsolation: true,
    enforceBranding: false,
    allowCustomDomains: true
  },

  metadata: {
    platform: 'Valdi',
    certified: true,
    certifiedVersion: '4.2',
    certifiedDate: '2026-08-01'
  }
}
