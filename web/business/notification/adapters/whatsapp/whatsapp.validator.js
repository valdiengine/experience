/**
 * P15.11.6 — WhatsApp Business Adapter
 *
 * Phone number validation with E.164 normalization.
 */

import {
  WhatsAppValidationError,
  WhatsAppRecipientError
} from './whatsapp.errors.js'

export class PhoneValidator {
  #maxLength

  constructor(options = {}) {
    this.#maxLength = options.maxLength || 20
  }

  validatePhoneNumber(phone) {
    if (!phone) {
      return { valid: false, error: 'Phone number is required' }
    }

    if (typeof phone !== 'string') {
      return { valid: false, error: 'Phone number must be a string' }
    }

    const normalized = this.normalizePhoneNumber(phone)

    if (!normalized) {
      return { valid: false, error: 'Invalid phone number format' }
    }

    if (normalized.length > this.#maxLength) {
      return { valid: false, error: `Phone number exceeds maximum length: ${this.#maxLength}` }
    }

    if (this.containsInvalidCharacters(normalized)) {
      return { valid: false, error: 'Phone number contains invalid characters' }
    }

    if (this.containsInjectionAttempt(normalized)) {
      return { valid: false, error: 'Phone number contains suspicious patterns' }
    }

    return { valid: true, normalized }
  }

  normalizePhoneNumber(phone) {
    if (!phone) return null

    let str = String(phone).trim()

    str = str.replace(/[\s\-\(\)\.]/g, '')

    if (str.startsWith('00')) {
      str = '+' + str.substring(2)
    }

    if (!str.startsWith('+') && /^\d+$/.test(str)) {
      str = '+' + str
    }

    if (!/^\+\d{7,15}$/.test(str)) {
      return null
    }

    return str
  }

  containsInvalidCharacters(phone) {
    if (!phone) return false
    return !/^\+\d*$/.test(phone)
  }

  containsInjectionAttempt(phone) {
    if (!phone) return false
    const suspicious = [
      /javascript:/i,
      /data:/i,
      /<\w+/i,
      /\x00/,
      /\r|\n/
    ]
    return suspicious.some(pattern => pattern.test(phone))
  }

  isValidE164(phone) {
    if (!phone) return false
    const normalized = this.normalizePhoneNumber(phone)
    if (!normalized) return false
    return /^\+\d{7,15}$/.test(normalized)
  }

  sanitizePhoneNumber(phone) {
    if (!phone) return null
    const normalized = this.normalizePhoneNumber(phone)
    return normalized?.substring(0, this.#maxLength) || null
  }
}

export default PhoneValidator
