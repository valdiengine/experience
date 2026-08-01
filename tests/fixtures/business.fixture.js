/**
 * Business fixtures (P13.5.7) — deterministic inputs for the business capability.
 */

export function createBusinessData(overrides = {}) {
  return {
    tenantId: 'commercial',
    destinationId: 'dest-mendoza',
    name: 'Bodega Test',
    category: 'winery',
    subcategory: 'boutique',
    description: 'Test winery for capability tests',
    contactEmail: 'bodega@test.example',
    contactPhone: '+5492611234567',
    website: 'https://bodega.test.example',
    city: 'Mendoza',
    timezone: 'America/Argentina/Mendoza',
    language: 'es',
    currency: 'ARS',
    ...overrides,
  }
}

export default createBusinessData
