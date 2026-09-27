/**
 * BOOKING-WIDGET-AVAILABILITY-1 — Focused test for the served traveler-widget gate
 *
 * Renders the real document through HtmlRenderer, extracts the actual emitted
 * inline script, executes it against a DOM/fetch stub, invokes the captured
 * submit handlers, and asserts the real travelerForm.hidden / stateRegion state.
 * No evaluator is duplicated here: every assertion below runs the shipped code.
 *
 * Covered contract:
 *   - only the occupied nights [checkIn, checkOut) gate eligibility
 *   - checkOut and out-of-range entries never gate
 *   - every expected occupied date must be present exactly once
 *   - each occupied night needs status 'available' and a finite numeric available >= 1
 *   - capacity is not a gate; payload.nights and array length are not trusted
 */
import { HtmlRenderer } from './rendering/html.renderer.js'

const SLUG = 'destino-ejemplo'
const AVAILABILITY_ENDPOINT = `/api/v1/booking/companies/${SLUG}/availability`
const RESERVATION_ENDPOINT = `/api/v1/booking/companies/${SLUG}/reservations`

const results = []

function record(category, id, pass, detail) {
  results.push({ category, id, pass, detail })
  console.log(`  [${category}] ${id}: ${pass ? 'PASS' : 'FAIL'} — ${detail}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function extractScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
}

function renderWidgetDocument() {
  const html = new HtmlRenderer().render(
    { booking: { enabled: true, slug: SLUG, title: 'Reserva tu viaje' } },
    { domain: 'valdi.app', pathname: '/reservas' },
  )
  const scripts = extractScripts(html)
  const configScript = scripts.find((s) => s.includes('window.bookingAPIConfig = {'))
  const widgetScript = scripts.find((s) => s.includes("querySelector('[data-booking-slug]')"))
  return { html, configScript, widgetScript }
}

function matchesSelector(node, selector) {
  const sel = String(selector).trim()
  const attributeOnly = /^\[([a-zA-Z-]+)(?:="([^"]*)")?\]$/.exec(sel)
  if (attributeOnly) {
    const actual = node.getAttribute(attributeOnly[1])
    if (actual === null) return false
    return attributeOnly[2] === undefined ? true : actual === attributeOnly[2]
  }
  const compound = /^([a-zA-Z]+)?(?:\[([a-zA-Z-]+)(?:="([^"]*)")?\])?$/.exec(sel)
  if (!compound || (!compound[1] && !compound[2])) return false
  if (compound[1] && node.tagName.toLowerCase() !== compound[1].toLowerCase()) return false
  if (compound[2]) {
    const actual = node.getAttribute(compound[2])
    if (actual === null) return false
    if (compound[3] !== undefined && actual !== compound[3]) return false
  }
  return true
}

function createNode(tagName, attributes = {}) {
  const node = {
    tagName,
    value: '',
    textContent: '',
    className: '',
    hidden: false,
    disabled: false,
    children: [],
    attributes: { ...attributes },
    listeners: {},
    classSet: new Set(),
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(node.attributes, name) ? node.attributes[name] : null
    },
    setAttribute(name, value) {
      node.attributes[name] = String(value)
    },
    addEventListener(type, fn) {
      (node.listeners[type] = node.listeners[type] || []).push(fn)
    },
    reset() {
      node.resetCalls = (node.resetCalls || 0) + 1
    },
    classList: {
      add: (...classes) => classes.forEach((c) => node.classSet.add(c)),
      remove: (...classes) => classes.forEach((c) => node.classSet.delete(c)),
      contains: (cls) => node.classSet.has(cls),
    },
    querySelector(sel) {
      return node.querySelectorAll(sel)[0] || null
    },
    querySelectorAll(sel) {
      const found = []
      ;(function walk(current) {
        for (const child of current.children) {
          if (matchesSelector(child, sel)) found.push(child)
          walk(child)
        }
      })(node)
      return found
    },
  }
  return node
}

// Mirrors the SSR booking section so the emitted script resolves real selectors.
function createWidgetDom() {
  const section = createNode('section', {
    'data-booking-slug': SLUG,
    'data-booking-availability': AVAILABILITY_ENDPOINT,
    'data-booking-reservation': RESERVATION_ENDPOINT,
  })

  const dateForm = createNode('form', { 'data-booking-date-form': '' })
  const checkIn = createNode('input', { name: 'checkIn', type: 'date' })
  const checkOut = createNode('input', { name: 'checkOut', type: 'date' })
  const dateSubmit = createNode('button', { type: 'submit' })
  dateForm.children.push(checkIn, checkOut, dateSubmit)

  const stateRegion = createNode('div', { 'data-booking-state': '', role: 'status' })
  stateRegion.hidden = true

  const travelerForm = createNode('form', { 'data-booking-traveler-form': '' })
  const nameInput = createNode('input', { name: 'name' })
  const emailInput = createNode('input', { name: 'email' })
  const phoneInput = createNode('input', { name: 'phone' })
  const guestCountInput = createNode('input', { name: 'guestCount' })
  const notesInput = createNode('textarea', { name: 'notes' })
  const travelerSubmit = createNode('button', { type: 'submit' })
  travelerForm.children.push(nameInput, emailInput, phoneInput, guestCountInput, notesInput, travelerSubmit)
  travelerForm.hidden = true

  const confirmationRegion = createNode('div', { 'data-booking-confirmation': '', role: 'status' })
  confirmationRegion.hidden = true

  section.children.push(dateForm, stateRegion, travelerForm, confirmationRegion)
  return { section, dateForm, checkIn, checkOut, stateRegion, travelerForm, confirmationRegion, nameInput, emailInput }
}

function jsonResponse(status, payload) {
  return { status, json: async () => payload }
}

// Executes the real emitted scripts. Any syntax error throws here and fails the suite.
function mountWidget(responseFactory) {
  const { html, configScript, widgetScript } = renderWidgetDocument()
  assert(configScript, 'Booking API config script must be emitted')
  assert(widgetScript, 'Traveler booking widget script must be emitted')

  const dom = createWidgetDom()
  const calls = []
  const windowStub = {}
  const documentStub = {
    querySelector(sel) {
      return sel === '[data-booking-slug]' ? dom.section : null
    },
    querySelectorAll() {
      return []
    },
  }
  const fetchStub = async (url, options) => {
    calls.push({ url, options })
    return responseFactory(url, options, calls.length)
  }
  const consoleStub = { error() {}, log() {} }

  new Function('window', 'document', 'console', configScript)(windowStub, documentStub, consoleStub)
  new Function('window', 'document', 'console', 'fetch', widgetScript)(windowStub, documentStub, consoleStub, fetchStub)

  assert(dom.dateForm.listeners.submit && dom.dateForm.listeners.submit.length === 1,
    'Emitted script must register exactly one date-form submit handler')
  assert(dom.travelerForm.listeners.submit && dom.travelerForm.listeners.submit.length === 1,
    'Emitted script must register exactly one traveler-form submit handler')

  return { ...dom, html, calls, windowStub }
}

async function submitAvailability(widget, checkInValue, checkOutValue) {
  widget.checkIn.value = checkInValue
  widget.checkOut.value = checkOutValue
  const event = { preventDefault() {} }
  await widget.dateForm.listeners.submit[0](event)
}

async function submitReservation(widget, checkInValue, checkOutValue) {
  widget.checkIn.value = checkInValue
  widget.checkOut.value = checkOutValue
  widget.nameInput.value = 'Test Guest'
  widget.emailInput.value = 'guest@example.com'
  const event = { preventDefault() {} }
  await widget.travelerForm.listeners.submit[0](event)
}

function day(date, overrides = {}) {
  return { date, status: 'available', available: 4, capacity: 4, price: 100000, notes: null, ...overrides }
}

function okPayload(dates, extra = {}) {
  return { success: true, data: { company: SLUG, dates, ...extra } }
}

async function testServedSurface() {
  console.log('\n[SERVED] Real emitted document and script...\n')
  const { html, configScript, widgetScript } = renderWidgetDocument()
  record('served', 'served-1-ssr-markup-and-scripts-present',
    html.includes('data-booking-traveler-form') &&
      html.includes('data-booking-date-form') &&
      html.includes('data-booking-state') &&
      html.includes('data-booking-confirmation') &&
      html.includes(AVAILABILITY_ENDPOINT) &&
      Boolean(configScript) && Boolean(widgetScript),
    `travelerForm=${html.includes('data-booking-traveler-form')} widgetScript=${widgetScript.length} chars`)

  const compiles = (() => {
    try {
      new Function('window', 'document', 'console', 'fetch', widgetScript)
      return true
    } catch {
      return false
    }
  })()
  record('served', 'served-2-emitted-script-compiles', compiles,
    'emitted widget script must be syntactically valid JavaScript')
}

async function testBookableRanges() {
  console.log('\n[ELIGIBILITY] Occupied nights drive the gate...\n')

  const cases = [
    {
      id: 'two-night-free-visible',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      dates: [day('2026-11-20'), day('2026-11-21'), day('2026-11-22')],
      expectVisible: true,
      why: 'both occupied nights free',
    },
    {
      id: 'one-night-free-visible',
      checkIn: '2026-11-20', checkOut: '2026-11-21',
      dates: [day('2026-11-20'), day('2026-11-21')],
      expectVisible: true,
      why: 'single occupied night free',
    },
    {
      id: 'checkout-only-unavailable-visible',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      dates: [day('2026-11-20'), day('2026-11-21'), day('2026-11-22', { status: 'occupied', available: 0 })],
      expectVisible: true,
      why: 'checkout night is not occupied and must not gate',
    },
    {
      id: 'out-of-range-entries-ignored-visible',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      dates: [
        day('2026-11-18', { status: 'occupied', available: 0 }),
        day('2026-11-19', { status: 'occupied', available: 0 }),
        day('2026-11-20'), day('2026-11-21'), day('2026-11-22'),
        day('2026-11-23', { status: 'occupied', available: 0 }),
      ],
      expectVisible: true,
      why: 'dates outside [checkIn, checkOut) are ignored',
    },
    {
      id: 'occupied-night-unavailable-hidden',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      dates: [day('2026-11-20'), day('2026-11-21', { status: 'occupied', available: 0 }), day('2026-11-22')],
      expectVisible: false,
      why: 'an occupied night is not bookable',
    },
    {
      id: 'missing-occupied-date-hidden',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      dates: [day('2026-11-20'), day('2026-11-22')],
      expectVisible: false,
      why: '2026-11-21 is absent from the payload',
    },
    {
      id: 'duplicate-masking-gap-hidden',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      dates: [day('2026-11-20'), day('2026-11-20'), day('2026-11-22')],
      expectVisible: false,
      why: 'a duplicate must not stand in for the missing night',
    },
    {
      id: 'duplicate-extra-occupied-hidden',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      dates: [day('2026-11-20'), day('2026-11-21'), day('2026-11-21'), day('2026-11-22')],
      expectVisible: false,
      why: 'duplicated occupied date is rejected',
    },
    {
      id: 'nights-field-not-trusted-hidden',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      dates: [day('2026-11-20'), day('2026-11-22')],
      payloadNights: 99,
      expectVisible: false,
      why: 'payload.nights must not replace per-date validation',
    },
    {
      id: 'array-length-not-trusted-hidden',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      dates: [day('2026-11-20'), day('2026-11-22'), day('2026-11-23')],
      expectVisible: false,
      why: 'longer array with a missing occupied night must not pass',
    },
    {
      id: 'missing-dates-array-hidden',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      rawPayload: { success: true, data: { company: SLUG } },
      expectVisible: false,
      why: 'no dates array is never bookable',
    },
    {
      id: 'unsuccessful-response-hidden',
      checkIn: '2026-11-20', checkOut: '2026-11-22',
      rawPayload: { success: false, error: 'No hay disponibilidad', data: { dates: [day('2026-11-20'), day('2026-11-21'), day('2026-11-22')] } },
      expectVisible: false,
      why: 'success=false keeps the form hidden even with free dates',
    },
  ]

  for (const testCase of cases) {
    const payload = testCase.rawPayload || okPayload(testCase.dates, { nights: testCase.payloadNights })
    const widget = mountWidget(() => jsonResponse(200, payload))
    await submitAvailability(widget, testCase.checkIn, testCase.checkOut)
    const visible = widget.travelerForm.hidden === false
    record('eligibility', testCase.id, visible === testCase.expectVisible,
      `hidden=${widget.travelerForm.hidden} expected=${!testCase.expectVisible} (${testCase.why}) state="${widget.stateRegion.textContent}"`)
  }
}

async function testAvailabilityValueContract() {
  console.log('\n[AVAILABLE] status + finite numeric available >= 1, no coercion...\n')

  const base = [day('2026-11-20'), day('2026-11-21'), day('2026-11-22')]
  const cases = [
    { id: 'available-null-hidden', available: null, expectVisible: false, why: 'missing row serializes available:null' },
    { id: 'available-undefined-hidden', available: undefined, expectVisible: false, why: 'absent available is not bookable' },
    { id: 'available-zero-hidden', available: 0, expectVisible: false, why: 'no inventory left' },
    { id: 'available-negative-hidden', available: -1, expectVisible: false, why: 'negative inventory is invalid' },
    { id: 'available-fractional-below-one-hidden', available: 0.5, expectVisible: false, why: 'fractional availability below one unit' },
    { id: 'available-numeric-string-hidden', available: '3', expectVisible: false, why: 'no implicit coercion from string' },
    { id: 'available-boolean-hidden', available: true, expectVisible: false, why: 'booleans are not numbers' },
    { id: 'available-nan-hidden', available: Number.NaN, expectVisible: false, why: 'NaN is not finite' },
    { id: 'available-infinity-hidden', available: Number.POSITIVE_INFINITY, expectVisible: false, why: 'Infinity is not finite' },
    { id: 'available-one-capacity-null-visible', available: 1, capacity: null, expectVisible: true, why: 'capacity:null is unknown metadata, not a gate' },
    { id: 'available-two-capacity-null-visible', available: 2, capacity: null, expectVisible: true, why: 'positive availability is bookable without capacity' },
    { id: 'available-one-status-blocked-hidden', available: 1, status: 'blocked', expectVisible: false, why: 'status must be available' },
  ]

  for (const testCase of cases) {
    const dates = base.map((entry, index) => {
      if (index !== 1) return entry
      const patch = { available: testCase.available }
      if ('capacity' in testCase) patch.capacity = testCase.capacity
      if ('status' in testCase) patch.status = testCase.status
      return day(entry.date, patch)
    })
    const widget = mountWidget(() => jsonResponse(200, okPayload(dates)))
    await submitAvailability(widget, '2026-11-20', '2026-11-22')
    const visible = widget.travelerForm.hidden === false
    record('available', testCase.id, visible === testCase.expectVisible,
      `hidden=${widget.travelerForm.hidden} expected=${!testCase.expectVisible} (${testCase.why})`)
  }
}

async function testStrictDateSemantics() {
  console.log('\n[DATES] Strict YYYY-MM-DD bounds on the client...\n')

  const good = [day('2026-11-20'), day('2026-11-21'), day('2026-11-22')]
  const cases = [
    { id: 'equal-dates-hidden', checkIn: '2026-11-20', checkOut: '2026-11-20', dates: [day('2026-11-20')], why: 'zero-night stay' },
    { id: 'reversed-dates-hidden', checkIn: '2026-11-22', checkOut: '2026-11-20', dates: [...good].reverse(), why: 'reversed range' },
    { id: 'impossible-checkout-hidden', checkIn: '2026-11-20', checkOut: '2026-11-31', dates: good, why: '2026-11-31 does not exist' },
    { id: 'impossible-checkin-hidden', checkIn: '2026-02-30', checkOut: '2026-03-03', dates: good, why: '2026-02-30 does not exist' },
    { id: 'month-zero-hidden', checkIn: '2026-00-10', checkOut: '2026-01-12', dates: good, why: 'month 00 is invalid' },
    { id: 'empty-checkin-hidden', checkIn: '', checkOut: '2026-11-22', dates: good, why: 'empty bound' },
    { id: 'non-iso-checkin-hidden', checkIn: '20/11/2026', checkOut: '2026-11-22', dates: good, why: 'not YYYY-MM-DD' },
    { id: 'malformed-occupied-date-hidden', checkIn: '2026-11-20', checkOut: '2026-11-22', dates: [day('2026-11-20'), day('2026-13-21'), day('2026-11-22')], why: 'impossible occupied date' },
  ]

  for (const testCase of cases) {
    const widget = mountWidget(() => jsonResponse(200, okPayload(testCase.dates)))
    await submitAvailability(widget, testCase.checkIn, testCase.checkOut)
    record('dates', testCase.id, widget.travelerForm.hidden === true,
      `hidden=${widget.travelerForm.hidden} (${testCase.why}) state="${widget.stateRegion.textContent}"`)
  }

  // Year 0000-0099 must not be remapped onto 1900-1999.
  const ancient = [day('0099-12-30'), day('0099-12-31')]
  const ancientWidget = mountWidget(() => jsonResponse(200, okPayload(ancient)))
  await submitAvailability(ancientWidget, '0099-12-30', '0099-12-31')
  record('dates', 'dates-year-0099-no-remap', ancientWidget.travelerForm.hidden === false,
    `hidden=${ancientWidget.travelerForm.hidden} (year 0099 must stay 0099, not 1999)`)

  // Leap-day boundary arithmetic stays UTC date-only.
  const leap = [day('2024-02-28'), day('2024-02-29'), day('2024-03-01')]
  const leapWidget = mountWidget(() => jsonResponse(200, okPayload(leap)))
  await submitAvailability(leapWidget, '2024-02-28', '2024-03-01')
  record('dates', 'dates-leap-boundary-visible', leapWidget.travelerForm.hidden === false,
    `hidden=${leapWidget.travelerForm.hidden} (2024-02-29 is a real night)`)
}

async function testRequestFlow() {
  console.log('\n[FLOW] Request, messages and 409 handling preserved...\n')

  const good = [day('2026-11-20'), day('2026-11-21'), day('2026-11-22')]

  const urlWidget = mountWidget(() => jsonResponse(200, okPayload(good)))
  await submitAvailability(urlWidget, '2026-11-20', '2026-11-22')
  const call = urlWidget.calls[0]
  record('flow', 'flow-1-availability-url-and-success-state',
    urlWidget.calls.length === 1 &&
      call.url.startsWith(AVAILABILITY_ENDPOINT) &&
      call.url.includes('slug=destino-ejemplo') &&
      call.url.includes('checkIn=2026-11-20') &&
      call.url.includes('checkOut=2026-11-22') &&
      urlWidget.travelerForm.hidden === false &&
      urlWidget.stateRegion.textContent.includes('Disponibilidad confirmada'),
    `url=${call.url} state="${urlWidget.stateRegion.textContent}"`)

  const conflictWidget = mountWidget(() => jsonResponse(409, { success: false, error: 'No hay disponibilidad para esas fechas.' }))
  await submitAvailability(conflictWidget, '2026-11-20', '2026-11-22')
  record('flow', 'flow-2-get-409-hides-form',
    conflictWidget.travelerForm.hidden === true &&
      conflictWidget.stateRegion.textContent === 'No hay disponibilidad para esas fechas.',
    `hidden=${conflictWidget.travelerForm.hidden} state="${conflictWidget.stateRegion.textContent}"`)

  const submitEnabled = urlWidget.dateForm.querySelector('button[type="submit"]')
  record('flow', 'flow-3-submit-button-released',
    submitEnabled.disabled === false && !submitEnabled.classList.contains('loading'),
    `disabled=${submitEnabled.disabled} loading=${submitEnabled.classList.contains('loading')}`)

  const reservationOk = mountWidget((url) =>
    (url === RESERVATION_ENDPOINT
      ? jsonResponse(201, { success: true, data: { confirmationCode: 'CONF-TEST-1' } })
      : jsonResponse(200, okPayload(good))))
  await submitAvailability(reservationOk, '2026-11-20', '2026-11-22')
  await submitReservation(reservationOk, '2026-11-20', '2026-11-22')
  const reservationCall = reservationOk.calls.find((c) => c.url === RESERVATION_ENDPOINT)
  const sentBody = reservationCall ? JSON.parse(reservationCall.options.body) : null
  record('flow', 'flow-4-reservation-created',
    reservationOk.travelerForm.hidden === true &&
      reservationOk.confirmationRegion.hidden === false &&
      reservationOk.confirmationRegion.textContent.includes('CONF-TEST-1') &&
      sentBody?.checkIn === '2026-11-20' && sentBody?.checkOut === '2026-11-22' &&
      sentBody?.guestName === 'Test Guest' && sentBody?.guestEmail === 'guest@example.com' &&
      reservationOk.dateForm.resetCalls === 1,
    `confirmation="${reservationOk.confirmationRegion.textContent}" body=${JSON.stringify(sentBody)}`)

  const conflictPost = mountWidget((url) =>
    (url === RESERVATION_ENDPOINT
      ? jsonResponse(409, { success: false, error: 'La disponibilidad cambió. Elige otras fechas e intenta de nuevo.' })
      : jsonResponse(200, okPayload(good))))
  await submitAvailability(conflictPost, '2026-11-20', '2026-11-22')
  await submitReservation(conflictPost, '2026-11-20', '2026-11-22')
  record('flow', 'flow-5-post-409-reported',
    conflictPost.confirmationRegion.hidden === true &&
      conflictPost.stateRegion.textContent === 'La disponibilidad cambió. Elige otras fechas e intenta de nuevo.',
    `confirmationHidden=${conflictPost.confirmationRegion.hidden} state="${conflictPost.stateRegion.textContent}"`)

  // A later failing check must re-hide a form that an earlier check revealed.
  let callCount = 0
  const regress = mountWidget(() => {
    callCount += 1
    return callCount === 1
      ? jsonResponse(200, okPayload(good))
      : jsonResponse(200, okPayload([day('2026-11-20'), day('2026-11-21', { available: 0 }), day('2026-11-22')]))
  })
  await submitAvailability(regress, '2026-11-20', '2026-11-22')
  const revealedFirst = regress.travelerForm.hidden === false
  await submitAvailability(regress, '2026-11-20', '2026-11-22')
  record('flow', 'flow-6-failed-recheck-reshides-form',
    revealedFirst && regress.travelerForm.hidden === true,
    `firstRevealed=${revealedFirst} hiddenAfterFailedRecheck=${regress.travelerForm.hidden}`)
}

async function main() {
  await testServedSurface()
  await testBookableRanges()
  await testAvailabilityValueContract()
  await testStrictDateSemantics()
  await testRequestFlow()
}

async function runAllTests() {
  try {
    await main()
  } catch (err) {
    console.error('Main suite error:', err)
    process.exit(1)
  }
  console.log('\n=== RESULTS ===')
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
  if (failed > 0) {
    console.log('\n=== FAILED ===')
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  [${r.category}] ${r.id}: ${r.detail}`)
    }
  }
  process.exit(failed > 0 ? 1 : 0)
}

runAllTests().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})
