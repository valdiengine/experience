/**
 * Ecosystem Seed — Destinations
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates initial destination configurations.
 * Each destination represents a tourism region or area.
 */

export const DESTINATIONS_SEED = [
  {
    regionCode: 'LR',
    code: 'VAL',
    name: 'Valdivia',
    slug: 'valdivia',
    type: 'tourism',
    description: 'Ciudad universitaria, cultural y tecnológica del sur de Chile. Conocida por sus industrias, gastronomía y cercanía a los bosques valdivianos.',
    coordinates: { lat: -39.8199, lng: -73.2454 },
    branding: {
      tagline: 'Tierras Australes, Corazón Verde',
      heroImage: '/images/destinations/valdivia-hero.jpg',
    },
    seo: {
      title: 'Valdivia - Tierras Australes, Corazón Verde',
      description: 'Descubre Valdivia, la ciudad del sur de Chile con la mejor calidad de vida.',
    },
    maps: {
      center: { lat: -39.8199, lng: -73.2454 },
      zoom: 13,
    },
    enabledCategories: ['tourism', 'accommodation', 'gastronomy', 'tours', 'services'],
    enabledModules: ['website', 'experience', 'reservations', 'reviews'],
    sortOrder: 1,
    status: 'active',
  },
  {
    regionCode: 'MA',
    code: 'NAT',
    name: 'Puerto Natales',
    slug: 'natales',
    type: 'tourism',
    description: 'Puerta de entrada a las Torres del Paine. Ciudad patrimonio con gastronomía y cultura única.',
    coordinates: { lat: -51.7327, lng: -72.4913 },
    branding: {
      tagline: 'Puerta de Entrada al Paine',
      heroImage: '/images/destinations/natales-hero.jpg',
    },
    seo: {
      title: 'Puerto Natales - Puerta de Entrada al Paine',
      description: 'Descubre Puerto Natales, punto de partida para la Patagonia.',
    },
    maps: {
      center: { lat: -51.7327, lng: -72.4913 },
      zoom: 13,
    },
    enabledCategories: ['tourism', 'accommodation', 'gastronomy', 'tours', 'services'],
    enabledModules: ['website', 'experience', 'reservations', 'reviews'],
    sortOrder: 2,
    status: 'active',
  },
  {
    regionCode: 'MA',
    code: 'PUN',
    name: 'Punta Arenas',
    slug: 'puntaarenas',
    type: 'tourism',
    description: 'Ciudad más austral del mundo habitable. Historia, cultura y vistas al Estrecho de Magallanes.',
    coordinates: { lat: -53.1638, lng: -70.9171 },
    branding: {
      tagline: 'La Ciudad Más Austral del Mundo',
      heroImage: '/images/destinations/punta-arenas-hero.jpg',
    },
    seo: {
      title: 'Punta Arenas - La Ciudad Más Austral del Mundo',
      description: 'Explora Punta Arenas, la ciudad más austral del mundo.',
    },
    maps: {
      center: { lat: -53.1638, lng: -70.9171 },
      zoom: 13,
    },
    enabledCategories: ['tourism', 'accommodation', 'gastronomy', 'tours', 'services'],
    enabledModules: ['website', 'experience', 'reservations', 'reviews'],
    sortOrder: 3,
    status: 'active',
  },
  {
    regionCode: 'LL',
    code: 'CHL',
    name: 'Chiloé',
    slug: 'chiloe',
    type: 'tourism',
    description: 'Archipiélago mágico con tradiciones únicas, música, gastronomía y paisajes surnaturales.',
    coordinates: { lat: -42.5, lng: -73.5 },
    branding: {
      tagline: 'Isla Mágica del Sur',
      heroImage: '/images/destinations/chiloe-hero.jpg',
    },
    seo: {
      title: 'Chiloé - Isla Mágica del Sur',
      description: 'Descubre Chiloé, un archipiélago con tradiciones únicas.',
    },
    maps: {
      center: { lat: -42.5, lng: -73.5 },
      zoom: 9,
    },
    enabledCategories: ['tourism', 'accommodation', 'gastronomy', 'tours', 'services'],
    enabledModules: ['website', 'experience', 'reservations', 'reviews'],
    sortOrder: 4,
    status: 'active',
  },
  {
    regionCode: 'AY',
    code: 'COY',
    name: 'Coyhaique',
    slug: 'coyhaique',
    type: 'tourism',
    description: 'Capital de la región de Aysén. Puerta de entrada a lagos, ríos y montañas pristine.',
    coordinates: { lat: -45.5632, lng: -72.0668 },
    branding: {
      tagline: 'Patagonia Verde',
      heroImage: '/images/destinations/coyhaique-hero.jpg',
    },
    seo: {
      title: 'Coyhaique - Patagonia Verde',
      description: 'Descubre Coyhaique, la puerta a la Patagonia verde.',
    },
    maps: {
      center: { lat: -45.5632, lng: -72.0668 },
      zoom: 12,
    },
    enabledCategories: ['tourism', 'accommodation', 'gastronomy', 'tours', 'services'],
    enabledModules: ['website', 'experience', 'reservations', 'reviews'],
    sortOrder: 5,
    status: 'active',
  },
]

export default DESTINATIONS_SEED
