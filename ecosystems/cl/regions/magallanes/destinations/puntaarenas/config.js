/**
 * Punta Arenas Destination Configuration
 * 
 * Destination configuration for Punta Arenas, Magallanes, Chile.
 */

export default {
  slug: 'puntaarenas',
  code: 'puntaarenas',
  name: 'Punta Arenas',
  description: 'Portal turístico para Punta Arenas y la Patagonia chilena',

  type: 'tourism-platform',
  category: 'tourism',

  country: 'cl',
  region: 'magallanes',

  configVersion: '1.0',

  domain: 'puntaarenas.app',

  geography: {
    coordinates: [-53.1638, -70.9171],
    city: 'Punta Arenas',
    province: 'Magallanes',
    country: 'Chile'
  },

  branding: {
    colors: {
      primary: '#c8a55c',
      secondary: '#1a1a2e'
    }
  },

  maps: {
    provider: 'mapbox',
    defaultCenter: [-53.1638, -70.9171],
    defaultZoom: 13
  },

  enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events', 'marine'],

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
