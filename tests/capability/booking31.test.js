/**
 * BOOKING-3.1 ReservationLine Read Foundation Suite
 *
 * Tests the tenant-safe read capability for ReservationLines.
 *
 * Required capabilities:
 * 1. Read ReservationLines by tenantId + reservationId
 * 2. Tenant isolation enforced through parent Reservation
 * 3. Cross-tenant access returns empty
 * 4. Deterministic ordering
 * 5. Multi-line support
 *
 * BOOKING-3.1 does NOT redesign the public Reservation API.
 * The read foundation is internal for this milestone.
 */
import { BaseCapabilityTest, runIfMain } from './capability.base.test.js'
import { createReservationData } from '../fixtures/reservation.fixture.js'
import { InMemoryRepositoryAdapter } from './capability.mock.repositories.js'

const TEST_TENANT_ID = 'commercial'

function seedLineDirectly(store, line) {
  const table = store.get('reservation_lines') || new Map()
  table.set(line.id, line)
  store.set('reservation_lines', table)
}

function seedReservationDirectly(store, reservation) {
  store.get('reservation').set(reservation.id, reservation)
}

class Booking31Test extends BaseCapabilityTest {
  constructor() {
    super('booking31')
  }

  async runScenario(bundle) {
    const repo = bundle.repo
    const store = bundle.store

    const resA = { id: 'res-a', tenantId: TEST_TENANT_ID, accommodationId: 'acc-a', status: 'confirmed' }
    store.get('reservation').set(resA.id, resA)

    seedLineDirectly(store, {
      id: 'line-a1',
      reservationId: 'res-a',
      lineOrder: 1,
      targetType: 'accommodation',
      targetId: 'acc-a',
      temporal: { mode: 'DATE_RANGE', startDate: '2026-09-10', endDate: '2026-09-12' },
      quantity: 1,
      unitPrice: null,
      lineTotal: null,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    seedLineDirectly(store, {
      id: 'line-a2',
      reservationId: 'res-a',
      lineOrder: 2,
      targetType: 'accommodation',
      targetId: 'acc-a-2',
      temporal: { mode: 'DATE_RANGE', startDate: '2026-09-15', endDate: '2026-09-17' },
      quantity: 1,
      unitPrice: null,
      lineTotal: null,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const repoA = await repo('reservation')

    const linesA = await repoA.findLinesByReservationId(TEST_TENANT_ID, 'res-a')
    this.check('read:tenant-res-a', linesA.length === 2, `tenant reads res-a: got ${linesA.length} lines (expected 2)`)
    if (linesA.length > 0) {
      this.check('read:lines-have-correct-fields', linesA[0]?.id && linesA[0]?.targetType && linesA[0]?.temporal, 'lines have required fields')
      this.check('read:temporal-unchanged', JSON.stringify(linesA[0]?.temporal) === JSON.stringify({ mode: 'DATE_RANGE', startDate: '2026-09-10', endDate: '2026-09-12' }), 'DATE_RANGE temporal returned unchanged')
      this.check('read:quantity-unchanged', linesA[0]?.quantity === 1, 'quantity returned unchanged')
      this.check('read:nullable-pricing', linesA[0]?.unitPrice === null && linesA[0]?.lineTotal === null, 'unitPrice and lineTotal remain null')
      this.check('read:ordering-deterministic', linesA[0]?.lineOrder === 1 && linesA[1]?.lineOrder === 2, 'lines ordered by lineOrder ASC')
      this.check('no:applicationId-field', !linesA[0]?.hasOwnProperty('applicationId'), 'no applicationId field in lines')
    }

    const crossAccess = await repoA.findLinesByReservationId('tenant-fake', 'res-a')
    this.check('read:cross-tenant-denied', crossAccess.length === 0, 'wrong tenant cannot read reservation lines')

    const nonExistent = await repoA.findLinesByReservationId(TEST_TENANT_ID, 'res-nonexistent')
    this.check('read:non-existent-reservation', nonExistent.length === 0, 'non-existent reservation returns empty')

    const reservationNotInStore = await repoA.findLinesByReservationId('tenant-fake', 'res-nonexistent')
    this.check('read:neither-match', reservationNotInStore.length === 0, 'non-existent reservation for wrong tenant returns empty')
  }
}

const test = new Booking31Test()
runIfMain(test, import.meta.url)

export const run = () => test.run()
export default run
