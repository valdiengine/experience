/**
 * ZERO-SAFE-PERSISTENCE-1 — explicit numeric zero survives reservation
 * persistence mapping.
 *
 * The physical defect: the reservation repository used truthy fallbacks on the
 * monetary columns —
 *   r.totalPrice || null
 *   lineData.unitPrice || null
 *   lineData.lineTotal || null
 * so a legitimate numeric `0` (BookingAdapter deliberately permits zero pricing)
 * was persisted as SQL NULL instead of 0.
 *
 * This regression proves, on BOTH persistence paths:
 *   - the PostgreSQL INSERT binds 0 for total_price / unit_price / line_total
 *     (asserted against the exact bound parameters, via the fail-closed pg
 *     double — no physical database is contacted), and
 *   - the in-memory fallback store keeps those zeros as numeric 0.
 * It also proves the nullish semantics did NOT change behaviour for explicitly
 * absent values: a missing amount still binds NULL.
 *
 * Run: node capabilities/persistence/repositories/reservation/reservation.repository.zero-safe.test.js
 */
import { test } from 'node:test'
import assert from 'node:assert'
import { AvailabilityCapability } from '../../../availability/availability.capability.js'
import {
  installPgDouble,
  assertPgIsDoubled,
  createClientDouble,
  installClient,
  uninstallClient,
  PostgresAdapter,
  MockReservationAdapter,
  resetMockStore,
  seedAvailability,
  createContext,
  CREATE_DEFAULTS,
  REPOSITORY_URL,
} from './test-support/reservation.repository.test-support.mjs'

installPgDouble()
const { ReservationRepository } = await import(REPOSITORY_URL)

const TENANT = 'tenant-ensueno-1'
const CABIN = 'acc-ensueno'
const RES_ID = 'res-zero-1'
const START = '2026-12-15'
const END = '2026-12-17'
const NIGHTS = 2

const dateRangeLine = (overrides = {}) => ({
  id: 'line-zero-1',
  targetType: 'accommodation',
  targetId: CABIN,
  quantity: 1,
  temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
  ...overrides,
})

const reservationPayload = (overrides = {}) => ({
  id: RES_ID,
  tenantId: TENANT,
  accommodationId: CABIN,
  status: 'requested',
  ...overrides,
})

async function pgRepo(provider = new AvailabilityCapability()) {
  const repo = new ReservationRepository(new PostgresAdapter(), createContext(provider, TENANT))
  await repo.initialize()
  return repo
}

test('PostgreSQL INSERT binds numeric zero for total_price, unit_price and line_total', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.createReservationWithLine(
      reservationPayload({ totalPrice: 0, currency: 'CLP' }),
      dateRangeLine({ unitPrice: 0, lineTotal: 0 })
    )

    const insertReservation = client.callsOf('insertReservation').at(-1)
    const insertLine = client.callsOf('insertLine').at(-1)
    assert.ok(insertReservation, 'a reservation INSERT must have been issued')
    assert.ok(insertLine, 'a line INSERT must have been issued')

    // total_price ($21), currency ($22); unit_price ($8), line_total ($9).
    assert.equal(insertReservation.params[20], 0, 'total_price must bind numeric 0, not null')
    assert.equal(insertReservation.params[21], 'CLP', 'currency must bind CLP')
    assert.equal(insertLine.params[7], 0, 'unit_price must bind numeric 0, not null')
    assert.equal(insertLine.params[8], 0, 'line_total must bind numeric 0, not null')
  } finally {
    uninstallClient()
  }
})

test('explicitly absent amounts still bind NULL — nullish semantics preserved', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.createReservationWithLine(reservationPayload({ currency: 'USD' }), dateRangeLine())

    const insertReservation = client.callsOf('insertReservation').at(-1)
    const insertLine = client.callsOf('insertLine').at(-1)
    assert.equal(insertReservation.params[20], null, 'absent total_price must still bind null')
    assert.equal(insertLine.params[7], null, 'absent unit_price must still bind null')
    assert.equal(insertLine.params[8], null, 'absent line_total must still bind null')
  } finally {
    uninstallClient()
  }
})

test('the in-memory fallback keeps explicit zeros as numeric 0', async () => {
  const s = resetMockStore('availability', 'reservation_lines', 'reservations')
  seedAvailability(s, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 0 })
  const repo = new ReservationRepository(new MockReservationAdapter(), createContext(new AvailabilityCapability(), TENANT))
  await repo.initialize()

  const { reservation, line } = await repo.createReservationWithLine(
    reservationPayload({ totalPrice: 0, currency: 'CLP' }),
    dateRangeLine({ unitPrice: 0, lineTotal: 0 })
  )
  assert.equal(reservation.totalPrice, 0, 'reservation.totalPrice must survive as numeric 0')
  assert.equal(line.unitPrice, 0, 'line.unitPrice must survive as numeric 0')
  assert.equal(line.lineTotal, 0, 'line.lineTotal must survive as numeric 0')
})

await test('bare specifier "pg" resolves to the fail-closed double — no physical database was contacted', async () => {
  assert.equal(await assertPgIsDoubled(), true, 'pg double must be installed')
})