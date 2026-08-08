/**
 * Los Lagos Region Configuration
 * 
 * Regional configuration for Los Lagos, Chile.
 */

export default {
  code: 'los-lagos',
  name: 'Los Lagos',
  country: 'cl',

  configVersion: '1.0',

  geography: {
    coordinates: [-41.7545, -73.1269]
  },

  description: 'Región de lagos, volcanes y la isla de Chiloé',

  categories: ['tourism', 'accommodation', 'restaurant', 'marine'],

  destinations: ['chiloe'],

  enabledModules: [
    'reservations',
    'availability',
    'gallery',
    'media',
    'maps',
    'notifications'
  ],

  metadata: {
    regionCode: 'LL',
    capital: 'Puerto Montt'
  }
}
