# Filesystem Configuration Structure

This document describes the filesystem structure for configuration files in the Experience Engine ecosystem.

## Directory Overview

```
├── config/                    # Platform-level configuration
│   ├── platform/
│   │   └── index.js          # Platform defaults
│   ├── experiences/
│   │   ├── tourism-directory.js
│   │   ├── tourism-booking.js
│   │   └── company-profile.js
│   └── modules/
│       └── *.js             # Module configs
│
├── ecosystems/               # Country/Region/Destination hierarchy
│   └── {country}/
│       ├── metadata.js      # Country configuration
│       └── regions/
│           └── {region}/
│               ├── metadata.js    # Region configuration
│               └── destinations/
│                   └── {destination}/
│                       └── config.js  # Destination configuration
│
└── companies/                # Company configurations
    └── {country}/
        └── {region}/
            └── {destination}/
                └── {company}/
                    └── config.js  # Company configuration
```

## Platform Configuration

**Path**: `config/platform/index.js`

```javascript
export default {
  id: 'valdi',
  code: 'valdi',
  name: 'Valdi Platform',
  version: '4.2.0',
  configVersion: '1.0',

  theme: {
    mode: 'dark',
    borderRadius: '8px',
    spacing: '8px'
  },

  i18n: {
    defaultLocale: 'es-CL',
    fallbackLocale: 'es',
    supportedLocales: ['es-CL', 'es', 'en', 'pt-BR']
  },

  storage: {
    prefix: 'valdi_',
    provider: 'local'
  },

  capabilities: {
    defaults: ['persistence', 'media', 'storage', 'notifications']
  },

  modules: {
    defaults: ['gallery', 'media', 'notifications'],
    available: ['reservations', 'availability', 'ecommerce', ...]
  },

  experiences: {
    defaults: ['default', 'tourism-directory', 'company-profile'],
    available: ['tourism-directory', 'tourism-booking', ...]
  },

  countries: {
    supported: ['cl', 'ar', 'pe', 'co', 'mx'],
    default: 'cl'
  },

  security: {
    tenantIsolation: true,
    enforceBranding: false,
    allowCustomDomains: true
  }
}
```

## Country Configuration

**Path**: `ecosystems/{country}/metadata.js`

Example for Chile (`ecosystems/cl/metadata.js`):

```javascript
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
    tourism: { name: 'Turismo', icon: 'globe', color: '#c8a55c' },
    accommodation: { name: 'Alojamiento', icon: 'bed', color: '#2d5a27' },
    // ...
  },

  metadata: {
    countryCode: 'CL',
    iso31661Alpha2: 'CL',
    capital: 'Santiago'
  }
}
```

## Region Configuration

**Path**: `ecosystems/{country}/regions/{region}/metadata.js`

Example for Los Ríos (`ecosystems/cl/regions/los-rios/metadata.js`):

```javascript
export default {
  code: 'los-rios',
  name: 'Los Ríos',
  country: 'cl',
  configVersion: '1.0',

  geography: {
    coordinates: [-39.7545, -73.1868]
  },

  description: 'Región de bosques templados y ríos',

  categories: ['tourism', 'accommodation', 'restaurant', 'events'],

  destinations: ['valdi', 'valdivia'],

  enabledModules: [
    'reservations',
    'availability',
    'gallery',
    'media',
    'maps',
    'notifications'
  ],

  metadata: {
    regionCode: 'LR',
    capital: 'Valdivia'
  }
}
```

## Destination Configuration

**Path**: `ecosystems/{country}/regions/{region}/destinations/{dest}/config.js`

Example (`ecosystems/cl/regions/los-rios/destinations/valdi/config.js`):

```javascript
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

  geography: {
    coordinates: [-39.8197, -73.2459],
    city: 'Valdivia',
    province: 'Los Ríos',
    country: 'Chile'
  },

  branding: {
    colors: {
      primary: '#c8a55c',
      secondary: '#1a1a2e',
      accent: '#e8d5a3'
    },
    fonts: {
      display: 'Inter',
      body: 'Inter'
    },
    overrides: {
      applyDestinationBranding: true
    }
  },

  maps: {
    provider: 'mapbox',
    defaultCenter: [-39.8197, -73.2459],
    defaultZoom: 13
  },

  enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events'],

  enabledModules: [
    'reservations',
    'availability',
    'gallery',
    'media',
    'maps',
    'analytics',
    'notifications',
    'pwa'
  ],

  navigation: {
    header: {
      items: [
        { label: 'Inicio', path: '/', icon: 'home' },
        { label: 'Servicios', path: '/servicios', icon: 'briefcase' },
        // ...
      ]
    }
  },

  seo: {
    defaultTitle: 'Valdi — {destination}',
    defaultDescription: 'Plataforma de gestión turística',
    keywords: ['valdi', 'turismo', 'chile']
  },

  providers: {
    storage: 'local',
    media: 'local',
    maps: 'mapbox'
  }
}
```

## Company Configuration

**Path**: `companies/{country}/{region}/{destination}/{company}/config.js`

Example (`companies/cl/los-rios/valdivia/albasie/config.js`):

```javascript
export default {
  slug: 'albasie',
  code: 'albasie',
  name: 'Albasie',
  type: 'tourism-operator',
  description: 'Operador turístico especializado...',

  country: 'cl',
  region: 'los-rios',
  destination: 'valdivia',

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
      country: 'CL'
    }
  },

  social: {
    instagram: 'https://instagram.com/albasie',
    facebook: 'https://facebook.com/albasie'
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
      role: 'Guía Turístico'
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

  metadata: {
    companyId: 'albasie',
    founded: '2020'
  }
}
```

## Experience Configuration

**Path**: `config/experiences/{experienceId}.js`

Example (`config/experiences/tourism-directory.js`):

```javascript
export default {
  id: 'tourism-directory',
  name: 'Tourism Directory',
  type: 'directory',
  description: 'Directory of tourism businesses and services',

  configVersion: '1.0',

  sections: ['hero', 'search', 'categories', 'featured', 'map', 'testimonials'],

  components: [
    'search-bar',
    'category-grid',
    'business-list',
    'map-view',
    'filter-panel'
  ],

  modules: [
    'reservations',
    'availability',
    'gallery',
    'media',
    'maps',
    'notifications',
    'analytics'
  ],

  capabilities: [
    'reservation',
    'booking',
    'availability',
    'cms',
    'media',
    'maps'
  ],

  theme: {
    layout: 'directory',
    cardStyle: 'modern'
  },

  layout: {
    heroHeight: '60vh',
    gridColumns: 3
  }
}
```
