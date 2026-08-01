/**
 * Reservation Flow — Complete reservation experience orchestration
 *
 * Business-agnostic: orchestrates calendar, selector, form, view
 * No business logic — only flow control
 * Communicates with capabilities via context
 */
import { ReservationCalendar } from './ui/reservation.calendar.js'
import { ReservationSelector } from './ui/reservation.selector.js'
import { ReservationForm } from './ui/reservation.form.js'
import { ReservationView } from './ui/reservation.view.js'
import { RESERVATION_EVENTS } from './reservation.events.js'

export class ReservationFlow {
  #context = null
  #calendar = null
  #selector = null
  #form = null
  #view = null
  #step = 'loading'
  #error = null

  constructor(context, config = {}) {
    this.#context = context
    this.#calendar = new ReservationCalendar(context, config)
    this.#selector = new ReservationSelector(context, config)
    this.#form = new ReservationForm(context, config)
    this.#view = new ReservationView(context)
  }

  // ── Getters ──

  get calendar() { return this.#calendar }
  get selector() { return this.#selector }
  get form() { return this.#form }
  get view() { return this.#view }
  get step() { return this.#step }
  get error() { return this.#error }

  // ── Flow Methods ──

  /**
   * Initialize the reservation flow
   * @returns {Promise<object>}
   */
  async init() {
    this.#step = 'loading'
    this.#error = null

    try {
      await this.#selector.loadResources()
      this.#step = 'select_resource'
      this.#emit(RESERVATION_EVENTS.STARTED, { step: this.#step })
      return { success: true, step: this.#step }
    } catch (error) {
      this.#step = 'error'
      this.#error = error.message
      return { success: false, error: error.message }
    }
  }

  /**
   * Select a resource
   * @param {string} resourceId
   * @returns {object}
   */
  selectResource(resourceId) {
    const result = this.#selector.selectResource(resourceId)
    if (result.valid) {
      this.#step = 'select_dates'
    }
    return result
  }

  /**
   * Load calendar month
   * @param {number} year
   * @param {number} month
   * @returns {Promise<object[]>}
   */
  async loadCalendarMonth(year, month) {
    return this.#calendar.loadMonth(year, month)
  }

  /**
   * Select a date on calendar
   * @param {string} dateStr
   * @returns {object}
   */
  selectDate(dateStr) {
    return this.#calendar.selectDate(dateStr)
  }

  /**
   * Confirm date selection
   * @returns {object}
   */
  confirmDates() {
    const selection = this.#calendar.getSelection()
    if (!selection.start || !selection.end) {
      return { valid: false, error: 'Please select both check-in and check-out dates' }
    }

    this.#step = 'enter_info'
    return { valid: true, range: selection }
  }

  /**
   * Set form field
   * @param {string} field
   * @param {string} value
   */
  setFormField(field, value) {
    this.#form.setField(field, value)
  }

  /**
   * Validate and submit reservation
   * @returns {Promise<object>}
   */
  async submit() {
    const formValidation = this.#form.validate()
    if (!formValidation.valid) {
      return { success: false, errors: formValidation.errors }
    }

    const selection = this.#calendar.getSelection()
    if (!selection.start || !selection.end) {
      return { success: false, errors: ['No dates selected'] }
    }

    const resource = this.#selector.getSelectedResource()
    if (!resource) {
      return { success: false, errors: ['No resource selected'] }
    }

    this.#step = 'submitting'
    this.#emit(RESERVATION_EVENTS.SUBMITTED, {
      resourceId: resource.id,
      dates: selection,
      customer: this.#form.getData(),
    })

    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) {
      this.#step = 'error'
      this.#error = 'Reservation capability not available'
      return { success: false, errors: ['Reservation capability not available'] }
    }

    const result = await reservation.createRequest({
      resourceId: resource.id,
      customer: this.#form.getData(),
      dates: {
        checkIn: selection.start,
        checkOut: selection.end,
      },
      source: 'reservation_engine',
    })

    if (result.success) {
      this.#step = 'confirmation'
      this.#view.loadReservation(result.reservationId)
      this.#emit(RESERVATION_EVENTS.CREATED, {
        reservationId: result.reservationId,
        status: result.status,
      })
    } else {
      this.#step = 'enter_info'
      this.#error = result.errors?.join(', ') || 'Reservation failed'
    }

    return result
  }

  /**
   * Go back to previous step
   */
  back() {
    switch (this.#step) {
      case 'select_dates':
        this.#step = 'select_resource'
        this.#selector.clearSelection()
        break
      case 'enter_info':
        this.#step = 'select_dates'
        this.#calendar.clearSelection()
        break
      case 'select_resource':
        break
    }
    this.#error = null
  }

  /**
   * Reset the entire flow
   */
  reset() {
    this.#step = 'loading'
    this.#error = null
    this.#selector.clearSelection()
    this.#calendar.clearSelection()
    this.#form.reset()
    this.#view.setReservation(null)
  }

  /**
   * Get flow state
   * @returns {object}
   */
  getState() {
    return {
      step: this.#step,
      error: this.#error,
      resource: this.#selector.getSelectedResource(),
      dates: this.#calendar.getSelection(),
      formValid: this.#form.isValid(),
      reservation: this.#view.getReservation(),
    }
  }

  /**
   * Check if flow is complete
   * @returns {boolean}
   */
  isComplete() {
    return this.#step === 'confirmation'
  }

  // ── Private Methods ──

  #emit(event, data) {
    this.#context?.eventBus?.emit(event, data)
  }
}
