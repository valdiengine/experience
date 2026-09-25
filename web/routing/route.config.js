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

    // ECOSYSTEM-2 / APP-ZONE-TABS-2: Isla Teja (real visual integration)
    {
      domain: 'valdi.app',
      path: '/isla-teja',
      match: 'exact',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'valdi',
      zone: 'isla-teja',
      type: 'zone',
      experienceType: 'tourism-destination',
      migrationState: 'EXPERIENCE',
      enabled: true,
      zoneNavigation: {
        scopeId: 'isla-teja-main',
        items: [
          { key: 'descubre', label: 'Descubre', component: 'zone.intro', contentRef: 'valdi:isla-teja:descubre' },
          { key: 'gastronomia', label: 'Gastronomía', component: 'zone.list', contentRef: 'valdi:isla-teja:gastronomia' },
          { key: 'alojamientos', label: 'Alojamientos', component: 'zone.list', contentRef: 'valdi:isla-teja:alojamientos' },
          { key: 'actividades', label: 'Actividades', component: 'zone.list', contentRef: 'valdi:isla-teja:actividades' },
          { key: 'servicios', label: 'Servicios', component: 'zone.list', contentRef: 'valdi:isla-teja:servicios' },
          { key: 'mapa', label: 'Mapa', component: 'zone.map', contentRef: 'valdi:isla-teja:mapa' }
        ]
      },
      zoneContent: {
        scopeId: 'isla-teja-main',
        items: [
          {
            contentRef: 'valdi:isla-teja:descubre',
            component: 'zone.intro',
            lead: 'Isla Teja es la isla fluvial de Valdivia que alberga el campus de la Universidad Austral y los parques junto al río.',
            paragraphs: [
              'Conectada con el centro de Valdivia por el Puente Pedro de Valdivia, la isla reúne el campus universitario, el Museo de la Exploración R.A. Philippi y el Jardín Botánico.',
              'Es un punto de partida cómodo para recorrer Valdivia a pie o en bicicleta, con costanera y áreas verdes sobre el río.'
            ]
          },
          {
            contentRef: 'valdi:isla-teja:gastronomia',
            component: 'zone.list',
            lead: 'Recorridos gastronómicos en Valdivia: cocina sureña, panaderías y cafés cerca del campus y del centro.',
            items: [
              { name: 'Cocina sureña', description: 'Platos de la tradición valdiviana y productos de la zona en locales del área urbana.', note: 'Consultar cartas y disponibilidad.' },
              { name: 'Panaderías & cafés', description: 'Opciones para una pausa cerca del campus y del casco histórico.', note: 'Ideal para un descanso en el recorrido.' },
              { name: 'Comida al aire libre', description: 'Picnic y snacks en los parques del sector de la isla, como el Parque Saval.', note: 'Llevar propio o comprar en el camino.' }
            ]
          },
          {
            contentRef: 'valdi:isla-teja:alojamientos',
            component: 'zone.list',
            lead: 'Alojamiento para conocer Valdivia y recorrer la isla.',
            items: [
              { name: 'Hospedajes del sector universitario', description: 'Residenciales y hostales orientados a visitantes y estudiantes.', note: 'Consultar disponibilidad con anticipación.' },
              { name: 'Hoteles del centro histórico', description: 'La oferta hotelera de Valdivia se concentra en el casco céntrico.', note: 'El centro queda a pocos minutos de la isla.' },
              { name: 'Cabañas y casas en la zona ribereña', description: 'Opciones de estadía independiente en los alrededores de la ciudad.', note: 'Se recomienda reservar en temporada alta.' }
            ]
          },
          {
            contentRef: 'valdi:isla-teja:actividades',
            component: 'zone.list',
            lead: 'Museos, parques y paseos que no te puedes perder en la isla.',
            items: [
              { name: 'Museo de la Exploración R.A. Philippi', description: 'Museo del campus de la Universidad Austral con colecciones de la exploración científica del sur de Chile.', note: 'Verificar horarios de atención.' },
              { name: 'Jardín Botánico de la Universidad Austral', description: 'Recorridos entre especies nativas y exóticas en el predio universitario de Isla Teja.', note: 'Consultar horarios y condiciones de visita.' },
              { name: 'Parque Saval', description: 'Áreas verdes y senderos frente al río, junto al campus universitario.', note: 'Ideal para caminatas y picnic.' },
              { name: 'Costanera y Puente Pedro de Valdivia', description: 'Paseo por el borde del río con vista al centro histórico de Valdivia.', note: 'El puente conecta la isla con el centro.' }
            ]
          },
          {
            contentRef: 'valdi:isla-teja:servicios',
            component: 'zone.list',
            lead: 'Servicios útiles para organizar la visita a la isla.',
            items: [
              { name: 'Información turística', description: 'Puntos de atención con mapas y recomendaciones para recorrer la ciudad y la isla.', note: 'Consultar horarios.' },
              { name: 'Accesos y transporte urbano', description: 'El centro y el sector universitario están conectados por el Puente Pedro de Valdivia, con recorridos de transporte público hacia el área de la isla.', note: 'Validar recorridos y frecuencias.' },
              { name: 'Recorridos a pie y en bicicleta', description: 'La isla es llana y ofrece un buen paseo caminando o en bicicleta.', note: 'La costanera es el recorrido destacado.' }
            ]
          },
          {
            contentRef: 'valdi:isla-teja:mapa',
            component: 'zone.map',
            title: 'Mapa de Isla Teja',
            lead: 'Ubicación y referencia de Isla Teja en Valdivia.',
            location: 'Isla Teja — Valdivia, Región de Los Ríos, Chile',
            coordinates: [-39.8051, -73.2499],
            note: 'La isla se conecta con el centro de Valdivia por el Puente Pedro de Valdivia; por su costanera se recorre el borde del río.'
          }
        ]
      },
      // APP-ZONE-PRESENT-1: first Level-2 Application-scoped visual identity.
      // Declarative only. Environment "nature" default tokens come from the
      // Engine; scope authority stays with generateZoneNavigationScope().
      zonePresentation: {
        version: '1',
        variant: 'nature',
        tokens: {
          primary: '#3a7d66',
          secondary: '#1f3530',
          accent: '#e8d5a3'
        }
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
