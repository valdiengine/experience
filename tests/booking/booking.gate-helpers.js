import { InMemoryRepositoryAdapter } from '../capability/capability.mock.repositories.js'

export const TEST_TENANT = { id: 'commercial', name: 'Commercial', slug: 'commercial' }
export const BUSINESS_A = 'biz-a'
export const BUSINESS_B = 'biz-b'
export const ACCOMMODATION_A = 'acc-a'
export const ACCOMMODATION_B = 'acc-b'

export function seedBookingFixtures() {
  InMemoryRepositoryAdapter.seed('business', [
    { id: BUSINESS_A, tenantId: TEST_TENANT.id, name: 'Business A', status: 'published', deletedAt: null },
    { id: BUSINESS_B, tenantId: TEST_TENANT.id, name: 'Business B', status: 'published', deletedAt: null },
  ])
  InMemoryRepositoryAdapter.seed('accommodation', [
    { id: ACCOMMODATION_A, tenantId: TEST_TENANT.id, businessId: BUSINESS_A, name: 'Acc A', deletedAt: null },
    { id: ACCOMMODATION_B, tenantId: TEST_TENANT.id, businessId: BUSINESS_B, name: 'Acc B', deletedAt: null },
  ])
  const availabilityRows = []
  const cursor = new Date('2026-10-30')
  const end = new Date('2026-11-06')
  end.setDate(end.getDate() - 1)
  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10)
    for (const accommodationId of [ACCOMMODATION_A, ACCOMMODATION_B]) {
      availabilityRows.push({
        id: `avail-${TEST_TENANT.id}-${accommodationId}-${dateStr}`,
        tenantId: TEST_TENANT.id,
        accommodationId,
        date: dateStr,
        status: 'available',
        isBlocked: false,
        inventory: 4,
        reservedCount: 0,
        available: 4,
        price: 90000,
        currency: 'CLP',
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  InMemoryRepositoryAdapter.seed('availability', availabilityRows)
}

export function instrumentService(bundle, capabilityId, methodName) {
  const cap = bundle.context.capabilities.get(capabilityId)
  const service = cap?.service
  if (!service || typeof service[methodName] !== 'function') {
    throw new Error(`Instrumentation target missing: ${capabilityId}.service.${methodName}`)
  }
  const original = service[methodName]
  const state = { calls: 0, lastArgs: null, lastResult: undefined }
  service[methodName] = function (...args) {
    state.calls += 1
    state.lastArgs = args
    const out = original.apply(this, args)
    if (out && typeof out.then === 'function') {
      state.lastResult = undefined
      return out.then((value) => {
        state.lastResult = value
        return value
      })
    }
    state.lastResult = out
    return out
  }
  return {
    get calls() { return state.calls },
    get lastArgs() { return state.lastArgs },
    get lastResult() { return state.lastResult },
    restore() { service[methodName] = original },
  }
}

export function installPermissionDenial(bundle, permission) {
  const auth = bundle.mockRuntime?.auth
  if (!auth || typeof auth.authorize !== 'function') {
    throw new Error('TEST-ONLY denial infra: auth.authorize unavailable')
  }
  const original = auth.authorize
  auth.authorize = async (identity, requestedPermission, resource) => {
    if (requestedPermission === permission) {
      throw new Error(`Missing permission: ${permission}`)
    }
    return original.call(auth, identity, requestedPermission, resource)
  }
  return {
    restore() { auth.authorize = original },
  }
}
