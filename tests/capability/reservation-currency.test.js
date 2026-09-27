/**
 * ENSUENO-BOOKING-CURRENCY-1 — ReservationManager.createRequest currency propagation
 *
 * Focused regression for the certified public reservation currency defect:
 *
 *   BookingAdapter resolves the company target currency (CLP) and passes
 *   `data.currency`; ReservationManager.createRequest must preserve it on the
 *   reservation entity so the repository persists it instead of applying its
 *   generic `r.currency || 'USD'` fallback.
 *
 * Scope:
 *   - input currency 'CLP'  -> created reservation entity currency 'CLP'
 *   - omitted currency      -> entity currency is null (no global CLP forcing;
 *                              the repository 'USD' fallback stays untouched)
 *   - explicit null currency -> entity currency is null (not coerced to CLP)
 *
 * This suite does NOT touch availability/date semantics, the repository
 * default, migrations, or Ensueño-specific code.
 */
import { BaseCapabilityTest, runIfMain } from './capability.base.test.js'
import { createAvailabilityNightsData, dateOffset } from '../fixtures/availability.fixture.js'
import { createReservationData } from '../fixtures/reservation.fixture.js'
import { storeRows } from './capability.assertions.js'
import { InMemoryRepositoryAdapter } from './capability.mock.repositories.js'

const ACC_CURRENCY = 'acc-reservation-currency'

class ReservationCurrencyTest extends BaseCapabilityTest {
  constructor() {
    super('reservation-currency')
  }

  async runScenario(bundle) {
    InMemoryRepositoryAdapter.seed('accommodation', [
      { id: ACC_CURRENCY, tenantId: bundle.tenant.id, name: 'Reservation Currency', deletedAt: null },
    ])
    InMemoryRepositoryAdapter.seed('availability', createAvailabilityNightsData(
      ACC_CURRENCY,
      dateOffset(1),
      dateOffset(3),
      { inventory: 5, capacity: 5, available: 5, reservedCount: 0 },
    ))

    const manager = bundle.capability('reservation').manager
    const identity = bundle.identity
    const row = (reservationId) => storeRows(bundle, 'reservation').find((r) => r.id === reservationId)

    // 1. Currency propagates from request data to the created reservation entity.
    const withCurrency = await manager.createRequest(
      createReservationData({
        id: 'res-currency-clp',
        accommodationId: ACC_CURRENCY,
        currency: 'CLP',
      }),
      identity,
    )
    this.check('currency:created',
      withCurrency?.success === true,
      `createRequest with currency 'CLP' succeeded (success=${withCurrency?.success})`)
    this.check('currency:propagated',
      row('res-currency-clp')?.currency === 'CLP',
      `persisted reservation currency=${JSON.stringify(row('res-currency-clp')?.currency)} expected 'CLP'`)

    // 2. Omission retains the existing optional/fallback behavior (no CLP forcing).
    const withoutCurrency = await manager.createRequest(
      createReservationData({
        id: 'res-currency-omitted',
        accommodationId: ACC_CURRENCY,
        currency: undefined,
      }),
      identity,
    )
    this.check('currency:omitted-created',
      withoutCurrency?.success === true,
      `createRequest without currency succeeded (success=${withoutCurrency?.success})`)
    this.check('currency:omitted-no-forcing',
      (row('res-currency-omitted')?.currency ?? null) === null,
      `persisted reservation currency=${JSON.stringify(row('res-currency-omitted')?.currency)} expected null (not 'CLP')`)

    // 3. Explicit null currency is preserved as null (not coerced to CLP).
    const withNull = await manager.createRequest(
      createReservationData({
        id: 'res-currency-null',
        accommodationId: ACC_CURRENCY,
        currency: null,
      }),
      identity,
    )
    this.check('currency:null-created',
      withNull?.success === true,
      `createRequest with null currency succeeded (success=${withNull?.success})`)
    this.check('currency:null-not-clp',
      (row('res-currency-null')?.currency ?? null) === null,
      `persisted reservation currency=${JSON.stringify(row('res-currency-null')?.currency)} expected null (not 'CLP')`)
  }
}

const test = new ReservationCurrencyTest()
runIfMain(test, import.meta.url)

export const run = () => test.run()
export default run