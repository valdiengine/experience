/**
 * Ecosystem Seed — Categories
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates initial category configurations for ecosystems.
 * Categories are global and can be enabled/disabled per destination.
 */

export const CATEGORIES_SEED = [
  {
    slug: 'tourism',
    name: 'Turismo',
    type: 'tourism',
    icon: 'bi-biuldings',
    description: 'Actividades y destinos turísticos',
    sortOrder: 1,
  },
  {
    slug: 'accommodation',
    name: 'Alojamiento',
    type: 'tourism',
    icon: 'bi-house-door',
    description: 'Hoteles, hostales, cabañas y demás opciones de alojamiento',
    sortOrder: 2,
  },
  {
    slug: 'gastronomy',
    name: 'Gastronomía',
    type: 'tourism',
    icon: 'bi-cup-hot',
    description: 'Restaurantes, cafés, bares y experiencias culinarias',
    sortOrder: 3,
  },
  {
    slug: 'tours',
    name: 'Tours y Actividades',
    type: 'tourism',
    icon: 'bi-compass',
    description: 'Excursiones, tours guiados y actividades recreativas',
    sortOrder: 4,
  },
  {
    slug: 'transportation',
    name: 'Transporte',
    type: 'service',
    icon: 'bi-truck',
    description: 'Servicios de transporte y movilización',
    sortOrder: 5,
  },
  {
    slug: 'commerce',
    name: 'Comercio',
    type: 'service',
    icon: 'bi-shop',
    description: 'Tiendas y comercio local',
    sortOrder: 6,
  },
  {
    slug: 'services',
    name: 'Servicios',
    type: 'service',
    icon: 'bi-tools',
    description: 'Servicios profesionales y técnicos',
    sortOrder: 7,
  },
  {
    slug: 'events',
    name: 'Eventos',
    type: 'culture',
    icon: 'bi-calendar-event',
    description: 'Eventos, festividades y actividades culturales',
    sortOrder: 8,
  },
  {
    slug: 'real-estate',
    name: 'Bienes Raíces',
    type: 'business',
    icon: 'bi-house',
    description: 'Propiedades, arriendos y servicios inmobiliarios',
    sortOrder: 9,
  },
  {
    slug: 'automotive',
    name: 'Automotriz',
    type: 'business',
    icon: 'bi-car-front',
    description: 'Concesionarias, talleres y servicios automotrices',
    sortOrder: 10,
  },
  {
    slug: 'marine',
    name: 'Marítimo',
    type: 'business',
    icon: 'bi-water',
    description: 'Navieras, varaderos y servicios marítimos',
    sortOrder: 11,
  },
  {
    slug: 'telecommunications',
    name: 'Telecomunicaciones',
    type: 'business',
    icon: 'bi-broadcast',
    description: 'Proveedores de internet, telefonía y servicios tecnológicos',
    sortOrder: 12,
  },
  {
    slug: 'security',
    name: 'Seguridad',
    type: 'business',
    icon: 'bi-shield-check',
    description: 'Empresas de seguridad y vigilancia',
    sortOrder: 13,
  },
  {
    slug: 'construction',
    name: 'Construcción',
    type: 'business',
    icon: 'bi-hammer',
    description: 'Empresas constructoras y materiales de construcción',
    sortOrder: 14,
  },
  {
    slug: 'education',
    name: 'Educación',
    type: 'service',
    icon: 'bi-mortarboard',
    description: 'Instituciones educativas y servicios de formación',
    sortOrder: 15,
  },
  {
    slug: 'health',
    name: 'Salud',
    type: 'service',
    icon: 'bi-heart-pulse',
    description: 'Clínicas, laboratorios y servicios de salud',
    sortOrder: 16,
  },
  {
    slug: 'industry',
    name: 'Industria',
    type: 'business',
    icon: 'bi-gear',
    description: 'Industrias manufactureras y productivas',
    sortOrder: 17,
  },
]

export default CATEGORIES_SEED
