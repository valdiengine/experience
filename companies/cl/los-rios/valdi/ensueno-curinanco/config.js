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