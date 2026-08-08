/**
 * Coyhaique Destination Configuration
 * 
 * Destination configuration for Coyhaique, Aysén, Chile.
 */

export default {
  slug: 'coyhaique',
  code: 'coyhaique',
  name: 'Coyhaique',
  description: 'Aysén patrimonial y turismo aventura',

  type: 'tourism-platform',
  category: 'tourism',

  country: 'cl',
  region: 'aysen',

  configVersion: '1.0',

  domain: 'coyhaique.app',

  geography: {
    coordinates: [-45.5654, -72.0518],
    city: 'Coyhaique',
    province: 'Aysén',
    country: 'Chile'
  },

  branding: {
    colors: {
      primary: '#27ae60',
      secondary: '#1a1a2e'
    }
  },

  maps: {
    provider: 'mapbox',
    defaultCenter: [-45.5654, -72.0518],
    defaultZoom: 12
  },

  enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events'],

  enabledModules: [
    'reservations',
    'gallery',
    'media',
    'maps',
    'notifications',
    'pwa'
  ],

  experienceType: 'tourism-directory'
}
