/**
 * Platform Seed — Countries
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates initial country configurations for the platform.
 * Architecture ready for multi-country expansion.
 */

export const COUNTRIES_SEED = [
  {
    code: 'CL',
    name: 'Chile',
    nativeName: 'Chile',
    flagEmoji: '🇨🇱',
    currency: 'CLP',
    currencySymbol: '$',
    phoneCode: '+56',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    metadata: {
      continent: 'South America',
      capital: 'Santiago',
      population: 19107216,
    },
  },
]

export const FUTURE_COUNTRIES = [
  { code: 'AR', name: 'Argentina', currency: 'ARS', timezone: 'America/Buenos_Aires' },
  { code: 'PE', name: 'Peru', currency: 'PEN', timezone: 'America/Lima' },
  { code: 'CO', name: 'Colombia', currency: 'COP', timezone: 'America/Bogota' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', timezone: 'America/Mexico_City' },
]

export default COUNTRIES_SEED
