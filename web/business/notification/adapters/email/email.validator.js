/**
 * P15.11.5 — Email Delivery Adapter
 *
 * Email validation with security protections:
 * - XSS prevention
 * - CRLF injection prevention
 * - Header injection prevention
 * - Email address validation
 * - Size limits
 */

import {
  EmailValidationError,
  EmailRecipientError,
  EmailHeaderInjectionError
} from './email.errors.js'

export class EmailValidator {
  #maxSubjectLength
  #maxBodyLength
  #maxHeaderLength

  constructor(options = {}) {
    this.#maxSubjectLength = options.maxSubjectLength || 200
    this.#maxBodyLength = options.maxBodyLength || 50000
    this.#maxHeaderLength = options.maxHeaderLength || 500
  }

  validateNotification(notification) {
    if (!notification) {
      return { valid: false, error: 'Notification is required' }
    }

    if (!notification.id) {
      return { valid: false, error: 'Notification ID is required' }
    }

    if (!notification.applicationId) {
      return { valid: false, error: 'Application ID is required' }
    }

    const recipients = notification.recipients || []
    if (recipients.length === 0) {
      return { valid: false, error: 'At least one recipient is required' }
    }

    for (const recipient of recipients) {
      const recipientValidation = this.validateRecipient(recipient)
      if (!recipientValidation.valid) {
        return recipientValidation
      }
    }

    if (notification.payload) {
      const payloadValidation = this.validatePayload(notification.payload)
      if (!payloadValidation.valid) {
        return payloadValidation
      }
    }

    return { valid: true }
  }

  validateRecipient(recipient) {
    if (!recipient || typeof recipient !== 'object') {
      return { valid: false, error: 'Recipient must be an object' }
    }

    if (!recipient.type) {
      return { valid: false, error: 'Recipient type is required' }
    }

    const validTypes = ['COMPANY_CONTACT', 'company_contact', 'APPLICATION_OWNER', 'application_owner', 'CUSTOMER', 'customer']
    if (!validTypes.includes(recipient.type)) {
      return { valid: false, error: `Invalid recipient type: ${recipient.type}` }
    }

    if (!recipient.address) {
      return { valid: false, error: 'Recipient address is required' }
    }

    if (!this.isValidEmailAddress(recipient.address)) {
      return { valid: false, error: `Invalid email address: ${recipient.address}`, code: 'INVALID_RECIPIENT' }
    }

    return { valid: true }
  }

  validatePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' }
    }

    if (payload.subject && payload.subject.length > this.#maxSubjectLength) {
      return { valid: false, error: `Subject exceeds maximum length: ${this.#maxSubjectLength}` }
    }

    if (payload.text && payload.text.length > this.#maxBodyLength) {
      return { valid: false, error: `Body text exceeds maximum length: ${this.#maxBodyLength}` }
    }

    if (payload.html && payload.html.length > this.#maxBodyLength) {
      return { valid: false, error: `HTML body exceeds maximum length: ${this.#maxBodyLength}` }
    }

    return { valid: true }
  }

  isValidEmailAddress(address) {
    if (!address || typeof address !== 'string') {
      return false
    }

    const trimmed = address.trim()

    if (trimmed.length > 254) {
      return false
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

    if (!emailRegex.test(trimmed)) {
      return false
    }

    const [localPart, domain] = trimmed.split('@')

    if (localPart.length > 64) {
      return false
    }

    if (domain.length > 253) {
      return false
    }

    if (!domain.includes('.')) {
      return false
    }

    return true
  }

  sanitizeEmailAddress(address) {
    if (!address) return null

    const trimmed = String(address).trim().toLowerCase()

    return trimmed.substring(0, 254)
  }

  sanitizeHeaderValue(value) {
    if (!value) return null

    const str = String(value)

    if (this.containsCRLF(str)) {
      throw new EmailHeaderInjectionError('Header value contains CRLF injection')
    }

    return str.substring(0, this.#maxHeaderLength)
  }

  sanitizeSubject(subject) {
    if (!subject) return ''

    const str = String(subject)

    if (this.containsCRLF(str)) {
      return this.removeCRLF(str)
    }

    return this.escapeHtml(str)
  }

  containsCRLF(value) {
    if (!value) return false
    const str = String(value)
    return str.includes('\r') || str.includes('\n')
  }

  removeCRLF(value) {
    return String(value).replace(/\r\n|\n\r|\r|\n/g, ' ')
  }

  escapeHtml(text) {
    if (!text) return ''

    const htmlEscapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }

    return String(text).replace(/[&<>"'/]/g, char => htmlEscapeMap[char])
  }

  sanitizeHtmlForEmail(html) {
    if (!html) return ''

    let sanitized = String(html)

    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    sanitized = sanitized.replace(/\bon\w+\s*=/gi, ' data-removed=')
    sanitized = sanitized.replace(/javascript:/gi, '')
    sanitized = sanitized.replace(/<iframe/gi, '&lt;iframe')
    sanitized = sanitized.replace(/<object/gi, '&lt;object')
    sanitized = sanitized.replace(/<embed/gi, '&lt;embed')

    return sanitized
  }

  validateFromAddress(from) {
    if (!from) {
      return { valid: false, error: 'From address is required' }
    }

    if (!this.isValidEmailAddress(from)) {
      return { valid: false, error: `Invalid from address: ${from}` }
    }

    return { valid: true }
  }

  validateReplyTo(replyTo) {
    if (!replyTo) {
      return { valid: true }
    }

    if (!this.isValidEmailAddress(replyTo)) {
      return { valid: false, error: `Invalid reply-to address: ${replyTo}` }
    }

    return { valid: true }
  }
}

export default EmailValidator
