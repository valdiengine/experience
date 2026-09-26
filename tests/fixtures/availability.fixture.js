/**
 * Availability fixtures (P13.5.7) — deterministic dates + window/day inputs.
 */
import { AvailabilityCalendar } from '../../capabilities/availability/availability.calendar.js'

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
 * Per-night availability rows for a check-in/check-out reservation span,
 * using the same exclusive-check-out expansion as the reservation repository.
 * Each row receives a deterministic id, suitable for
 * InMemoryRepositoryAdapter.seed('availability', rows).
 */
export function createAvailabilityNightsData(accommodationId, checkIn, checkOut, overrides = {}) {
  const end = new Date(checkOut)
  end.setDate(end.getDate() - 1)
  const nights = AvailabilityCalendar.expandRange(checkIn, end.toISOString().split('T')[0])
  return nights.map((date) =>
    createAvailabilityDayData(accommodationId, date, {
      id: `avail-${accommodationId}-${date}`,
      ...overrides,
    })
  )
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
