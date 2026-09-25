/**
 * Route Ownership Configuration
 *
 * Configuration-driven route ownership for the Valdi Platform.
 * Each canonical domain can have routes with different ownership.
 *
 * Match types:
 * - "exact" (default): Exact path match /path
 * - "prefix": Prefix match /path/*
 *
 * Ownership:
 * - "wordpress": WordPress owns the route (default)
 * - "hybrid": Experience Engine owns presentation, WordPress provides content
 * - "experience": Experience Engine owns the complete route
 *
 * Migration states:
 * - "LEGACY": Original WordPress route
 * - "HYBRID": Transitioning to Experience
 * - "EXPERIENCE": Fully Experience-owned
 * - "DISABLED": Route disabled
 */

import { OWNERSHIP } from './route.registry.js'

export const ROUTE_CONFIG = {
  routes: [
    // valdi.app routes
    {
      domain: 'valdi.app',
      path: '/',
      match: 'exact',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'valdi',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'valdi.app',
      path: '/albasie',
      match: 'exact',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'valdi',
      company: 'albasie',
      migrationState: 'EXPERIENCE',
      enabled: true
    },
    {
      domain: 'valdi.app',
      path: '/empresa/albasie',
      match: 'exact',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'valdi',
      company: 'albasie',
      migrationState: 'EXPERIENCE',
      enabled: true
    },
    {
      domain: 'valdi.app',
      path: '/empresa',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'valdi',
      migrationState: 'LEGACY',
      enabled: true
    },

    // ECOSYSTEM-2: Zone Applications (tourism-destination)
    {
      domain: 'valdi.app',
      path: '/corral',
      match: 'exact',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'valdi',
      zone: 'corral',
      type: 'zone',
      experienceType: 'tourism-destination',
      migrationState: 'EXPERIENCE',
      enabled: true,
      zoneNavigation: {
        scopeId: 'corral-main',
        items: [
          { key: 'descubre', label: 'Descubre', component: 'zone.intro', contentRef: 'valdi:corral:descubre' },
          { key: 'gastronomia', label: 'Gastronomía', component: 'zone.list', contentRef: 'valdi:corral:gastronomia' },
          { key: 'alojamientos', label: 'Alojamientos', component: 'zone.list', contentRef: 'valdi:corral:alojamientos' },
          { key: 'actividades', label: 'Actividades', component: 'zone.list', contentRef: 'valdi:corral:actividades' },
          { key: 'comercio', label: 'Comercio', component: 'zone.list', contentRef: 'valdi:corral:comercio' },
          { key: 'mapa', label: 'Mapa', component: 'zone.map', contentRef: 'valdi:corral:mapa' }
        ]
      }
    },
    {
      domain: 'valdi.app',
      path: '/costa',
      match: 'exact',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'valdi',
      zone: 'costa',
      type: 'zone',
      experienceType: 'tourism-destination',
      migrationState: 'EXPERIENCE',
      enabled: true,
      zoneNavigation: {
        scopeId: 'costa-main',
        items: [
          { key: 'descubre', label: 'Descubre', component: 'zone.intro', contentRef: 'valdi:costa:descubre' },
          { key: 'gastronomia', label: 'Gastronomía', component: 'zone.list', contentRef: 'valdi:costa:gastronomia' },
          { key: 'alojamientos', label: 'Alojamientos', component: 'zone.list', contentRef: 'valdi:costa:alojamientos' },
          { key: 'actividades', label: 'Actividades', component: 'zone.list', contentRef: 'valdi:costa:actividades' },
          { key: 'comercio', label: 'Comercio', component: 'zone.list', contentRef: 'valdi:costa:comercio' },
          { key: 'mapa', label: 'Mapa', component: 'zone.map', contentRef: 'valdi:costa:mapa' }
        ]
      }
    },

    // natales.app routes
    {
      domain: 'natales.app',
      path: '/',
      match: 'exact',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'natales',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'natales.app',
      path: '/turismo-21',
      match: 'exact',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'natales',
      company: 'turismo-21',
      migrationState: 'EXPERIENCE',
      enabled: true
    },
    {
      domain: 'natales.app',
      path: '/empresa',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'natales',
      migrationState: 'LEGACY',
      enabled: true
    },

    // puntaarenas.app routes
    {
      domain: 'puntaarenas.app',
      path: '/',
      match: 'exact',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'puntaarenas',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'puntaarenas.app',
      path: '/hostal-del-tuto',
      match: 'exact',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'puntaarenas',
      company: 'hostal-del-tuto',
      migrationState: 'EXPERIENCE',
      enabled: true
    },
    {
      domain: 'puntaarenas.app',
      path: '/empresa',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'puntaarenas',
      migrationState: 'LEGACY',
      enabled: true
    },

    // coyhaique.app routes
    {
      domain: 'coyhaique.app',
      path: '/',
      match: 'exact',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'coyhaique',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'coyhaique.app',
      path: '/dronestica',
      match: 'exact',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'coyhaique',
      company: 'dronestica',
      migrationState: 'EXPERIENCE',
      enabled: true
    },
    {
      domain: 'coyhaique.app',
      path: '/empresa',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'coyhaique',
      migrationState: 'LEGACY',
      enabled: true
    },

    // chiloe.app routes
    {
      domain: 'chiloe.app',
      path: '/',
      match: 'exact',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'chiloe',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'chiloe.app',
      path: '/el-encanto-chiloe',
      match: 'exact',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'chiloe',
      company: 'el-encanto-chiloe',
      migrationState: 'EXPERIENCE',
      enabled: true
    },
    {
      domain: 'chiloe.app',
      path: '/empresa',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'chiloe',
      migrationState: 'LEGACY',
      enabled: true
    },

    // Future tourism destination routes - marked as WORDPRESS until Experience design exists
    {
      domain: 'valdi.app',
      path: '/turismo/costa',
      match: 'exact',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'valdi',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'valdi.app',
      path: '/turismo/corral',
      match: 'exact',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'valdi',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'valdi.app',
      path: '/turismo',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'valdi',
      migrationState: 'LEGACY',
      enabled: true
    },

    // Editorial routes remain WORDPRESS-owned
    {
      domain: 'valdi.app',
      path: '/blog',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'valdi',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'valdi.app',
      path: '/noticias',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'valdi',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'natales.app',
      path: '/blog',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'natales',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'puntaarenas.app',
      path: '/blog',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'puntaarenas',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'coyhaique.app',
      path: '/blog',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'coyhaique',
      migrationState: 'LEGACY',
      enabled: true
    },
    {
      domain: 'chiloe.app',
      path: '/blog',
      match: 'prefix',
      ownership: OWNERSHIP.WORDPRESS,
      destination: 'chiloe',
      migrationState: 'LEGACY',
      enabled: true
    }
  ]
}

export function getRouteConfig() {
  return ROUTE_CONFIG
}

export default ROUTE_CONFIG
