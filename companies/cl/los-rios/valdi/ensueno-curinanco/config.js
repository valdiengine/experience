/**
 * Ensueño Curiñanco Company Configuration
 *
 * ENSURENO_BOOKING_1: first real accommodation Application.
 * Authorized content only — Cobins (Cabaña Ensueño) are the only bookable
 * accommodation; camping/motorhome/picnic/quincho stay content-only and are not
 * enrolled in the booking registry.
 */

export default {
  slug: 'ensueno-curinanco',
  code: 'ensueno-curinanco',
  name: 'Complejo Ensueño Curiñanco',
  type: 'accommodation',
  description: 'Complejo de cabañas en Curiñanco, la costa boscosa de la comuna de Valdivia, Región de Los Ríos, Chile',

  country: 'cl',
  region: 'los-rios',
  destination: 'valdi',

  configVersion: '1.0',

  experienceType: 'accommodation',
  migrationState: 'EXPERIENCE',

  enabledCategories: ['accommodation'],
  enabledModules: ['reservations', 'availability', 'gallery', 'media', 'notifications'],

  location: {
    area: 'Curiñanco',
    city: 'Valdivia',
    region: 'Los Ríos',
    country: 'CL',
    note: 'Curiñanco es un sector costero de la comuna de Valdivia, a unos 20 minutos de la ciudad, donde el bosque se encuentra con la costa.'
  },

  experiences: [
    {
      id: 'cabina-ensueno',
      name: 'Cabaña Ensueño',
      category: 'cabins',
      description: 'Cabañas en la costa de Curiñanco rodeadas de bosque, con tinaja, piscina de temporada y sauna.',
      inventory: 4,
      capacity: { baseGuests: 2, maxGuests: 4 },
      pricePerNight: {
        base: 90000,
        forFourGuests: 100000,
        additionalGuestPerNight: 8000
      },
      currency: 'CLP',
      checkIn: '16:00',
      checkOut: '13:00',
      amenities: ['tinaja', 'piscina de temporada', 'sauna', 'camas de cuarzo', 'áreas verdes', 'senderos', 'quincho', 'picnic']
    }
  ],

  capabilities: {
    hero: {
      enabled: true,
      title: 'Complejo Ensueño Curiñanco',
      subtitle: 'Cabañas entre el bosque y la costa de Curiñanco, Valdivia, Región de Los Ríos.'
    },
    rooms: {
      enabled: true,
      title: 'Cabañas'
    },
    gallery: {
      enabled: true
    },
    location: {
      enabled: true,
      title: 'Cómo llegar',
      location: 'Curiñanco — comuna de Valdivia, Región de Los Ríos, Chile',
      note: 'A aproximadamente 20 minutos de Valdivia por la costa. Consulta el acceso y las indicaciones del complejo.'
    },
    booking: {
      enabled: true,
      configuration: {
        enabled: true,
        slug: 'ensueno-curinanco',
        title: 'Reserva tu cabaña en el Complejo Ensueño',
        description: 'Reserva online tu cabaña en Curiñanco: tinaja, piscina de temporada y sauna frente al bosque costero.',
        currency: 'CLP',
        checkIn: '16:00',
        checkOut: '13:00',
        basePricePerNight: 90000,
        pricePerNightFourGuests: 100000,
        additionalGuestPerNight: 8000,
        inventory: 4,
        maxGuests: 4,
        notes: 'Consultar condiciones de reserva y cancelación con el complejo.'
      }
    },
    reviews: {
      enabled: false
    }
  },

  metadata: {
    experienceId: 'ensueno-curinanco',
    destination: 'valdi',
    venue: 'Curiñanco'
  }
}

/**
 * PRICING-POLICY-1A — Approved accommodation pricing policy (NOT YET ACTIVE)
 *
 * Operator-confirmed commercial policy for the cabins at this property.
 * Amounts are CLP per cabin per occupied night. Checkout is excluded.
 *
 * This is a named export so it is inert with respect to runtime behavior:
 *
 *   - The company configuration loader reads this file and consumes
 *     `module.default` only
 *     (experience/source/filesystem.configuration.source.js:98-99), so a
 *     named export is never inspected by the loader.
 *   - The booking provisioner is not wired to this declaration in this slice,
 *     so nothing registers, seeds, or prices from it yet.
 *   - Active behavior is therefore unchanged: the legacy fields in the default
 *     export (experiences[].pricePerNight and
 *     capabilities.booking.configuration.basePricePerNight /
 *     pricePerNightFourGuests / additionalGuestPerNight) are intentionally left
 *     in place. Their consumers are updated in the activation slice, not here.
 *
 *   TEMPORARY COEXISTENCE: while this declaration is inactive, the legacy
 *   default-export fields above are the only ones the runtime can observe, and
 *   they still carry the pre-policy figures. The two must not be read as one
 *   source of truth; the legacy fields are scheduled for removal in the
 *   activation slice.
 *
 * The reusable engine lives in capabilities/pricing/ and contains no Ensueño
 * name, slug, or monetary value. Validation, tier coverage, and the fingerprint
 * are applied by that engine; this file is the product declaration only.
 */
export const ACCOMMODATION_PRICING_POLICY = Object.freeze({
  schemaVersion: 1,
  basis: 'accommodation_per_night',
  currency: 'CLP',
  checkInTime: '16:00',
  checkOutTime: '13:00',

  // Four guests sleep on the provided beds; the fifth and sixth bring a mattress.
  standardCapacity: 4,
  maxOccupancy: 6,

  tiers: [
    { id: 't1_2', fromGuests: 1, toGuests: 2 },
    { id: 't3_4', fromGuests: 3, toGuests: 4 }
  ],

  additionalGuests: {
    threshold: 4,
    ratePerGuestPerNight: 8000,
    condition: {
      fromGuest: 5,
      text: 'Los huéspedes 5 y 6 deben traer su propio colchón.'
    }
  },

  options: [
    {
      id: 'with_hot_tub',
      label: 'Con tinaja',
      inclusions: ['piscinas', 'saunas', 'tinaja', 'camas de cuarzo', 'acceso a áreas de camping'],
      rates: { t1_2: 90000, t3_4: 100000 }
    },
    {
      id: 'without_hot_tub',
      label: 'Sin tinaja',
      inclusions: ['piscinas', 'saunas', 'camas de cuarzo', 'acceso a áreas de camping'],
      rates: { t1_2: 80000, t3_4: 90000 }
    }
  ]
})