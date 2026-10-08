import assert from 'node:assert'
import { test } from 'node:test'
import { ReservationManager } from '../../capabilities/reservation/reservation.manager.js'

const createMockRepo = () => ({
  createReservationWithLine: async (reservation, line) => ({ reservation, line })
})

const createContext = (overrides = {}) => {
  const repo = overrides.repo || createMockRepo()
  const timer = {
    syncReservationState: async () => ({ status: 'armed' })
  }
  return {
    tenant: { id: 'tenant-test' },
    repositories: { reservation: repo },
    runtime: { auth: null },
    capabilities: { get: () => null },
    dataManager: { get: () => ({ find: () => null }) },
    timer,
    ...overrides
  }
}

test('ReservationManager maps authoritative pricing - captures values', async () => {
  const captured = []
  const repo = {
    createReservationWithLine: async (reservation, line) => {
      captured.push({ reservation, line })
      return { reservation, line }
    }
  }
  const context = createContext({ repo })
  const manager = new ReservationManager(context)
  manager.attachTimer(context.timer)

  const data = {
    businessId: 'b1',
    accommodationId: 'a1',
    resourceId: 'r1',
    customer: { name: 'Alice', email: 'a@b.com' },
    dates: { checkIn: '2026-01-01', checkOut: '2026-01-03' },
    guests: 2,
    totalPrice: 300,
    currency: 'CLP',
    pricing: { pricePerNight: 150, nights: 2, totalPrice: 300, currency: 'CLP' }
  }

  const result = await manager.createRequest(data, null)
  assert.equal(result.success, true)
  assert.ok(captured[0])
  assert.equal(captured[0].reservation.totalPrice, 300)
  assert.equal(captured[0].reservation.currency, 'CLP')
  assert.equal(captured[0].line.lineTotal, 300)
  assert.equal(captured[0].line.unitPrice, 150)
})

test('ReservationManager sets line.unitPrice null when pricePerNight absent - no reconstruction', async () => {
  const captured = []
  const repo = {
    createReservationWithLine: async (reservation, line) => {
      captured.push({ reservation, line })
      return { reservation, line }
    }
  }
  const context = createContext({ repo })
  const manager = new ReservationManager(context)
  manager.attachTimer(context.timer)

  const data = {
    businessId: 'b1',
    accommodationId: 'a1',
    resourceId: 'r1',
    customer: { name: 'Bob' },
    dates: { checkIn: '2026-02-01', checkOut: '2026-02-04' },
    guests: 1,
    totalPrice: 450,
    currency: 'USD'
  }

  const result = await manager.createRequest(data, null)
  assert.equal(result.success, true)
  assert.ok(captured[0])
  assert.equal(captured[0].reservation.totalPrice, 450)
  assert.equal(captured[0].reservation.currency, 'USD')
  assert.equal(captured[0].line.lineTotal, 450)
  assert.equal(captured[0].line.unitPrice, null)
})