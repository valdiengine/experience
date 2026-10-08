import { test } from 'node:test'
import assert from 'node:assert'
import { createTestBundle } from '../capability/capability.context.factory.js'
import { BusinessReservationManager } from '../../capabilities/business/manager/business-reservation.manager.js'
import {
  TEST_TENANT,
  BUSINESS_A,
  ACCOMMODATION_A,
  seedBookingFixtures,
  instrumentService,
  installPermissionDenial,
} from './booking.gate-helpers.js'

const CHECK_IN = '2026-10-30'
const CHECK_OUT = '2026-11-06'

test('PERMISSION DENIAL: valid business + valid accommodation, BUSINESS_PERMISSIONS.READ denied → operation rejected, pricing service calls = 0', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  seedBookingFixtures()

  const pricing = instrumentService(bundle, 'reservation', 'calculateReservationPrice')
  const denial = installPermissionDenial(bundle, 'business:read')

  const brm = new BusinessReservationManager(bundle.context)
  const identity = bundle.identity

  await assert.rejects(
    () => brm.calculateReservationPrice(BUSINESS_A, ACCOMMODATION_A, CHECK_IN, CHECK_OUT, 2, identity),
    (err) => {
      assert.ok(err.message.includes('Missing permission: business:read'), `unexpected error: ${err.message}`)
      return true
    },
    'operation must be rejected on READ denial'
  )

  assert.equal(pricing.calls, 0, 'pricing service must not be invoked on permission denial')

  denial.restore()
  pricing.restore()
  await bundle.teardown()
})

test('CONTROL: same valid business + accommodation with permission granted → pricing service reached exactly once', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  seedBookingFixtures()

  const pricing = instrumentService(bundle, 'reservation', 'calculateReservationPrice')

  const brm = new BusinessReservationManager(bundle.context)
  const identity = bundle.identity

  const result = await brm.calculateReservationPrice(BUSINESS_A, ACCOMMODATION_A, CHECK_IN, CHECK_OUT, 2, identity)

  assert.equal(pricing.calls, 1, 'pricing service must be reached when permission is granted')
  assert.equal(result.success, true, 'control run must reach authoritative pricing')
  assert.ok(result.price > 0, 'control run must return a price')

  pricing.restore()
  await bundle.teardown()
})
