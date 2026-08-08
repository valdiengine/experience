/**
 * Valdi Destination Configuration
 * 
 * Platform-level destination configuration for Valdi.
 * This represents the main platform destination.
 */

export default {
  slug: 'valdi',
  code: 'valdi',
  name: 'Valdi',
  description: 'Plataforma de gestión turística',

  type: 'tourism-platform',
  category: 'tourism',

  country: 'cl',
  region: 'los-rios',

  configVersion: '1.0',

  domain: 'valdi.app',

  branding: {
    colors: {
      primary: '#c8a55c',
      secondary: '#1a1a2e',
      accent: '#e8d5a3'
    },
    fonts: {
      display: 'Inter',
      body: 'Inter'
    }
  },

  maps: {
    provider: 'mapbox',
    defaultCenter: [-39.8197, -73.2459],
    defaultZoom: 13
  },

  enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events', 'services', 'marine', 'commerce'],

  enabledModules: ['reservations', 'availability', 'notifications', 'gallery', 'media', 'maps', 'analytics', 'pwa'],

  navigation: {
    header: {
      items: [
        { label: 'Inicio', path: '/', icon: 'home' },
        { label: 'Servicios', path: '/servicios', icon: 'briefcase' },
        { label: 'Portfolio', path: '/portfolio', icon: 'grid' },
        { label: 'Nosotros', path: '/nosotros', icon: 'info' },
        { label: 'Contacto', path: '/contacto', icon: 'mail' }
      ]
    }
  },

  seo: {
    defaultTitle: 'Valdi — {destination}',
    defaultDescription: 'Plataforma de gestión turística'
  },

  providers: {
    storage: 'local',
    media: 'local',
    maps: 'mapbox',
    analytics: 'google-analytics'
  },

  experienceType: 'tourism-directory',

  experience: {
    id: 'tourism-directory',
    name: 'Tourism Directory',
    description: 'Directorio de turismo y servicios para Valdivia'
  },

  categories: {
    tourism: { name: 'Turismo', icon: 'globe', color: '#c8a55c' },
    accommodation: { name: 'Alojamiento', icon: 'bed', color: '#2d5a27' },
    restaurant: { name: 'Restaurante', icon: 'utensils', color: '#e67e22' },
    events: { name: 'Eventos', icon: 'calendar', color: '#9b59b6' },
    services: { name: 'Servicios', icon: 'briefcase', color: '#3498db' },
    marine: { name: 'Marítimo', icon: 'ship', color: '#0077b6' },
    commerce: { name: 'Comercio', icon: 'shopping-bag', color: '#e74c3c' }
  },

  featured: {
    enabled: true,
    maxItems: 6,
    categories: ['tourism', 'accommodation', 'restaurant']
  },

  seo: {
    defaultTitle: 'Valdi — Turismo en Valdivia',
    defaultDescription: 'Descubre los mejores servicios turísticos, alojamiento, restaurantes y experiencias en Valdivia y Los Ríos, Chile.',
    keywords: ['valdivia', 'turismo', 'los ríos', 'chile', 'alojamiento', 'restaurantes', 'experiencias'],
    ogImage: '/assets/valdi/og-image.jpg'
  },

  contact: {
    email: 'contacto@valdi.app',
    phone: '+56 9 1234 5678',
    address: {
      city: 'Valdivia',
      region: 'Los Ríos',
      country: 'Chile'
    }
  },
}
