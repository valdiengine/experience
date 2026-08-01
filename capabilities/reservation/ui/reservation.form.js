/**
 * Reservation Form — Customer information collection and validation
 *
 * Business-agnostic: collects name, email, phone, notes
 * No business-specific fields
 */
import { validateCustomer } from '../reservation.schema.js'

export class ReservationForm {
  #context = null
  #data = {
    name: '',
    email: '',
    phone: '',
    country: '',
    notes: '',
    channelPreference: 'email',
  }
  #errors = []
  #requiredFields = ['name']

  constructor(context, config = {}) {
    this.#context = context
    if (config.requiredFields) {
      this.#requiredFields = config.requiredFields
    }
  }

  /**
   * Set a field value
   * @param {string} field
   * @param {string} value
   */
  setField(field, value) {
    if (this.#data.hasOwnProperty(field)) {
      this.#data[field] = value
      this.#clearFieldError(field)
    }
  }

  /**
   * Get current form data
   * @returns {object}
   */
  getData() {
    return { ...this.#data }
  }

  /**
   * Get a single field value
   * @param {string} field
   * @returns {string}
   */
  getField(field) {
    return this.#data[field] || ''
  }

  /**
   * Set multiple fields at once
   * @param {object} fields - { name: value, ... }
   */
  setFields(fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (this.#data.hasOwnProperty(key)) {
        this.#data[key] = value
      }
    }
  }

  /**
   * Validate form data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate() {
    this.#errors = []

    for (const field of this.#requiredFields) {
      if (!this.#data[field] || this.#data[field].trim().length === 0) {
        this.#errors.push(`${this.#capitalize(field)} is required`)
      }
    }

    if (this.#data.email && !this.#isValidEmail(this.#data.email)) {
      this.#errors.push('Invalid email address')
    }

    if (this.#data.phone && !this.#isValidPhone(this.#data.phone)) {
      this.#errors.push('Invalid phone number')
    }

    const customerValidation = validateCustomer(this.#data)
    if (!customerValidation.valid) {
      this.#errors.push(...customerValidation.errors)
    }

    return {
      valid: this.#errors.length === 0,
      errors: [...this.#errors],
    }
  }

  /**
   * Get validation errors
   * @returns {string[]}
   */
  getErrors() {
    return [...this.#errors]
  }

  /**
   * Get field error
   * @param {string} field
   * @returns {string|null}
   */
  getFieldError(field) {
    return this.#errors.find(e => e.toLowerCase().includes(field.toLowerCase())) || null
  }

  /**
   * Check if form is valid
   * @returns {boolean}
   */
  isValid() {
    return this.validate().valid
  }

  /**
   * Reset form to empty state
   */
  reset() {
    this.#data = {
      name: '',
      email: '',
      phone: '',
      country: '',
      notes: '',
      channelPreference: 'email',
    }
    this.#errors = []
  }

  /**
   * Get required fields
   * @returns {string[]}
   */
  getRequiredFields() {
    return [...this.#requiredFields]
  }

  /**
   * Get all available fields
   * @returns {string[]}
   */
  getFields() {
    return Object.keys(this.#data)
  }

  // ── Private Methods ──

  #clearFieldError(field) {
    this.#errors = this.#errors.filter(e => !e.toLowerCase().includes(field.toLowerCase()))
  }

  #isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  #isValidPhone(phone) {
    return /^[\+]?[\d\s\-\(\)]{7,20}$/.test(phone)
  }

  #capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}
