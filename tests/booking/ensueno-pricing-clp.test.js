import { test } from 'node:test'
import assert from 'node:assert'
import { createTestBundle } from '../../tests/capability/capability.context.factory.js'
import { InMemoryRepositoryAdapter } from '../../tests/capability/capability.mock.repositories.js'
import { ApiRouter } from '../../api/routes/api.router.js'
import { setBookingRegistry, getBookingRegistry } from '../../api/routes/booking.routes.js'
import { provisionEnsueñoBooking, ENSUENO_TENANT } from '../../experience/booking/ensueno.booking.provision.js'

const CHECK_IN = '2026-10-30'
const CHECK_OUT = '2026-11-06'

test('B - Ensueño full pricing: currency CLP persisted', async () => {
  InMemoryRepositoryAdapter.reset()
  const bundle = await createTestBundle({ tenant: ENSUENO_TENANT })
  
  await provisionEnsueñoBooking({
    repositoryRuntime: bundle.repositoryRuntime,
    eventBus: bundle.realBus,
    rangeStart: '2026-10-01',
    rangeDays: 90,
  })
  
  const apiContext = {
    ...bundle.context,
    repositories: bundle.repositoryRuntime,
    capabilities: bundle.context.capabilities,
  }
  global.runtimeContext = apiContext
  const originalRegistry = getBookingRegistry()
  
  const api = new ApiRouter()
  const router = api.getRouter()
  
  function createTestRes() {
    return { statusCode: 0, body: null, setHeader() {}, end(payload) { this.body = payload } }
  }
  function parseBody(res) { if (typeof res.body !== 'string') return null; try { return JSON.parse(res.body) } catch { return null } }
  
  const apiPost = async (pathname, body) => {
    const req = { method: 'POST', pathname, query: {}, headers: { 'content-type': 'application/json' }, body }
    const res = createTestRes()
    await router.handle(req, res)
    return { status: res.statusCode, payload: parseBody(res) }
  }
  
  const result = await apiPost('/api/v1/booking/companies/ensueno-curinanco/reservations', {
    guestName: 'Test', guestEmail: 'test@test.com', guestCount: 2, checkIn: '2026-10-30', checkOut: '2026-11-06'
  })
  
  const store = InMemoryRepositoryAdapter.store
  const reservation = [...store.get('reservation').values()].find(r => r.id === result.payload.data?.reservationId)
  console.log('Reservation currency:', reservation?.currency)
  console.log('Reservation totalPrice:', reservation?.totalPrice)
  
  const line = [...store.get('reservation_lines').values()].find(l => l.reservationId === reservation?.id)
  console.log('Line unitPrice:', line?.unitPrice, 'lineTotal:', line?.lineTotal, 'currency:', line?.currency)
  
  assert.equal(result.status, 201)
  assert.equal(result.payload.success, true)
  assert.equal(reservation.currency, 'CLP', `reservation.currency should be CLP: ${reservation.currency}`)
  assert.equal(reservation.totalPrice, 630000)
  assert.equal(line.unitPrice, 90000)
  assert.equal(line.lineTotal, 630000)
  
  global.runtimeContext = undefined
  setBookingRegistry(originalRegistry)
  await bundle.teardown()
})