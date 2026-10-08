import { test } from 'node:test'
import assert from 'node:assert'
import { createTestBundle } from '../capability/capability.context.factory.js'
import { BusinessReservationManager } from '../../capabilities/business/manager/business-reservation.manager.js'
import {
  TEST_TENANT,
  BUSINESS_A,
  BUSINESS_B,
  ACCOMMODATION_A,
  seedBookingFixtures,
  instrumentService,
  installPermissionDenial,
} from './booking.gate-helpers.js'

const CHECK_IN = '2026-10-30'
const CHECK_OUT = '2026-11-06'

test('VALID: service reached and result propagates unchanged', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  seedBookingFixtures()

  const availability = instrumentService(bundle, 'availability', 'checkAvailability')
  const brm = new BusinessReservationManager(bundle.context)

  const result = await brm.validateAvailability(BUSINESS_A, ACCOMMODATION_A, CHECK_IN, CHECK_OUT, bundle.identity)

  assert.equal(availability.calls, 1, 'availability service must be reached')
  assert.deepEqual(result, availability.lastResult, 'service result must propagate unchanged')
  assert.equal(result.available, true, 'seeded range must be available')
  assert.equal(result.checkIn, CHECK_IN, 'checkIn must propagate')
  assert.equal(result.checkOut, CHECK_OUT, 'checkOut must propagate')
  assert.equal(result.totalNights, 7, 'range must span 7 nights')
  assert.equal(result.details.length, 7, 'per-night details must propagate')
  assert.equal(availability.lastArgs[0], ACCOMMODATION_A, 'service must receive the accommodation id')

  availability.restore()
  await bundle.teardown()
})

test('OWNERSHIP MISMATCH: accommodation of another business → operation rejected, service calls = 0', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  seedBookingFixtures()

  const availability = instrumentService(bundle, 'availability', 'checkAvailability')
  const brm = new BusinessReservationManager(bundle.context)

  await assert.rejects(
    () => brm.validateAvailability(BUSINESS_B, ACCOMMODATION_A, CHECK_IN, CHECK_OUT, bundle.identity),
    (err) => {
      assert.ok(
        err.message.includes('Accommodation does not belong'),
        `unexpected error: ${err.message}`
      )
      return true
    },
    'operation must be rejected on ownership mismatch'
  )

  assert.equal(availability.calls, 0, 'availability service must not be invoked on ownership mismatch')

  availability.restore()
  await bundle.teardown()
})

test('PERMISSION DENIAL: BUSINESS_PERMISSIONS.READ denied → operation rejected, service calls = 0', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  seedBookingFixtures()

  const availability = instrumentService(bundle, 'availability', 'checkAvailability')
  const denial = installPermissionDenial(bundle, 'business:read')
  const brm = new BusinessReservationManager(bundle.context)

  await assert.rejects(
    () => brm.validateAvailability(BUSINESS_A, ACCOMMODATION_A, CHECK_IN, CHECK_OUT, bundle.identity),
    (err) => {
      assert.ok(err.message.includes('Missing permission: business:read'), `unexpected error: ${err.message}`)
      return true
    },
    'operation must be rejected on READ denial'
  )

  assert.equal(availability.calls, 0, 'availability service must not be invoked on permission denial')

  denial.restore()
  availability.restore()
  await bundle.teardown()
})
