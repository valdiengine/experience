/**
 * Los Ríos Region Configuration
 * 
 * Regional configuration for Los Ríos, Chile.
 */

export default {
  code: 'los-rios',
  name: 'Los Ríos',
  country: 'cl',

  configVersion: '1.0',

  geography: {
    coordinates: [-40.5737, -72.9181],
    boundingBox: {
      north: -39.5,
      south: -41.0,
      east: -72.0,
      west: -74.0
    }
  },

  description: 'Región de los bosques y lagos del sur de Chile',

  categories: ['tourism', 'accommodation', 'restaurant', 'events'],

  destinations: ['valdi'],

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
    regionCode: 'LR',
    province: 'Los Ríos',
    capital: 'Valdivia'
  }
}
