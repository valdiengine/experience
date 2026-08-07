/**
 * Platform Seed — Regions
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates initial region configurations for Chile.
 * Architecture ready for multi-country expansion.
 */

export const REGIONS_SEED = [
  {
    countryCode: 'CL',
    code: 'LR',
    name: 'Los Ríos',
    nativeName: 'Los Ríos',
    type: 'region',
    coordinates: { lat: -40.5728, lng: -72.3003 },
    metadata: {
      capital: 'Valdivia',
      area: '18422 km²',
    },
  },
  {
    countryCode: 'CL',
    code: 'MA',
    name: 'Magallanes',
    nativeName: 'Magallanes y la Antártica Chilena',
    type: 'region',
    coordinates: { lat: -52.5319, lng: -72.1173 },
    metadata: {
      capital: 'Punta Arenas',
      area: '13823 km²',
    },
  },
  {
    countryCode: 'CL',
    code: 'LL',
    name: 'Los Lagos',
    nativeName: 'Los Lagos',
    type: 'region',
    coordinates: { lat: -41.9198, lng: -73.5794 },
    metadata: {
      capital: 'Puerto Montt',
      area: '48583 km²',
    },
  },
  {
    countryCode: 'CL',
    code: 'AY',
    name: 'Aysén',
    nativeName: 'Aysén del General Carlos Ibáñez del Campo',
    type: 'region',
    coordinates: { lat: -46.1389, lng: -72.0671 },
    metadata: {
      capital: 'Coyhaique',
      area: '108975 km²',
    },
  },
]

export const FUTURE_REGIONS_BY_COUNTRY = {
  AR: [
    { code: 'BA', name: 'Buenos Aires', type: 'province' },
    { code: 'CO', name: 'Córdoba', type: 'province' },
    { code: 'SF', name: 'Santa Fe', type: 'province' },
  ],
  PE: [
    { code: 'LI', name: 'Lima', type: 'region' },
    { code: 'CU', name: 'Cusco', type: 'region' },
    { code: 'AR', name: 'Arequipa', type: 'region' },
  ],
}

export default REGIONS_SEED
