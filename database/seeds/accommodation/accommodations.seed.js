/**
 * Accommodation Seed — Cabaña Ensueño
 *
 * ENSUEÑO POSTGRES — M2
 *
 * Represents the accommodation that generates the 90-night availability
 * window (2026-10-01 .. 2026-12-29). The design is authoritative:
 * PostgreSQL owns the UUIDs; this module only carries source data.
 *
 * Schema mapping notes (source of truth: database/schema/business/index.js):
 *   - The `accommodations` table has NO capacity/maxGuests columns.
 *     Those values map to the `metadata` jsonb column (sleepingCapacity,
 *     maxGuests) and `inventory.capacity` (bookable units) respectively.
 *   - `tenantSlug` / `companySlug` are resolved to persisted UUIDs by the
 *     SeedRunner (processAccommodation); the accommodation `id` is left to
 *     PostgreSQL (gen_random_uuid default).
 */

export const ENSUENO_ACCOMMODATION = {
  tenantSlug: 'ensueno-curinanco',
  companySlug: 'ensueno-curinanco',
  slug: 'cabina-ensueno',
  name: 'Cabaña Ensueño',
  type: 'cabins',
  status: 'active',
  description:
    'Cabaña con tinaja, piscina de temporada y sauna entre el bosque costero de Curiñanco. Cama queen, cocina equipada y terraza con vista al mar.',
  shortDescription: 'Cabaña costera con tinaja y sauna en Curiñanco',
  images: [],
  location: {
    address: 'Playa Curiñanco s/n',
    city: 'Curiñanco',
    region: 'Los Ríos',
    country: 'CL',
    coordinates: { lat: -39.8772, lng: -73.4097 },
  },
  contact: {
    email: 'contacto@ensuennocurinanco.example.com',
    phone: '+56 9 2222 1111',
  },
  amenities: ['tinaja', 'sauna', 'piscina', 'wifi', 'parking', 'barbacoa'],
  policies: {
    checkIn: '15:00',
    checkOut: '12:00',
    cancelation: 'flexible',
  },
  pricing: {
    basePrice: 90000,
    pricePerNight: 90000,
    currency: 'CLP',
  },
  inventory: {
    capacity: 4,
  },
  metadata: {
    sleepingCapacity: 2,
    maxGuests: 4,
  },
}

export const ACCOMMODATIONS_SEED = [ENSUENO_ACCOMMODATION]

export default ACCOMMODATIONS_SEED