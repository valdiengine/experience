/**
 * BOOKING-4.4: Product Reservation Atomicity Bridge — Mock Path Parity Suite
 *
 * Verifies that the in-memory/mock createReservationWithLine path now enforces
 * the same atomic semantics as the certified PostgreSQL path:
 *   1. Sequential exhaustion — reservations consume capacity until inventory is
 *      exhausted, then AvailabilityConflictError.
 *   2. Concurrent origin — simultaneous createRequest calls on a 1-unit night
 *      yield exactly one success (synchronous consume = no interleaving).
 *   3. Multi-night rollback — a conflict on a later night leaves earlier nights
 *      completely untouched (no partial mutation, no reservation, no line).
 *   4. Line persistence — reservation_lines rows are stored and readable via
 *      findLinesByReservationId.
 *   5. Release idempotency — cancelReservationWithRelease releases capacity on
 *      the first call and is a no-op on subsequent calls; rebooking works.
 *   6. Tenant isolation — foreign-tenant availability rows grant no capacity.
 *   7. Missing-row strict conflict — nights without an authoritative
 *      availability row fail closed with AvailabilityConflictError (PostgreSQL
 *      parity); no reservation, no line, no capacity side effect; a seeded row
 *      then succeeds.
 *   8. PG structural guard — the certified PostgreSQL transaction remains the
 *      strict path (conditional UPDATE + 'No capacity for <date>').
 */
import { readFileSync } from 'node:fs'
import { BaseCapabilityTest, runIfMain } from '../capability/capability.base.test.js'
import { createAvailabilityDayData } from '../fixtures/availability.fixture.js'
import { createReservationData } from '../fixtures/reservation.fixture.js'
import { AvailabilityConflictError } from '../../capabilities/availability/availability.errors.js'
import { storeRows } from '../capability/capability.assertions.js'
import { InMemoryRepositoryAdapter } from './capability.mock.repositories.js'

const TEST_TENANT_ID = 'commercial'
const ACC_SEQ = 'acc-booking44-seq'
const ACC_CONC = 'acc-booking44-concurrent'
const ACC_MN = 'acc-booking44-multi-night'
const ACC_REL = 'acc-booking44-release'
const ACC_ISO = 'acc-booking44-isolation'
const ACC_MISSING = 'acc-booking44-missing'

const NIGHT_SEQ = '2026-11-15'
const NIGHT_CONC = '2026-11-16'
const MN_START = '2026-11-20'
const MN_END = '2026-11-22'
const NIGHT_REL = '2026-11-25'

function seedAvailability(rows) {
  InMemoryRepositoryAdapter.seed('availability', rows)
}

function availRow(bundle, accommodationId, date) {
  return storeRows(bundle, 'availability').find(
    (r) => r.accommodationId === accommodationId && r.date === date
  )
}

function reservationRows(bundle, accommodationId) {
  return storeRows(bundle, 'reservation').filter((r) => r.accommodationId === accommodationId)
}

function lineRows(bundle, reservationId) {
  return storeRows(bundle, 'reservation_lines').filter((l) => l.reservationId === reservationId)
}

async function expectConflict(promise) {
  try {
    await promise
    return { pass: false, detail: 'expected AvailabilityConflictError but the call succeeded' }
  } catch (err) {
    return {
      pass: err instanceof AvailabilityConflictError,
      detail: err instanceof AvailabilityConflictError
        ? `AvailabilityConflictError: ${err.message}`
        : `got ${err.constructor?.name}: ${err.message}`,
    }
  }
}

class Booking44Test extends BaseCapabilityTest {
  constructor() {
    super('booking44')
  }

