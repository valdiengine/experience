/**
 * TEST-ONLY child-process fixture for timezone coverage.
 *
 * Runs in an isolated process with TZ set before the process starts, because
 * in-process mutation of process.env.TZ is unreliable on Windows.
 *
 * Two operations, selected with FIXTURE_OP:
 *
 *   create (default)
 *     A real create through the real ReservationRepository and the real
 *     AvailabilityCapability, then the serialized line metadata is printed as
 *     JSON so the parent can transfer that exact record into a release running
 *     under a DIFFERENT zone. The transfer is of the serialized fixture record;
 *     no running process's timezone is ever changed.
 *
 *   legacy-release
 *     A record-less DATE_RANGE line is cancelled, so the legacy compatibility
 *     branch runs. This shows the legacy branch is preserved and, because it
 *     uses local-time arithmetic, that its output is zone-dependent: which is
 *     precisely why the persisted record exists.
 *
 * It never contacts a database: the fail-closed `pg` double is installed before
 * the repository is imported, and the mock adapter path is used, so no
 * transaction, no SQL and no connection is involved at all.
 *
 * Usage: node occupied-nights-tz-fixture.mjs
 * Output: a single line prefixed with __FIXTURE__ followed by JSON.
 */

import {
  installPgDouble,
  MockReservationAdapter,
  resetMockStore,
  seedAvailability,
  availabilityRows,
  createContext,
} from './reservation.repository.test-support.mjs'
import { AvailabilityCapability } from '../../../../availability/availability.capability.js'

installPgDouble()

const OP = process.env.FIXTURE_OP || 'create'
const START = process.env.FIXTURE_START || '2026-01-01'
const NIGHTS = Number(process.env.FIXTURE_NIGHTS || 3)
const TENANT = 'tenant-1'
const CABIN = 'cab-1'
const END = new Date(Date.parse(`${START}T00:00:00.000Z`) + NIGHTS * 86400000)
  .toISOString()
  .slice(0, 10)

const store = resetMockStore('availability', 'reservation_lines', 'reservations')
seedAvailability(store, {
  start: START,
  nights: NIGHTS,
  tenantId: TENANT,
  accommodationId: CABIN,
  inventory: 5,
  reservedCount: 0,
})

const { ReservationRepository } = await import('../reservation.repository.js')

const repo = new ReservationRepository(
  new MockReservationAdapter(),
  createContext(new AvailabilityCapability(), TENANT)
)
await repo.initialize()

// A window is a genuine DST transition when the UTC offset differs between the
// instant just before the window and the instant just after it.
const offsetBeforeStart = new Date(Date.parse(`${START}T00:00:00Z`) - 86400000).getTimezoneOffset()
const offsetAfterEnd = new Date(Date.parse(`${END}T00:00:00Z`) + 86400000).getTimezoneOffset()

const base = {
  op: OP,
  requestedTZ: process.env.TZ || null,
  effectiveZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  offsetBeforeStart,
  offsetAfterEnd,
  crossesOffsetChange: offsetBeforeStart !== offsetAfterEnd,
  window: { start: START, end: END, nights: NIGHTS },
  janOffsetMin: new Date('2026-01-15T12:00:00Z').getTimezoneOffset(),
  julOffsetMin: new Date('2026-07-15T12:00:00Z').getTimezoneOffset(),
}

let report

if (OP === 'create') {
  const { line } = await repo.createReservationWithLine(
    { id: 'res-tz', tenantId: TENANT, accommodationId: CABIN, status: 'pending', guestCount: 4 },
    {
      id: 'line-tz',
      targetType: 'accommodation',
      targetId: CABIN,
      quantity: 1,
      temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    }
  )

  // Round-trip through JSON, exactly as a JSONB column would, so the transferred
  // record is the serialized form and not a live object reference.
  const serializedMetadata = JSON.parse(JSON.stringify(line.metadata))

  report = {
    ...base,
    serializedMetadata,
    recordedDates: serializedMetadata.__occupiedNights?.dates ?? null,
    recordedQuantity: serializedMetadata.__occupiedNights?.quantity ?? null,
    lineQuantity: line.quantity,
    consumedDates: availabilityRows(store).map((r) => r.date),
    consumedReservedCounts: availabilityRows(store).map((r) => r.reservedCount),
  }
} else if (OP === 'legacy-release') {
  // Pre-seed a record-less line whose capacity is already reserved, exactly as a
  // row written before the record existed would look.
  for (const row of availabilityRows(store)) {
    store.get('availability').set(row.id, { ...row, reservedCount: 1, available: 4, status: 'available' })
  }
  store.get('reservation_lines').set('line-legacy', {
    id: 'line-legacy',
    reservationId: 'res-tz',
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity: 1,
    metadata: { note: 'written before the record existed' },
    releasedAt: null,
  })

  await repo.cancelReservationWithRelease({ id: 'res-tz', status: 'cancelled' }, TENANT)

  const rowsOut = availabilityRows(store)
  report = {
    ...base,
    decrementedDates: rowsOut.filter((r) => r.reservedCount === 0).map((r) => r.date),
    stillReservedDates: rowsOut.filter((r) => r.reservedCount > 0).map((r) => r.date),
    releasedCount: rowsOut.filter((r) => r.reservedCount === 0).length,
    seededDates: rowsOut.map((r) => r.date),
  }
} else {
  throw new Error(`unknown FIXTURE_OP ${OP}`)
}

console.log(`__FIXTURE__${JSON.stringify(report)}`)
