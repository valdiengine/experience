/**
 * Albasie Company Configuration
 * 
 * Company configuration for Albasie tourism operator in Valdivia.
 */

export default {
  slug: 'albasie',
  code: 'albasie',
  name: 'Albasie',
  type: 'tourism-operator',
  description: 'Operador turístico especializado en experiencias patrimoniales en el sur de Chile',

  country: 'cl',
  region: 'los-rios',
  destination: 'valdi',

  configVersion: '1.0',

  branding: {
    logo: '/assets/companies/cl/los-rios/valdivia/albasie/logo.svg',
    colors: {
      primary: '#2d5a27',
      secondary: '#1a1a2e'
    },
    overrides: {
      applyDestinationBranding: true,
      except: ['logo', 'primaryColor']
    }
  },

  contact: {
    email: 'info@albasie.cl',
    phone: '+56 9 1234 5678',
    whatsapp: '+56912345678',
    address: {
      street: 'Calle Principal 123',
      city: 'Valdivia',
      region: 'Los Ríos',
      country: 'CL',
      postalCode: '5090000'
    }
  },

  social: {
    instagram: 'https://instagram.com/albasie',
    facebook: 'https://facebook.com/albasie',
    tripadvisor: 'https://tripadvisor.com/albasie'
  },

  enabledCategories: ['tourism', 'events'],

  enabledModules: [
    'reservations',
    'availability',
    'gallery',
    'media',
    'notifications'
  ],

  team: [
    {
      id: 'usr-001',
      name: 'Juan Pérez',
      role: 'Guía Turístico',
      avatar: '/assets/companies/cl/los-rios/valdivia/albasie/team/juan.jpg'
    },
    {
      id: 'usr-002',
      name: 'María García',
      role: 'Coordinadora',
      avatar: '/assets/companies/cl/los-rios/valdivia/albasie/team/maria.jpg'
    }
  ],

  catalog: {
    services: '/assets/companies/cl/los-rios/valdivia/albasie/catalog/services.json',
    products: '/assets/companies/cl/los-rios/valdivia/albasie/catalog/products.json'
  },

  providers: {
    storage: 'local',
    media: 'local'
  },

  experienceType: 'company-profile',

  capabilities: {
    installableApp: {
      enabled: true,
      name: 'Albasie - Experiencias Patrimoniales',
      shortName: 'Albasie',
      description: 'Operador turístico especializado en experiencias patrimoniales en el sur de Chile',
      display: 'standalone',
      themeColor: '#2d5a27',
      backgroundColor: '#0a0a0a',
      startUrl: '/albasie/',
      scope: '/albasie/',
      offlineFallback: '/offline.html',
      icons: [
        {
          src: '/apps/valdi/albasie/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/apps/valdi/albasie/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/apps/valdi/albasie/icons/icon-512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      favicon: '/apps/valdi/albasie/icons/favicon.ico',
      appleTouchIcon: '/apps/valdi/albasie/icons/apple-touch-icon.png'
    }
  },

  metadata: {
    companyId: 'albasie',
    founded: '2020',
    rut: '12.345.678-9'
  }
}
