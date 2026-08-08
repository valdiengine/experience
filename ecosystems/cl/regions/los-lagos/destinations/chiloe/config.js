/**
 * Chiloé Destination Configuration
 * 
 * Destination configuration for Chiloé Archipelago, Los Lagos, Chile.
 */

export default {
  slug: 'chiloe',
  code: 'chiloe',
  name: 'Chiloé',
  description: 'Experiencia insular y cultural de Chiloé',

  type: 'tourism-platform',
  category: 'tourism',

  country: 'cl',
  region: 'los-lagos',

  configVersion: '1.0',

  domain: 'chiloe.app',

  geography: {
    coordinates: [-42.4739, -73.8205],
    city: 'Castro',
    province: 'Los Lagos',
    country: 'Chile',
    archipelago: true
  },

  branding: {
    colors: {
      primary: '#e67e22',
      secondary: '#1a1a2e'
    }
  },

  maps: {
    provider: 'mapbox',
    defaultCenter: [-42.4739, -73.8205],
    defaultZoom: 10
  },

  seo: {
    keywords: ['chiloe', 'isla', 'turismo', 'chile', 'cultura', 'chilota']
  },

  enabledCategories: ['tourism', 'accommodation', 'restaurant', 'marine', 'events'],

  enabledModules: [
    'reservations',
    'gallery',
    'media',
    'maps',
    'notifications',
    'cultural'
  ],

  experienceType: 'tourism-directory'
}
