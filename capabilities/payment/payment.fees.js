import { PaymentCalculation } from './payment.calculation.js'
import { PaymentAmountError } from './payment.errors.js'

export const PLATFORM_COMMISSION_RATE = 0.10

export const CLEANING_FEE_TYPES = Object.freeze({
  FLAT: 'flat',
  PER_NIGHT: 'per_night',
  PER_GUEST: 'per_guest',
  PERCENTAGE: 'percentage',
})

export const SERVICE_FEE_TYPES = Object.freeze({
  FLAT: 'flat',
  PERCENTAGE: 'percentage',
  TIERED: 'tiered',
})

export class PaymentFees {
  static calculatePlatformCommission(subtotal, rate = PLATFORM_COMMISSION_RATE) {
    PaymentCalculation.validateAmount(subtotal, 'subtotal')
    if (typeof rate !== 'number' || rate < 0 || rate > 1) {
      throw new PaymentAmountError('Commission rate must be between 0 and 1')
    }
    return Math.round(subtotal * rate * 100) / 100
  }

  static calculateCleaningFee(baseAmount, type, options = {}) {
    PaymentCalculation.validateAmount(baseAmount, 'baseAmount')

    const feeTypes = Object.values(CLEANING_FEE_TYPES)
    if (!feeTypes.includes(type)) {
      throw new PaymentAmountError(`Invalid cleaning fee type: ${type}`)
    }

    switch (type) {
      case CLEANING_FEE_TYPES.FLAT:
        return Math.round((options.amount || 0) * 100) / 100

      case CLEANING_FEE_TYPES.PER_NIGHT:
        return Math.round((options.amount || 0) * (options.nights || 1) * 100) / 100

      case CLEANING_FEE_TYPES.PER_GUEST:
        return Math.round((options.amount || 0) * (options.guests || 1) * 100) / 100

      case CLEANING_FEE_TYPES.PERCENTAGE:
        return Math.round(baseAmount * (options.rate || 0) * 100) / 100

      default:
        return 0
    }
  }

  static calculateServiceFee(subtotal, type, options = {}) {
    PaymentCalculation.validateAmount(subtotal, 'subtotal')

    const feeTypes = Object.values(SERVICE_FEE_TYPES)
    if (!feeTypes.includes(type)) {
      throw new PaymentAmountError(`Invalid service fee type: ${type}`)
    }

    switch (type) {
      case SERVICE_FEE_TYPES.FLAT:
        return Math.round((options.amount || 0) * 100) / 100

      case SERVICE_FEE_TYPES.PERCENTAGE:
        return Math.round(subtotal * (options.rate || 0) * 100) / 100

      case SERVICE_FEE_TYPES.TIERED:
        return PaymentCalculation.calculateTieredFee(subtotal, options.tiers || [])

      default:
        return 0
    }
  }

  static calculateTax(subtotal, rate) {
    PaymentCalculation.validateAmount(subtotal, 'subtotal')
    if (typeof rate !== 'number' || rate < 0) {
      throw new PaymentAmountError('Tax rate must be a non-negative number')
    }
    return Math.round(subtotal * rate * 100) / 100
  }

  static calculateDiscount(subtotal, discount, type = 'percentage') {
    PaymentCalculation.validateAmount(subtotal, 'subtotal')
    PaymentCalculation.validateAmount(discount, 'discount')

    if (type === 'percentage') {
      if (discount > 1) {
        discount = discount / 100
      }
      return Math.round(subtotal * discount * 100) / 100
    }

    return Math.min(discount, subtotal)
  }

  static calculateCouponDiscount(subtotal, coupon) {
    PaymentCalculation.validateAmount(subtotal, 'subtotal')

    if (!coupon || !coupon.type) {
      return 0
    }

    switch (coupon.type) {
      case 'percentage':
        const percentageDiscount = subtotal * (coupon.value / 100)
        const maxDiscount = coupon.maxDiscount || Infinity
        return Math.round(Math.min(percentageDiscount, maxDiscount) * 100) / 100

      case 'fixed':
        return Math.min(coupon.value, subtotal)

      case 'free_night':
        return coupon.nightValue || 0

      default:
        return 0
    }
  }

  static calculateManualAdjustment(subtotal, adjustment, reason = '') {
    PaymentCalculation.validateAmount(subtotal, 'subtotal')
    PaymentCalculation.validateAmount(adjustment, 'adjustment')

    if (!reason) {
      throw new PaymentAmountError('Manual adjustment requires a reason')
    }

    const newSubtotal = subtotal + adjustment
    if (newSubtotal < 0) {
      throw new PaymentAmountError('Adjustment would result in negative subtotal')
    }

    return {
      adjustment,
      reason,
      originalSubtotal: subtotal,
      newSubtotal: Math.round(newSubtotal * 100) / 100,
    }
  }

  static calculateAllFees(subtotal, options = {}) {
    PaymentCalculation.validateAmount(subtotal, 'subtotal')

    const {
      platformCommissionRate = PLATFORM_COMMISSION_RATE,
      cleaningFee = null,
      serviceFee = null,
      taxRate = 0,
      discount = null,
      coupon = null,
      adjustments = [],
    } = options

    const breakdown = {
      subtotal,
      platformCommission: 0,
      cleaningFee: 0,
      serviceFee: 0,
      taxes: 0,
      discount: 0,
      couponDiscount: 0,
      adjustments: 0,
    }

    let taxableAmount = subtotal

    if (cleaningFee) {
      breakdown.cleaningFee = this.calculateCleaningFee(
        subtotal,
        cleaningFee.type,
        cleaningFee.options
      )
      taxableAmount += breakdown.cleaningFee
    }

    if (serviceFee) {
      breakdown.serviceFee = this.calculateServiceFee(
        subtotal,
        serviceFee.type,
        serviceFee.options
      )
    }

    breakdown.platformCommission = this.calculatePlatformCommission(subtotal, platformCommissionRate)

    if (discount) {
      breakdown.discount = this.calculateDiscount(subtotal, discount.value, discount.type || 'percentage')
    }

    if (coupon) {
      breakdown.couponDiscount = this.calculateCouponDiscount(subtotal, coupon)
    }

    const totalDiscounts = breakdown.discount + breakdown.couponDiscount
    const afterDiscounts = subtotal - totalDiscounts

    breakdown.taxes = this.calculateTax(afterDiscounts + breakdown.cleaningFee, taxRate)

    for (const adj of adjustments) {
      breakdown.adjustments += adj.amount
    }

    const total = subtotal
      - totalDiscounts
      + breakdown.cleaningFee
      + breakdown.serviceFee
      + breakdown.platformCommission
      + breakdown.taxes
      + breakdown.adjustments

    return {
      breakdown,
      total: Math.round(total * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    }
  }
}
