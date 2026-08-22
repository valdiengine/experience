/**
 * P15.11.2 — Quote Capability Core
 *
 * Validation for Quote capability.
 */

import { QUOTE_CUSTOMER_FIELDS } from './quote.model.js'
import {
  QUOTE_ERROR_CODES,
  QuoteValidationError,
  QuoteMissingRequiredFieldError,
  QuoteInvalidOptionError,
  QuoteInvalidInputError,
  QuoteNumericOverflowError
} from './quote.errors.js'

const MAX_STRING_LENGTH = 2000
const MAX_NUMERIC_VALUE = 999999999999
const MIN_NUMERIC_VALUE = -999999999999

export class QuoteValidator {
  #errors
  #warnings
  #configuration

  constructor(configuration = {}) {
    this.#errors = []
    this.#warnings = []
    this.#configuration = configuration
  }

  validateConfiguration(config) {
    this.#errors = []
    this.#warnings = []

    if (!config || typeof config !== 'object') {
      this.#errors.push('Configuration must be an object')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (typeof config.enabled !== 'boolean') {
      this.#errors.push('Configuration must have enabled boolean')
    }

    if (config.title && typeof config.title !== 'string') {
      this.#errors.push('Title must be a string')
    }

    if (config.title && config.title.length > 200) {
      this.#errors.push('Title exceeds max length of 200')
    }

    if (config.description && typeof config.description !== 'string') {
      this.#errors.push('Description must be a string')
    }

    if (config.currency && !['CLP', 'USD', 'EUR'].includes(config.currency)) {
      this.#errors.push('Currency must be CLP, USD, or EUR')
    }

    if (config.fields && !Array.isArray(config.fields)) {
      this.#errors.push('Fields must be an array')
    } else if (config.fields) {
      this.#validateFields(config.fields)
    }

    if (config.options && !Array.isArray(config.options)) {
      this.#errors.push('Options must be an array')
    } else if (config.options) {
      this.#validateOptions(config.options)
    }

    if (config.pricingRules && !Array.isArray(config.pricingRules)) {
      this.#errors.push('PricingRules must be an array')
    } else if (config.pricingRules) {
      this.#validatePricingRules(config.pricingRules)
    }

    if (config.customerFields && !Array.isArray(config.customerFields)) {
      this.#errors.push('CustomerFields must be an array')
    } else if (config.customerFields) {
      this.#validateCustomerFields(config.customerFields)
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  #validateFields(fields) {
    const seenIds = new Set()
    for (const field of fields) {
      if (!field.id) {
        this.#errors.push('Field must have an id')
      } else {
        if (seenIds.has(field.id)) {
          this.#errors.push(`Duplicate field id: ${field.id}`)
        }
        seenIds.add(field.id)
      }

      if (!field.type) {
        this.#errors.push('Field must have a type')
      } else if (!['text', 'email', 'phone', 'select', 'checkbox', 'number', 'textarea'].includes(field.type)) {
        this.#errors.push(`Invalid field type: ${field.type}`)
      }

      if (!field.label) {
        this.#errors.push('Field must have a label')
      }

      if (field.placeholder && typeof field.placeholder !== 'string') {
        this.#errors.push('Field placeholder must be a string')
      }

      if (field.options && !Array.isArray(field.options)) {
        this.#errors.push('Field options must be an array')
      }
    }
  }

  #validateOptions(options) {
    const seenIds = new Set()
    for (const option of options) {
      if (!option.id) {
        this.#errors.push('Option must have an id')
      } else {
        if (seenIds.has(option.id)) {
          this.#errors.push(`Duplicate option id: ${option.id}`)
        }
        seenIds.add(option.id)
      }

      if (!option.label) {
        this.#errors.push('Option must have a label')
      }

      if (option.price !== undefined) {
        if (typeof option.price !== 'number') {
          this.#errors.push('Option price must be a number')
        } else if (option.price < MIN_NUMERIC_VALUE || option.price > MAX_NUMERIC_VALUE) {
          this.#errors.push(`Option price exceeds valid range: ${option.price}`)
        }
      }

      if (option.priceType && !['fixed', 'multiplier', 'surcharge'].includes(option.priceType)) {
        this.#errors.push(`Invalid option priceType: ${option.priceType}`)
      }
    }
  }

