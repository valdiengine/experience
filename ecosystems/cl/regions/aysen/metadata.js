/**
 * Aysén Region Configuration
 * 
 * Regional configuration for Aysén, Chile.
 */

export default {
  code: 'aysen',
  name: 'Aysén',
  country: 'cl',

  configVersion: '1.0',

  geography: {
    coordinates: [-45.5654, -72.0518]
  },

  description: 'Región de glaciers, lagos y naturaleza prístina',

  categories: ['tourism', 'accommodation', 'events'],

  destinations: ['coyhaique'],

  enabledModules: [
    'reservations',
    'gallery',
    'media',
    'maps',
    'notifications'
  ],

  metadata: {
    regionCode: 'AI',
    capital: 'Coyhaique'
  }
}
