/**
 * Reservation fixtures (P13.5.7) — deterministic inputs for
 * ReservationManager.createRequest(data, identity).
 */
import { dateOffset } from './availability.fixture.js'

export function createReservationData(overrides = {}) {
  return {
    tenantId: 'commercial',
    businessId: 'biz-test',
    accommodationId: 'acc-test',
    visitorId: 'visitor-test',
    resourceId: 'unit-1',
    customer: {
      name: 'Ana Test',
      email: 'ana@test.example',
      phone: '+5492615555555',
      channelPreference: 'email',
    },
    dates: {
      checkIn: dateOffset(1),
      checkOut: dateOffset(3),
    },
    guests: 2,
    source: 'direct',
    currency: 'ARS',
    ...overrides,
  }
}

export default createReservationData