  #validatePricingRules(rules) {
    const seenIds = new Set()
    for (const rule of rules) {
      if (!rule.id) {
        this.#errors.push('PricingRule must have an id')
      } else {
        if (seenIds.has(rule.id)) {
          this.#errors.push(`Duplicate pricing rule id: ${rule.id}`)
        }
        seenIds.add(rule.id)
      }

      if (!rule.type) {
        this.#errors.push('PricingRule must have a type')
      } else if (!['base', 'add', 'multiply', 'discount', 'tax', 'minimum', 'maximum'].includes(rule.type)) {
        this.#errors.push(`Invalid pricing rule type: ${rule.type}`)
      }

      if (rule.value === undefined || typeof rule.value !== 'number') {
        this.#errors.push('PricingRule must have a numeric value')
      } else if (rule.value < MIN_NUMERIC_VALUE || rule.value > MAX_NUMERIC_VALUE) {
        this.#errors.push(`PricingRule value exceeds valid range: ${rule.value}`)
      }
    }
  }

  #validateCustomerFields(fields) {
    const seenIds = new Set()
    for (const field of fields) {
      if (!field.id) {
        this.#errors.push('CustomerField must have an id')
      } else {
        if (seenIds.has(field.id)) {
          this.#errors.push(`Duplicate customer field id: ${field.id}`)
        }
        seenIds.add(field.id)
      }

      if (!field.type) {
        this.#errors.push('CustomerField must have a type')
      } else if (!['text', 'email', 'phone', 'textarea'].includes(field.type)) {
        this.#errors.push(`Invalid customer field type: ${field.type}`)
      }

      if (!field.label) {
        this.#errors.push('CustomerField must have a label')
      }
    }
  }

  validateSelections(selections, configuration) {
    this.#errors = []
    this.#warnings = []

    if (!selections || typeof selections !== 'object') {
      this.#errors.push('Selections must be an object')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (selections.options && !Array.isArray(selections.options)) {
      this.#errors.push('Selected options must be an array')
    } else if (selections.options && configuration.options) {
      const validOptionIds = new Set(configuration.options.map(o => o.id))
      for (const optionId of selections.options) {
        if (!validOptionIds.has(optionId)) {
          this.#errors.push(`Invalid option selected: ${optionId}`)
        }
      }
    }

    if (selections.fields && typeof selections.fields !== 'object') {
      this.#errors.push('Selected fields must be an object')
    }

    if (selections.quantity !== undefined) {
      if (typeof selections.quantity !== 'number') {
        this.#errors.push('Quantity must be a number')
      } else if (selections.quantity < 1) {
        this.#errors.push('Quantity must be at least 1')
      } else if (selections.quantity > 10000) {
        this.#errors.push('Quantity exceeds maximum allowed (10000)')
      }
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  validateCustomerData(customerData, configuration) {
    this.#errors = []
    this.#warnings = []

    if (!customerData || typeof customerData !== 'object') {
      this.#errors.push('Customer data must be an object')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    const requiredFields = configuration.customerFields?.filter(f => f.required) || []
    for (const field of requiredFields) {
      if (!customerData[field.id]) {
        this.#errors.push(`Missing required customer field: ${field.id}`)
      }
    }

    if (customerData.name) {
      if (typeof customerData.name !== 'string') {
        this.#errors.push('Customer name must be a string')
      } else if (customerData.name.length > MAX_STRING_LENGTH) {
        this.#errors.push('Customer name exceeds max length')
      }
    }

    if (customerData.email) {
      if (typeof customerData.email !== 'string') {
        this.#errors.push('Customer email must be a string')
      } else if (!this.#isValidEmail(customerData.email)) {
        this.#errors.push('Customer email is invalid')
      }
    }

    if (customerData.phone) {
      if (typeof customerData.phone !== 'string') {
        this.#errors.push('Customer phone must be a string')
      } else if (customerData.phone.length > 20) {
        this.#errors.push('Customer phone exceeds max length')
      }
    }

    if (customerData.message) {
      if (typeof customerData.message !== 'string') {
        this.#errors.push('Customer message must be a string')
      } else if (customerData.message.length > MAX_STRING_LENGTH) {
        this.#errors.push('Customer message exceeds max length')
      }
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  #isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  validateNumericInput(value, fieldName) {
    if (typeof value !== 'number') {
      throw new QuoteInvalidInputError(fieldName, 'Must be a number')
    }

    if (value < MIN_NUMERIC_VALUE || value > MAX_NUMERIC_VALUE) {
      throw new QuoteNumericOverflowError(value, MAX_NUMERIC_VALUE)
    }

    if (value < 0 && fieldName !== 'discount') {
      throw new QuoteInvalidInputError(fieldName, 'Cannot be negative')
    }

    return true
  }
}

export function createQuoteValidator(configuration = {}) {
  return new QuoteValidator(configuration)
}

export function validateQuoteConfiguration(config) {
  const validator = new QuoteValidator()
  return validator.validateConfiguration(config)
}

export function validateQuoteSelections(selections, configuration) {
  const validator = new QuoteValidator(configuration)
  return validator.validateSelections(selections, configuration)
}

export function validateQuoteCustomerData(customerData, configuration) {
  const validator = new QuoteValidator(configuration)
  return validator.validateCustomerData(customerData, configuration)
}

export default {
  QuoteValidator,
  createQuoteValidator,
  validateQuoteConfiguration,
  validateQuoteSelections,
  validateQuoteCustomerData,
  MAX_STRING_LENGTH,
  MAX_NUMERIC_VALUE,
  MIN_NUMERIC_VALUE
}
