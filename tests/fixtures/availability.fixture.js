/**
 * Availability fixtures (P13.5.7) — deterministic dates + window/day inputs.
 */

export function dateOffset(days) {
  const d = new Date(Date.now() + days * 86400000)
  return d.toISOString().split('T')[0]
}

/**
 * Day-level availability record for createDay(data, identity).
 */
export function createAvailabilityDayData(accommodationId, date, overrides = {}) {
  return {
    tenantId: 'commercial',
    accommodationId,
    date,
    status: 'available',
    capacity: 2,
    available: 2,
    price: 120,
    currency: 'ARS',
    ...overrides,
  }
}

/**
 * Date-window record for createWindow(data, identity).
 */
export function createAvailabilityWindowData(accommodationId, overrides = {}) {
  return {
    tenantId: 'commercial',
    accommodationId,
    startDate: dateOffset(7),
    endDate: dateOffset(14),
    status: 'available',
    ...overrides,
  }
}

export default createAvailabilityDayData