  async runScenario(bundle) {
    InMemoryRepositoryAdapter.seed('accommodation', [
      { id: ACC_SEQ, tenantId: TEST_TENANT_ID, name: 'Sequential Capacity', deletedAt: null },
      { id: ACC_CONC, tenantId: TEST_TENANT_ID, name: 'Concurrent Capacity', deletedAt: null },
      { id: ACC_MN, tenantId: TEST_TENANT_ID, name: 'Multi-Night Rollback', deletedAt: null },
      { id: ACC_REL, tenantId: TEST_TENANT_ID, name: 'Release Rebooking', deletedAt: null },
      { id: ACC_ISO, tenantId: TEST_TENANT_ID, name: 'Tenant Isolation', deletedAt: null },
      { id: ACC_MISSING, tenantId: TEST_TENANT_ID, name: 'Missing Row', deletedAt: null },
    ])

    const manager = bundle.capability('reservation').manager
    const repo = await bundle.repo('reservation')
    const identity = bundle.identity
    const request = (accId, name, overrides = {}) =>
      manager.createRequest(createReservationData({
        accommodationId: accId,
        dates: {
          checkIn: NIGHT_SEQ,
          checkOut: '2026-11-16',
        },
        customer: {
          name: `Viajera ${name}`,
          email: `${name}@test.example`,
          phone: '+5492615555555',
          channelPreference: 'email',
        },
        ...overrides,
      }), identity)

    // ── TEST 1: Sequential exhaustion (inventory=2, one night) ──
    seedAvailability([createAvailabilityDayData(ACC_SEQ, NIGHT_SEQ, {
      id: 'avail-booking44-seq',
      inventory: 2,
      reservedCount: 0,
      available: 2,
      status: 'available',
    })])

    const seq1 = await request(ACC_SEQ, 'secuencial-1')
    await request(ACC_SEQ, 'secuencial-2')
    const seq3 = await expectConflict(request(ACC_SEQ, 'secuencial-3'))

    this.check('sequential:first-and-second-succeed',
      seq1?.success === true,
      `first reservation created (success=${seq1?.success})`)
    const seqLevel = availRow(bundle, ACC_SEQ, NIGHT_SEQ)
    this.check('sequential:reserved-count-equals-inventory-after-two',
      seqLevel?.reservedCount === 2 && seqLevel?.status === 'reserved',
      `reservedCount=2 status='reserved' (got reservedCount=${seqLevel?.reservedCount} status=${seqLevel?.status})`)
    this.check('sequential:third-conflict',
      seq3.pass,
      seq3.detail)
    this.check('sequential:exactly-two-reservation-rows',
      reservationRows(bundle, ACC_SEQ).length === 2,
      `got ${reservationRows(bundle, ACC_SEQ).length} reservation rows`)

    // ── TEST 2: Concurrent origin (inventory=1, single night) ──
    seedAvailability([createAvailabilityDayData(ACC_CONC, NIGHT_CONC, {
      id: 'avail-booking44-conc',
      inventory: 1,
      reservedCount: 0,
      available: 1,
      status: 'available',
    })])

    const concurrent = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => request(ACC_CONC, `concurrente-${i}`, {
        dates: { checkIn: NIGHT_CONC, checkOut: '2026-11-17' },
      }))
    )
    const fulfilled = concurrent.filter((r) => r.status === 'fulfilled')
    const conflicts = concurrent.filter(
      (r) => r.status === 'rejected' && r.reason instanceof AvailabilityConflictError
    )
    this.check('concurrent:exactly-one-success',
      fulfilled.length === 1,
      `got ${fulfilled.length} successes (expected 1)`)
    this.check('concurrent:all-others-conflict',
      conflicts.length === 7,
      `got ${conflicts.length} AvailabilityConflictErrors (expected 7)`)
    const concLevel = availRow(bundle, ACC_CONC, NIGHT_CONC)
    this.check('concurrent:consumed-exactly-one-unit',
      concLevel?.reservedCount === 1 && concLevel?.status === 'reserved',
      `reservedCount=1 status='reserved' (got reservedCount=${concLevel?.reservedCount} status=${concLevel?.status})`)
    this.check('concurrent:single-reservation-row',
      reservationRows(bundle, ACC_CONC).length === 1,
      `got ${reservationRows(bundle, ACC_CONC).length} reservation rows`)

    // ── TEST 3: Multi-night rollback (night 1 available, night 2 exhausted) ──
    seedAvailability([
      createAvailabilityDayData(ACC_MN, '2026-11-20', {
        id: 'avail-booking44-mn-1',
        inventory: 5,
        reservedCount: 0,
        available: 5,
        status: 'available',
      }),
      createAvailabilityDayData(ACC_MN, '2026-11-21', {
        id: 'avail-booking44-mn-2',
        inventory: 5,
        reservedCount: 5,
        available: 0,
        status: 'reserved',
      }),
    ])

    const mnBefore = availRow(bundle, ACC_MN, '2026-11-20')
    const mnBeforeUpdatedAt = mnBefore?.updatedAt
    const mnConflict = await expectConflict(request(ACC_MN, 'multi-noche', {
      dates: { checkIn: MN_START, checkOut: MN_END },
    }))
    const mn1After = availRow(bundle, ACC_MN, '2026-11-20')
    this.check('multi-night:second-night-conflict-throws',
      mnConflict.pass,
      mnConflict.detail)
    this.check('multi-night:first-night-untouched',
      mn1After?.reservedCount === 0 &&
        mn1After?.status === 'available' &&
        mn1After?.updatedAt === mnBeforeUpdatedAt,
      `night1 reservedCount=${mn1After?.reservedCount} status=${mn1After?.status} updatedAtChanged=${mn1After?.updatedAt !== mnBeforeUpdatedAt}`)
    this.check('multi-night:second-night-untouched',
      availRow(bundle, ACC_MN, '2026-11-21')?.reservedCount === 5,
      `night2 reservedCount=${availRow(bundle, ACC_MN, '2026-11-21')?.reservedCount}`)
    this.check('multi-night:no-reservation-row',
      reservationRows(bundle, ACC_MN).length === 0,
      `got ${reservationRows(bundle, ACC_MN).length} reservation rows`)

    // ── TEST 4: Line persistence + findLinesByReservationId ──
    seedAvailability([createAvailabilityDayData(ACC_REL, NIGHT_REL, {
      id: 'avail-booking44-rel',
      inventory: 3,
      reservedCount: 0,
      available: 3,
      status: 'available',
    })])
    const rel = await request(ACC_REL, 'release-1', {
      dates: { checkIn: NIGHT_REL, checkOut: '2026-11-26' },
    })
    const relLines = await repo.findLinesByReservationId(TEST_TENANT_ID, rel.reservationId)
    this.check('line-persistence:stored-and-readable',
      relLines.length === 1 &&
        relLines[0].targetType === 'accommodation' &&
        relLines[0].targetId === ACC_REL &&
        relLines[0].quantity === 1 &&
        relLines[0].temporal?.mode === 'DATE_RANGE' &&
        relLines[0].releasedAt === null,
      `lines=${JSON.stringify(relLines.map(l => ({ target: l.targetId, quantity: l.quantity, mode: l.temporal?.mode, releasedAt: l.releasedAt })))}`)

    // ── TEST 5: Release idempotency + rebooking ──
    await repo.cancelReservationWithRelease({ id: rel.reservationId, tenantId: TEST_TENANT_ID }, TEST_TENANT_ID)
    const afterFirstRelease = await repo.findLinesByReservationId(TEST_TENANT_ID, rel.reservationId)
    const releasedAvail = availRow(bundle, ACC_REL, NIGHT_REL)
    this.check('release:first-call-decrements',
      releasedAvail?.reservedCount === 0 &&
        releasedAvail?.status === 'available' &&
        afterFirstRelease[0]?.releasedAt !== null &&
        lineRows(bundle, rel.reservationId)[0]?.releasedAt !== null &&
        lineRows(bundle, rel.reservationId).length === 1,
      `reservedCount=${releasedAvail?.reservedCount} status=${releasedAvail?.status} releasedAt=${lineRows(bundle, rel.reservationId)[0]?.releasedAt}`)

    await repo.cancelReservationWithRelease({ id: rel.reservationId, tenantId: TEST_TENANT_ID }, TEST_TENANT_ID)
    const afterSecondRelease = availRow(bundle, ACC_REL, NIGHT_REL)
    this.check('release:second-call-noop',
      afterSecondRelease?.reservedCount === 0 &&
        afterSecondRelease?.status === 'available',
      `reservedCount=${afterSecondRelease?.reservedCount} status=${afterSecondRelease?.status}`)

    const rebook = await request(ACC_REL, 'rebooking', {
      dates: { checkIn: NIGHT_REL, checkOut: '2026-11-26' },
    })
    const afterRebook = availRow(bundle, ACC_REL, NIGHT_REL)
    this.check('release:rebooking-succeeds-after-release',
      rebook?.success === true &&
        afterRebook?.reservedCount === 1 &&
        lineRows(bundle, rel.reservationId).length === 1 &&
        lineRows(bundle, rebook.reservationId).length === 1,
      `rebook success=${rebook?.success} reservedCount=${afterRebook?.reservedCount} oldLines=${lineRows(bundle, rel.reservationId).length} newLines=${lineRows(bundle, rebook.reservationId).length}`)

    // ── TEST 6: Tenant isolation (foreign-tenant row grants NO capacity) ──
    seedAvailability([createAvailabilityDayData(ACC_ISO, '2026-11-30', {
      id: 'avail-booking44-iso',
      tenantId: 'acme-cabins',
      inventory: 1,
      reservedCount: 0,
      available: 1,
      status: 'available',
    })])

    const iso = await expectConflict(request(ACC_ISO, 'aislamiento', {
      dates: { checkIn: '2026-11-30', checkOut: '2026-12-01' },
    }))
    const isoRow = availRow(bundle, ACC_ISO, '2026-11-30')
    this.check('isolation:foreign-row-grants-no-capacity',
      iso.pass &&
        isoRow?.tenantId === 'acme-cabins' &&
        isoRow?.reservedCount === 0 &&
        isoRow?.status === 'available' &&
        reservationRows(bundle, ACC_ISO).length === 0,
      `conflict=${iso.pass} tenantId=${isoRow?.tenantId} reservedCount=${isoRow?.reservedCount} status=${isoRow?.status} reservationRows=${reservationRows(bundle, ACC_ISO).length} (${iso.detail})`)

    const isoStore = bundle.store.get('availability')
    for (const key of Array.from(isoStore.keys())) {
      if (isoStore.get(key)?.id === 'avail-booking44-iso') isoStore.delete(key)
    }

    // ── TEST 7: Missing-row strict conflict (PostgreSQL parity) ──
    const missing = await expectConflict(request(ACC_MISSING, 'sin-fila', {
      dates: { checkIn: '2026-12-05', checkOut: '2026-12-06' },
    }))
    this.check('missing-row:conflict-thrown',
      missing.pass,
      missing.detail)
    this.check('missing-row:no-reservation-persisted',
      reservationRows(bundle, ACC_MISSING).length === 0,
      `got ${reservationRows(bundle, ACC_MISSING).length} reservation rows`)
    this.check('missing-row:no-line-persisted',
      storeRows(bundle, 'reservation_lines').filter((l) => l.targetId === ACC_MISSING).length === 0,
      'no reservation line persisted for missing-row accommodation')
    this.check('missing-row:no-capacity-side-effect',
      storeRows(bundle, 'availability').filter((r) => r.accommodationId === ACC_MISSING).length === 0,
      'no availability row created or mutated for missing-row accommodation')

    seedAvailability([createAvailabilityDayData(ACC_MISSING, '2026-12-05', {
      id: 'avail-booking44-missing',
      inventory: 2,
      reservedCount: 0,
      available: 2,
      status: 'available',
    })])
    const seeded = await request(ACC_MISSING, 'con-fila', {
      dates: { checkIn: '2026-12-05', checkOut: '2026-12-06' },
    })
    const seededRow = availRow(bundle, ACC_MISSING, '2026-12-05')
    this.check('missing-row:seeded-success-after-conflict',
      seeded?.success === true && seededRow?.reservedCount === 1,
      `success=${seeded?.success} reservedCount=${seededRow?.reservedCount}`)

    // ── TEST 8: PG structural guard (certified path untouched) ──
    const source = readFileSync(
      new URL('../../capabilities/persistence/repositories/reservation/reservation.repository.js', import.meta.url),
      'utf8'
    )
    this.check('pg-guard:conditional-update-intact',
      source.includes('reserved_count = reserved_count + $1') &&
        source.includes("AND reserved_count + $1 <= inventory") &&
        source.includes('No capacity for'),
      'PostgreSQL atomic conditional UPDATE + conflict error present in source')
    this.check('pg-guard:mock-sync-consume-wired',
      source.includes('#consumeMockAvailability(') &&
        source.includes('#releaseMockCapacity(') &&
        source.includes('#persistMockLine('),
      'mock atomic consume/release/persist helpers wired in source')
  }
}

const test = new Booking44Test()
runIfMain(test, import.meta.url)