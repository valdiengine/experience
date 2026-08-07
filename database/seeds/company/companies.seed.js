/**
 * Company Seed — Companies
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates architecture example companies.
 * These are TEMPLATES/EXAMPLES, NOT real production records.
 */

export const COMPANIES_SEED = [
  {
    tenantSlug: 'valdi-platform',
    destinationSlug: 'valdivia',
    name: 'Albasie',
    slug: 'albasie',
    type: 'business',
    status: 'active',
    description: 'Empresa de servicios marítimos y transporte acuático. Arquitectura de ejemplo para categoría marina.',
    shortDescription: 'Servicios marítimos en Valdivia',
    contact: {
      email: 'contacto@albasie.example.com',
      phone: '+56 9 1234 5678',
      address: 'Costanera s/n, Valdivia',
    },
    location: {
      address: 'Costanera s/n',
      city: 'Valdivia',
      region: 'Los Ríos',
      country: 'CL',
      coordinates: { lat: -39.8142, lng: -73.2458 },
    },
    website: 'https://albasie.example.com',
    taxId: '12.345.678-9',
    employeeCount: '11-50',
    branding: {
      primaryColor: '#1565C0',
      secondaryColor: '#0D47A1',
    },
  },
  {
    tenantSlug: 'valdi-platform',
    destinationSlug: 'valdivia',
    name: 'Secnet',
    slug: 'secnet',
    type: 'business',
    status: 'active',
    description: 'Proveedor de servicios de telecomunicaciones y seguridad. Arquitectura de ejemplo para categorías telecomunicaciones y seguridad.',
    shortDescription: 'Tecnología y seguridad en el sur de Chile',
    contact: {
      email: 'info@secnet.example.com',
      phone: '+56 9 8765 4321',
      address: 'Av. Brasil 1234, Valdivia',
    },
    location: {
      address: 'Av. Brasil 1234',
      city: 'Valdivia',
      region: 'Los Ríos',
      country: 'CL',
      coordinates: { lat: -39.8199, lng: -73.2454 },
    },
    website: 'https://secnet.example.com',
    taxId: '98.765.432-1',
    employeeCount: '51-200',
    branding: {
      primaryColor: '#2E7D32',
      secondaryColor: '#1B5E20',
    },
  },
  {
    tenantSlug: 'valdi-platform',
    destinationSlug: 'valdivia',
    name: 'ESR Motos',
    slug: 'esr-motos',
    type: 'business',
    status: 'active',
    description: 'Concesionaria de motos y servicio técnico. Arquitectura de ejemplo para categoría automotriz.',
    shortDescription: 'Motos y servicios automáticos',
    contact: {
      email: 'ventas@esrmotos.example.com',
      phone: '+56 9 5555 1234',
      address: 'Av. García Reyes 567, Valdivia',
    },
    location: {
      address: 'Av. García Reyes 567',
      city: 'Valdivia',
      region: 'Los Ríos',
      country: 'CL',
      coordinates: { lat: -39.8220, lng: -73.2500 },
    },
    website: 'https://esrmotos.example.com',
    taxId: '11.222.333-4',
    employeeCount: '1-10',
    branding: {
      primaryColor: '#F57C00',
      secondaryColor: '#E65100',
    },
  },
  {
    tenantSlug: 'valdi-platform',
    destinationSlug: 'valdivia',
    name: 'Hospedaje Demo',
    slug: 'hospedaje-demo',
    type: 'business',
    status: 'active',
    description: 'Alojamiento de demostración para arquitectura de reservas. Este es un ejemplo, no un negocio real.',
    shortDescription: 'Demo de alojamiento turístico',
    contact: {
      email: 'demo@hospedaje.example.com',
      phone: '+56 9 9999 8888',
      address: 'Los Lingues 456, Punucura',
    },
    location: {
      address: 'Los Lingues 456, Punucura',
      city: 'Valdivia',
      region: 'Los Ríos',
      country: 'CL',
      coordinates: { lat: -39.8500, lng: -73.2000 },
    },
    website: 'https://hospedaje-demo.example.com',
    taxId: '55.666.777-8',
    employeeCount: '1-10',
    branding: {
      primaryColor: '#7B1FA2',
      secondaryColor: '#4A148C',
    },
    modules: ['reservations', 'availability', 'payments', 'reviews'],
  },
  {
    tenantSlug: 'valdi-platform',
    destinationSlug: 'natales',
    name: 'Hostal Patagonia Demo',
    slug: 'hostal-patagonia-demo',
    type: 'business',
    status: 'active',
    description: 'Hostal de demostración en Puerto Natales. Arquitectura de ejemplo para categoría alojamiento en Patagonia.',
    shortDescription: 'Demo de hostal en Puerto Natales',
    contact: {
      email: 'demo@hostalpatagonia.example.com',
      phone: '+56 9 7777 6666',
      address: 'Cañon 789, Puerto Natales',
    },
    location: {
      address: 'Cañon 789',
      city: 'Puerto Natales',
      region: 'Magallanes',
      country: 'CL',
      coordinates: { lat: -51.7327, lng: -72.4913 },
    },
    taxId: '44.555.666-7',
    employeeCount: '1-10',
    branding: {
      primaryColor: '#0277BD',
      secondaryColor: '#01579B',
    },
    modules: ['reservations', 'availability', 'reviews'],
  },
  {
    tenantSlug: 'valdi-platform',
    destinationSlug: 'chiloe',
    name: 'Café Cultural Demo',
    slug: 'cafe-cultural-demo',
    type: 'business',
    status: 'active',
    description: 'Café cultural de demostración en Chiloé. Arquitectura de ejemplo para categoría gastronomía.',
    shortDescription: 'Demo de gastronomía en Chiloé',
    contact: {
      email: 'demo@cafecultural.example.com',
      phone: '+56 9 4444 3333',
      address: 'Plaza 123, Castro',
    },
    location: {
      address: 'Plaza 123',
      city: 'Castro',
      region: 'Los Lagos',
      country: 'CL',
      coordinates: { lat: -42.4806, lng: -73.7628 },
    },
    taxId: '33.444.555-6',
    employeeCount: '1-10',
    branding: {
      primaryColor: '#6A1B9A',
      secondaryColor: '#4A148C',
    },
    modules: ['reservations', 'reviews'],
  },
]

export default COMPANIES_SEED
