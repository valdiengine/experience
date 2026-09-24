/**
 * MVP-BOOKING-UI-1 — Phase B-UI Test
 *
 * Proves (without any DOM/browser runtime):
 *   1. renderBookingSection SSR composition (progressive-enhancement widget)
 *      keeps the committed booking-section contract and exposes the exact
 *      data-hooks the client IIFE depends on.
 *   2. The pure booking client state machine
 *      (web/business/booking/api/booking.api.js):
 *      - availability success -> state available -> traveler flow enabled
 *      - availability conflict -> recoverable error state (never a dead end)
 *      - reservation success -> confirmation ONLY from server response
 *      - 409 AVAILABILITY_CONFLICT -> recoverable error, never fabricated
 *      - traveler payload contains ONLY public fields (no internal IDs)
 *      - no client-side confirmation code generation
 *
 * Mirrors web/quote-form-submission.regression.test.js (pure API usage via
 * the repo's own ESM modules) and counts every assertion precisely.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderBookingSection } from './templates/component.templates.js'
import { createBookingAPI } from './business/booking/api/booking.api.js'
import { createBookingCapability } from './business/booking/booking.capability.js'

let assertionCount = 0
let failedCheckCount = 0

function ok(value, message) {
  assertionCount++
  try {
    assert.ok(value, message)
  } catch (err) {
    failedCheckCount++
    throw err
  }
}

function equal(actual, expected, message) {
  assertionCount++
  try {
    assert.equal(actual, expected, message)
  } catch (err) {
    failedCheckCount++
    throw err
  }
}

const IDENTITY = {
  applicationId: 'valdi.app/destino-ejemplo',
  domain: 'valdi.app',
  route: '/destino-ejemplo',
  company: 'destino-ejemplo',
  destination: 'valdi'
}

const BASE_BOOKING_CONFIG = {
  enabled: true,
  slug: 'destino-ejemplo'
}

const BASE_DATES = { checkIn: '2026-10-10', checkOut: '2026-10-12' }

const BASE_TRAVELER = {
  name: 'Viajera Ejemplo',
  email: 'viajera@example.com',
  phone: '+56912345678',
  guestCount: 2,
  notes: 'Ventana al mar'
}

test('renderBookingSection SSR composition', () => {
  const emptyHtml = renderBookingSection({})
  equal(emptyHtml, '', '{} renders an empty section')
  ok(!emptyHtml.includes('Reservar'), '{} output must not include Reservar')

  const disabledHtml = renderBookingSection({ booking: { enabled: false } })
  equal(disabledHtml, '', 'disabled booking renders an empty section')
  ok(!disabledHtml.includes('Reservar'), 'disabled output must not include Reservar')

  const noSlugHtml = renderBookingSection({ booking: { enabled: true } })
  equal(noSlugHtml, '', 'enabled booking without slug renders an empty section')

  const enabledHtml = renderBookingSection({
    booking: { enabled: true, slug: 'destino-ejemplo', title: 'Reserva tu viaje' }
  })
  ok(
    enabledHtml.includes('/api/v1/booking/companies/destino-ejemplo/availability'),
    'availability endpoint substring present (data-booking-availability)'
  )
  ok(enabledHtml.includes('Reservar'), 'booking action Reservar present')
  ok(enabledHtml.includes('Reserva tu viaje'), 'booking title rendered from viewModel')
  ok(enabledHtml.includes('data-booking-date-form'), 'date form hook present')
  ok(enabledHtml.includes('data-booking-state'), 'state region hook present')
  ok(enabledHtml.includes('data-booking-traveler-form'), 'traveler form hook present')
  ok(enabledHtml.includes('data-booking-confirmation'), 'confirmation region hook present')
  ok(enabledHtml.includes('data-booking-availability'), 'availability endpoint is a data attribute, not a link')
  ok(
    enabledHtml.includes('/api/v1/booking/companies/destino-ejemplo/reservations'),
    'reservation endpoint exposed as data attribute'
  )
})

test('availability success yields available state (traveler flow enabled)', async () => {
  const api = createBookingAPI()
  const result = await api.handleAvailability({
    ...IDENTITY,
    slug: 'destino-ejemplo',
    dates: BASE_DATES,
    configuration: { ...BASE_BOOKING_CONFIG, available: true, price: 120000, currency: 'CLP', capacity: 5 }
  })
  equal(result.success, true, 'availability succeeds')
  equal(result.status, 200, 'availability status is 200')
  ok(result.data, 'availability data present')
  equal(result.data.state, 'available', 'state is available (traveler flow enabled)')
  equal(result.data.slug, 'destino-ejemplo', 'slug echoed')
  equal(result.data.price, 120000, 'server price used')
})

test('availability conflict is recoverable (no dead end)', async () => {
  const api = createBookingAPI()
  const result = await api.handleAvailability({
    ...IDENTITY,
    slug: 'destino-ejemplo',
    dates: BASE_DATES,
    configuration: { ...BASE_BOOKING_CONFIG, availabilityConflict: true }
  })
  equal(result.success, false, 'availability conflict fails')
  equal(result.status, 409, 'availability conflict status is 409')
  equal(result.recoverable, true, 'availability conflict is recoverable')
  equal(result.state, 'conflict', 'recoverable conflict state')
  equal(result.code, 'AVAILABILITY_CONFLICT', 'conflict code exposed for the widget')
})

test('availability unavailable keeps traveler flow hidden', async () => {
  const api = createBookingAPI()
  const result = await api.handleAvailability({
    ...IDENTITY,
    slug: 'destino-ejemplo',
    dates: BASE_DATES,
    configuration: { ...BASE_BOOKING_CONFIG, available: false }
  })
  equal(result.success, true, 'unavailable is still a successful query')
  ok(result.data, 'availability data present')
  equal(result.data.state, 'unavailable', 'state is unavailable')
  ok(result.data.state !== 'available', 'traveler flow must not be enabled')
})

test('reservation confirmation is taken from server response only', async () => {
  const serverConfirmation = 'CONF-SRV-7F3K9'
  const api = createBookingAPI()
  const result = await api.handleReservation({
    ...IDENTITY,
    slug: 'destino-ejemplo',
    dates: BASE_DATES,
    traveler: BASE_TRAVELER,
    configuration: { ...BASE_BOOKING_CONFIG, confirmationCode: serverConfirmation }
  })
  equal(result.success, true, 'reservation succeeds')
  ok(result.data, 'reservation data present')
  equal(result.data.confirmationCode, serverConfirmation, 'confirmationCode matches server payload exactly')
  equal(result.data.state, 'confirmed', 'state is confirmed')
  equal(result.status, 201, 'reservation status is 201')
})

test('reservation 409 conflict is recoverable and never fabricated', async () => {
  const api = createBookingAPI()
  const result = await api.handleReservation({
    ...IDENTITY,
    slug: 'destino-ejemplo',
    dates: BASE_DATES,
    traveler: BASE_TRAVELER,
    configuration: { ...BASE_BOOKING_CONFIG, reservationConflict: true }
  })
  equal(result.success, false, 'conflict reservation fails')
  equal(result.status, 409, 'conflict status is 409')
  equal(result.recoverable, true, 'conflict is recoverable')
  equal(result.state, 'conflict', 'recoverable conflict state')
  ok(!('confirmationCode' in result), 'no fabricated confirmation code')
  ok(!('data' in result) || !result.data, 'no fabricated success payload')
})

test('reservation input contains only public traveler fields and no internal IDs', async () => {
  const calls = []
  const api = createBookingAPI({
    capabilityFactory: (config) => {
      const inner = createBookingCapability({ configuration: config })
      return {
        isEnabled: () => inner.isEnabled(),
        queryAvailability(request, context) {
          calls.push({ op: 'availability', request, context })
          return inner.queryAvailability(request, context)
        },
        createReservation(request, context) {
          calls.push({ op: 'reservation', request, context })
          return inner.createReservation(request, context)
        }
      }
    }
  })

  await api.handleAvailability({
    ...IDENTITY,
    slug: 'destino-ejemplo',
    dates: BASE_DATES,
    configuration: { ...BASE_BOOKING_CONFIG, available: true }
  })

  const result = await api.handleReservation({
    ...IDENTITY,
    slug: 'destino-ejemplo',
    dates: BASE_DATES,
    traveler: BASE_TRAVELER,
    configuration: { ...BASE_BOOKING_CONFIG, confirmationCode: 'CONF-SRV-PUBLIC-1' }
  })

  equal(result.success, true, 'reservation succeeds')
  const reservationCall = calls.find((call) => call.op === 'reservation')
  ok(reservationCall, 'capability received a reservation request')

  const traveler = reservationCall.request.traveler
  ok(traveler, 'capability received the traveler object')
  const travelerKeys = Object.keys(traveler).sort()
  equal(
    travelerKeys.join(','),
    'email,guestCount,name,notes,phone',
    'traveler payload has ONLY public traveler fields'
  )

  const serialized = JSON.stringify(reservationCall.request) + JSON.stringify(reservationCall.context)
  ok(!serialized.includes('tenantId'), 'no tenantId sent')
  ok(!serialized.includes('businessId'), 'no businessId sent')
  ok(!serialized.includes('accommodationId'), 'no accommodationId sent')
  ok(!serialized.includes('destinationId'), 'no destinationId sent')
})

test('client never fabricates a confirmation code when server returns none', async () => {
  const api = createBookingAPI()
  const result = await api.handleReservation({
    ...IDENTITY,
    slug: 'destino-ejemplo',
    dates: BASE_DATES,
    traveler: BASE_TRAVELER,
    configuration: BASE_BOOKING_CONFIG
  })
  equal(result.success, false, 'reservation fails without a server confirmation')
  equal(result.status, 502, 'status is 502 (server did not return a confirmation)')
  ok(!('confirmationCode' in result), 'no fabricated confirmation code present')
  ok(result.error, 'error message present')
})

test('booking-ui-1 summary', () => {
  const passed = assertionCount - failedCheckCount
  console.log(`booking-ui-1: ${passed}/${assertionCount} passed`)
  equal(failedCheckCount, 0, 'all booking-ui-1 assertions passed')
})