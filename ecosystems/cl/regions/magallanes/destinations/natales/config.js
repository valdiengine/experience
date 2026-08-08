/**
 * Puerto Natales Destination Configuration
 * 
 * Destination configuration for Puerto Natales, Magallanes, Chile.
 */

export default {
  slug: 'natales',
  code: 'natales',
  name: 'Puerto Natales',
  description: 'Portal turístico para Puerto Natales y Torres del Paine',

  type: 'tourism-platform',
  category: 'tourism',

  country: 'cl',
  region: 'magallanes',

  configVersion: '1.0',

  domain: 'natales.app',
  domains: {
    primary: 'natales.app',
    www: 'www.natales.app'
  },

  geography: {
    coordinates: [-51.7322, -72.4912],
    city: 'Puerto Natales',
    province: 'Magallanes',
    country: 'Chile'
  },

  branding: {
    logo: '/assets/ecosystems/cl/regions/magallanes/natales/logo.svg',
    favicon: '/assets/ecosystems/cl/regions/magallanes/natales/favicon.svg',
    colors: {
      primary: '#2d5a27',
      secondary: '#1a1a2e',
      accent: '#e8d5a3'
    },
    fonts: {
      display: 'Inter',
      body: 'Inter'
    }
  },

  theme: {
    mode: 'dark',
    borderRadius: '8px'
  },

  i18n: {
    defaultLocale: 'es-CL',
    supportedLocales: ['es-CL', 'es'],
    fallbackLocale: 'es'
  },

  maps: {
    provider: 'mapbox',
    defaultCenter: [-51.7322, -72.4912],
    defaultZoom: 13,
    style: 'mapbox://styles/mapbox/outdoors-v12'
  },

  seo: {
    defaultTitle: 'Puerto Natales — {destination}',
    defaultDescription: 'Portal turístico para Puerto Natales',
    keywords: ['natales', 'torres del paine', 'patagonia', 'chile', 'turismo']
  },

  analytics: {
    enabled: true
  },

  enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events'],

  enabledModules: [
    'reservations',
    'availability',
    'gallery',
    'media',
    'maps',
    'notifications',
    'pwa'
  ],

  navigation: {
    header: {
      items: [
        { label: 'Inicio', path: '/' },
        { label: 'Destinos', path: '/destinations' },
        { label: 'Tours', path: '/tours' },
        { label: 'Galería', path: '/gallery' },
        { label: 'Contacto', path: '/contact' }
      ]
    }
  },

  experienceType: 'tourism-directory'
}
