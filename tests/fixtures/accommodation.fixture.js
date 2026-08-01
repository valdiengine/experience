/**
 * Accommodation fixtures (P13.5.7) — deterministic inputs for
 * BusinessAccommodationManager.createAccommodation(businessId, data, identity).
 */

export function createAccommodationData(overrides = {}) {
  return {
    name: 'Suite Principal',
    type: 'suite',
    capacity: 2,
    basePrice: 120,
    pricePerNight: 120,
    maxGuests: 2,
    currency: 'ARS',
    amenities: ['wifi', 'parking'],
    description: 'Test suite',
    ...overrides,
  }
}

export default createAccommodationData
