/**
 * P15.11.2 — Quote Capability Core
 *
 * Deterministic calculation engine for quotes.
 */

import { QuoteResult, createQuoteResult } from './quote.model.js'
import { QuoteCalculationError, QuoteNumericOverflowError } from './quote.errors.js'

const MAX_NUMERIC_VALUE = 999999999999
const MIN_NUMERIC_VALUE = -999999999999

export class QuoteCalculator {
  #configuration

  constructor(configuration = {}) {
    this.#configuration = configuration
  }

  calculate(selections, options = {}) {
    const startTime = Date.now()

    if (!selections || typeof selections !== 'object') {
      throw new QuoteCalculationError('Selections are required')
    }

    const currency = this.#configuration.currency || 'CLP'
    const rounding = this.#configuration.rounding || { mode: 'nearest', precision: 0 }
    const taxConfig = this.#configuration.taxConfiguration || { enabled: false }
    const pricingRules = this.#configuration.pricingRules || []

    const baseOptions = this.#configuration.options || []
    const quantity = selections.quantity || 1

    const selectedOptionIds = new Set(selections.options || [])
    const selectedOptions = baseOptions.filter(o => selectedOptionIds.has(o.id))

    let subtotal = 0
    const lineItems = []
    const breakdown = {
      base: 0,
      additions: [],
      subtotal: 0,
      discounts: [],
      tax: 0,
      total: 0
    }

    for (const option of selectedOptions) {
      if (option.price === undefined || option.price === 0) {
        continue
      }

      let lineTotal = option.price * quantity

      if (option.priceType === 'multiplier') {
        lineTotal = option.price
      } else if (option.priceType === 'surcharge') {
        lineTotal = option.price
      }

      subtotal += lineTotal

      lineItems.push({
        id: option.id,
        label: option.label,
        category: option.category || null,
        price: option.price,
        priceType: option.priceType || 'fixed',
        quantity: quantity,
        total: lineTotal,
        metadata: option.metadata || {}
      })

      if (option.priceType === 'surcharge') {
        breakdown.additions.push({
          id: option.id,
          label: option.label,
          value: option.price
        })
      }
    }

    breakdown.base = subtotal
    breakdown.subtotal = subtotal

    let hasBaseRule = false
    const sortedRules = [...pricingRules].sort((a, b) => (a.order || 0) - (b.order || 0))

    for (const rule of sortedRules) {
      if (!this.#evaluateCondition(rule, selections)) {
        continue
      }

      switch (rule.type) {
        case 'base':
          hasBaseRule = true
          breakdown.base = this.#applyRuleValue(rule, breakdown.base, subtotal)
          subtotal = breakdown.base
          break

        case 'add':
          const addValue = this.#calculateRuleValue(rule, subtotal)
          subtotal += addValue
          breakdown.additions.push({
            id: rule.id,
            label: rule.label || rule.id,
            value: addValue
          })
          break

        case 'multiply':
          const multiplyValue = this.#calculateRuleValue(rule, subtotal)
          subtotal *= multiplyValue
          breakdown.additions.push({
            id: rule.id,
            label: rule.label || rule.id,
            value: multiplyValue,
            type: 'multiplier'
          })
          break

        case 'discount':
          const discountValue = this.#calculateRuleValue(rule, subtotal)
          subtotal -= discountValue
          breakdown.discounts.push({
            id: rule.id,
            label: rule.label || rule.id,
            value: discountValue
          })
          break

        case 'tax':
          if (taxConfig.enabled) {
            const taxRate = rule.value || taxConfig.rate || 0
            const taxValue = subtotal * taxRate
            subtotal += taxValue
            breakdown.tax = this.#roundValue(taxValue, rounding)
          }
          break

        case 'minimum':
          if (subtotal < rule.value) {
            subtotal = rule.value
          }
          break

        case 'maximum':
          if (subtotal > rule.value) {
            subtotal = rule.value
          }
          break
      }
    }

    breakdown.subtotal = subtotal

    let total = subtotal

    if (taxConfig.enabled && !pricingRules.some(r => r.type === 'tax')) {
      const taxRate = taxConfig.rate || 0
      if (taxConfig.included) {
        total = subtotal / (1 + taxRate)
        breakdown.tax = subtotal - total
      } else {
        breakdown.tax = subtotal * taxRate
        total = subtotal + breakdown.tax
      }
    }

    total = this.#roundValue(total, rounding)
    breakdown.total = total

    if (total < MIN_NUMERIC_VALUE || total > MAX_NUMERIC_VALUE) {
      throw new QuoteNumericOverflowError(total, MAX_NUMERIC_VALUE)
    }

    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + (options.validityDays || 7))
    validUntil.setHours(23, 59, 59, 999)

    const inputSummary = {
      selectedOptions: [...selectedOptionIds],
      quantity: quantity,
      optionCount: selectedOptions.length,
      fields: selections.fields || {}
    }

    const result = createQuoteResult({
      quoteRequestId: options.quoteRequestId,
      applicationId: options.applicationId,
      domain: options.domain,
      route: options.route,
      total: total,
      currency: currency,
      lineItems: lineItems,
      breakdown: breakdown,
      inputSummary: inputSummary,
      calculationMetadata: {
        calculatedAt: new Date().toISOString(),
        calculationDurationMs: Date.now() - startTime,
        roundingMode: rounding.mode,
        roundingPrecision: rounding.precision,
        pricingRulesApplied: sortedRules.length
      },
      validUntil: validUntil.toISOString(),
      createdAt: new Date().toISOString()
    })

    return result
  }

  #evaluateCondition(rule, selections) {
    if (!rule.condition) {
      return true
    }

    const { field, operator, value } = rule.condition
    const fieldValue = this.#getFieldValue(field, selections)

    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'greater':
        return typeof fieldValue === 'number' && fieldValue > value
      case 'less':
        return typeof fieldValue === 'number' && fieldValue < value
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value)
      default:
        return true
    }
  }

  #getFieldValue(field, selections) {
    if (!field) return null

    if (field.startsWith('selections.')) {
      const path = field.substring(11).split('.')
      let value = selections
      for (const key of path) {
        value = value?.[key]
      }
      return value
    }

    if (field.startsWith('options.')) {
      const optionId = field.substring(8)
      const option = (this.#configuration.options || []).find(o => o.id === optionId)
      return option?.price
    }

    return selections?.[field]
  }

  #calculateRuleValue(rule, baseValue) {
    if (rule.application === 'each' && rule.value) {
      return rule.value
    }
    if (rule.application === 'total') {
      return baseValue * (rule.value / 100)
    }
    return rule.value || 0
  }

  #applyRuleValue(rule, currentValue, subtotal) {
    if (rule.type === 'base') {
      return rule.value || currentValue
    }
    return currentValue
  }

  #roundValue(value, rounding) {
    const precision = rounding.precision || 0
    const multiplier = Math.pow(10, precision)

    switch (rounding.mode) {
      case 'up':
        return Math.ceil(value * multiplier) / multiplier
      case 'down':
        return Math.floor(value * multiplier) / multiplier
      case 'nearest':
        return Math.round(value * multiplier) / multiplier
      default:
        return value
    }
  }
}

export function createQuoteCalculator(configuration = {}) {
  return new QuoteCalculator(configuration)
}

export default {
  QuoteCalculator,
  createQuoteCalculator
}
