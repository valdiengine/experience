import { Router } from './router.js'
import { BookingRegistry, createBookingRegistry } from '../../experience/booking/booking.registry.js'
import { createBookingAdapter, BookingValidationError } from '../../experience/booking/booking.adapter.js'

const BOOKING_ROUTES_MOUNT = '/api/v1/booking'

let sharedRegistry = createBookingRegistry()

export function getBookingRegistry() {
  return sharedRegistry
}

export function setBookingRegistry(registry) {
  if (!(registry instanceof BookingRegistry)) {
    throw new Error('setBookingRegistry requires a BookingRegistry instance')
  }
  sharedRegistry = registry
  return sharedRegistry
}

function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body !== 'string') {
    return Promise.resolve(req.body)
  }
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 65536) {
        reject(new BookingValidationError('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new BookingValidationError('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function sendBookingError(res, error) {
  if (error instanceof BookingValidationError || error?.name === 'BookingValidationError') {
    return sendJson(res, 400, { success: false, code: 'INVALID_REQUEST', error: error.message })
  }
  sendJson(res, 500, { success: false, code: 'INTERNAL_ERROR', error: 'Unexpected server error' })
}

export class BookingController {
  #registryProvider

  constructor(registryProvider = getBookingRegistry) {
    this.#registryProvider = registryProvider
  }

  #buildAdapter() {
    const baseContext = global.runtimeContext
    if (!baseContext) {
      throw new Error('Runtime context not available')
    }
    return createBookingAdapter(baseContext, this.#registryProvider())
  }

  async availability(req, res) {
    let adapter
    try {
      adapter = this.#buildAdapter()
    } catch (error) {
      return sendBookingError(res, error)
    }

    try {
      const result = await adapter.queryAvailability(req.params.slug, {
        checkIn: req.query.checkIn,
        checkOut: req.query.checkOut,
      })
      const status = result.status || (result.ok ? 200 : 500)
      const payload = result.ok
        ? { success: true, data: result.data }
        : { success: false, code: result.code || 'ERROR', error: result.error }
      return sendJson(res, status, payload)
    } catch (error) {
      return sendBookingError(res, error)
    }
  }

  async reservation(req, res) {
    let adapter
    try {
      adapter = this.#buildAdapter()
    } catch (error) {
      return sendBookingError(res, error)
    }

    let body
    try {
      body = await parseJsonBody(req)
    } catch (error) {
      return sendBookingError(res, error)
    }

    try {
      const result = await adapter.createReservation(req.params.slug, body)
      const status = result.status || (result.ok ? 201 : 500)
      const payload = result.ok
        ? { success: true, data: result.data }
        : { success: false, code: result.code || 'ERROR', error: result.error }
      return sendJson(res, status, payload)
    } catch (error) {
      return sendBookingError(res, error)
    }
  }
}

export function registerBookingRoutes(router) {
  const bookingRouter = new Router()
  const controller = new BookingController()

  bookingRouter.get('/companies/:slug/availability', controller.availability.bind(controller))
  bookingRouter.post('/companies/:slug/reservations', controller.reservation.bind(controller))

  router.use(BOOKING_ROUTES_MOUNT, bookingRouter)
}

export default registerBookingRoutes