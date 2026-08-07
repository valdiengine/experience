/**
 * Platform Seed — Languages
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates initial language configurations for the platform.
 */

export const LANGUAGES_SEED = [
  {
    code: 'es-CL',
    name: 'Spanish (Chile)',
    nativeName: 'Español (Chile)',
    rtl: false,
    isDefault: true,
    metadata: {
      region: 'Chile',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: {
        decimalSeparator: ',',
        thousandsSeparator: '.',
      },
    },
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    rtl: false,
    isDefault: false,
    metadata: {
      region: 'General',
    },
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    rtl: false,
    isDefault: false,
    metadata: {
      region: 'International',
    },
  },
]

export default LANGUAGES_SEED
