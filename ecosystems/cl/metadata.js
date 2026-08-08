/**
 * Chile Country Configuration
 * 
 * Country-level configuration for Chile.
 */

export default {
  code: 'cl',
  name: 'Chile',
  flag: '🇨🇱',
  currency: 'CLP',
  currencySymbol: '$',
  timezone: 'America/Santiago',
  defaultLocale: 'es-CL',
  supportedLocales: ['es-CL', 'es', 'en'],
  fallbackLocale: 'es',

  configVersion: '1.0',

  regions: ['los-rios', 'magallanes', 'aysen', 'los-lagos'],

  enabledCategories: [
    'tourism',
    'accommodation',
    'restaurant',
    'events',
    'services',
    'marine',
    'commerce'
  ],

  enabledModules: [
    'reservations',
    'availability',
    'notifications'
  ],

  categories: {
    tourism: {
      name: 'Turismo',
      icon: 'globe',
      color: '#c8a55c'
    },
    accommodation: {
      name: 'Alojamiento',
      icon: 'bed',
      color: '#2d5a27'
    },
    restaurant: {
      name: 'Restaurante',
      icon: 'utensils',
      color: '#e8d5a3'
    },
    events: {
      name: 'Eventos',
      icon: 'calendar',
      color: '#1a1a2e'
    },
    services: {
      name: 'Servicios',
      icon: 'briefcase',
      color: '#4a90d9'
    },
    marine: {
      name: 'Marítimo',
      icon: 'ship',
      color: '#0077b6'
    },
    commerce: {
      name: 'Comercio',
      icon: 'shopping-bag',
      color: '#ff6b6b'
    }
  },

  metadata: {
    countryCode: 'CL',
    iso31661Alpha2: 'CL',
    iso31661Alpha3: 'CHL',
    phoneCode: '+56',
    capital: 'Santiago'
  }
}
