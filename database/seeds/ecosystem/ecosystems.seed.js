/**
 * Ecosystem Seed — Ecosystems
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates initial ecosystem configurations.
 * Each destination has its own ecosystem.
 */

export const ECOSYSTEMS_SEED = [
  {
    destinationSlug: 'valdivia',
    name: 'Valdivia Tourism Ecosystem',
    slug: 'valdivia-ecosystem',
    type: 'tourism',
    description: 'Ecosistema turístico de Valdivia y sus alrededores',
    configuration: {
      defaultLocale: 'es-CL',
      supportedLocales: ['es-CL', 'es', 'en'],
      currency: 'CLP',
      timezone: 'America/Santiago',
    },
    features: ['reservations', 'reviews', 'gallery', 'blog'],
  },
  {
    destinationSlug: 'natales',
    name: 'Puerto Natales Tourism Ecosystem',
    slug: 'natales-ecosystem',
    type: 'tourism',
    description: 'Ecosistema turístico de Puerto Natales y Torres del Paine',
    configuration: {
      defaultLocale: 'es-CL',
      supportedLocales: ['es-CL', 'es', 'en'],
      currency: 'CLP',
      timezone: 'America/Santiago',
    },
    features: ['reservations', 'reviews', 'gallery', 'tours'],
  },
  {
    destinationSlug: 'puntaarenas',
    name: 'Punta Arenas Tourism Ecosystem',
    slug: 'puntaarenas-ecosystem',
    type: 'tourism',
    description: 'Ecosistema turístico de Punta Arenas y la Patagonia',
    configuration: {
      defaultLocale: 'es-CL',
      supportedLocales: ['es-CL', 'es', 'en'],
      currency: 'CLP',
      timezone: 'America/Santiago',
    },
    features: ['reservations', 'reviews', 'gallery', 'events'],
  },
  {
    destinationSlug: 'chiloe',
    name: 'Chiloé Tourism Ecosystem',
    slug: 'chiloe-ecosystem',
    type: 'tourism',
    description: 'Ecosistema turístico del Archipiélago de Chiloé',
    configuration: {
      defaultLocale: 'es-CL',
      supportedLocales: ['es-CL', 'es', 'en'],
      currency: 'CLP',
      timezone: 'America/Santiago',
    },
    features: ['reservations', 'reviews', 'gallery', 'events', 'culture'],
  },
  {
    destinationSlug: 'coyhaique',
    name: 'Coyhaique Tourism Ecosystem',
    slug: 'coyhaique-ecosystem',
    type: 'tourism',
    description: 'Ecosistema turístico de Coyhaique y la Patagonia Verde',
    configuration: {
      defaultLocale: 'es-CL',
      supportedLocales: ['es-CL', 'es', 'en'],
      currency: 'CLP',
      timezone: 'America/Santiago',
    },
    features: ['reservations', 'reviews', 'gallery', 'tours'],
  },
]

export default ECOSYSTEMS_SEED
