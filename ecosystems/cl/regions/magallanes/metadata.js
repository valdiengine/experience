/**
 * Magallanes Region Configuration
 * 
 * Regional configuration for Magallanes, Chile.
 */

export default {
  code: 'magallanes',
  name: 'Magallanes',
  country: 'cl',

  configVersion: '1.0',

  geography: {
    coordinates: [-52.5311, -72.4695],
    boundingBox: {
      north: -50.0,
      south: -55.0,
      east: -66.0,
      west: -75.0
    }
  },

  description: 'Región más austral del mundo, hogar de Torres del Paine',

  categories: ['tourism', 'accommodation', 'restaurant', 'events'],

  destinations: ['natales', 'puntaarenas'],

  enabledModules: [
    'reservations',
    'availability',
    'gallery',
    'media',
    'maps',
    'notifications'
  ],

  i18n: {
    defaultLocale: 'es-CL',
    supportedLocales: ['es-CL', 'es']
  },

  metadata: {
    regionCode: 'MA',
    province: 'Magallanes',
    capital: 'Punta Arenas'
  }
}
