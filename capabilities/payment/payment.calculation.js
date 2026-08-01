import { PaymentAmountError } from './payment.errors.js'

export class PaymentCalculation {
  static calculateTotal({ subtotal, discount = 0, couponDiscount = 0, cleaningFee = 0, serviceFee = 0, platformCommission = 0, taxes = 0, adjustments = 0 }) {
    this.validateAmount(subtotal, 'subtotal')
    this.validateAmount(discount, 'discount')
    this.validateAmount(couponDiscount, 'couponDiscount')
    this.validateAmount(cleaningFee, 'cleaningFee')
    this.validateAmount(serviceFee, 'serviceFee')
    this.validateAmount(platformCommission, 'platformCommission')
    this.validateAmount(taxes, 'taxes')
    this.validateAmount(adjustments, 'adjustments')

    const total = subtotal
      - discount
      - couponDiscount
      + cleaningFee
      + serviceFee
      + platformCommission
      + taxes
      + adjustments

    return Math.round(total * 100) / 100
  }

  static calculateBalance(total, paidAmount, refundedAmount = 0) {
    this.validateAmount(total, 'total')
    this.validateAmount(paidAmount, 'paidAmount')
    this.validateAmount(refundedAmount, 'refundedAmount')

    const remaining = total - paidAmount
    const refundable = paidAmount - refundedAmount

    return {
      remainingAmount: Math.round(remaining * 100) / 100,
      refundableAmount: Math.round(refundable * 100) / 100,
      isFullyPaid: remaining <= 0,
      isFullyRefunded: refundable <= 0,
    }
  }

  static calculateTaxes(subtotal, taxRate) {
    this.validateAmount(subtotal, 'subtotal')
    if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 1) {
      throw new PaymentAmountError('Tax rate must be between 0 and 1')
    }
    return Math.round(subtotal * taxRate * 100) / 100
  }

  static calculateCommission(subtotal, commissionRate) {
    this.validateAmount(subtotal, 'subtotal')
    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 1) {
      throw new PaymentAmountError('Commission rate must be between 0 and 1')
    }
    return Math.round(subtotal * commissionRate * 100) / 100
  }

  static calculateFees(subtotal, feeRules = []) {
    this.validateAmount(subtotal, 'subtotal')
    if (!Array.isArray(feeRules)) {
      feeRules = []
    }

    let totalFees = 0
    const feeBreakdown = []

    for (const rule of feeRules) {
      let feeAmount = 0
      if (rule.type === 'flat') {
        feeAmount = rule.amount || 0
      } else if (rule.type === 'percentage') {
        feeAmount = subtotal * (rule.rate || 0)
      } else if (rule.type === 'tiered') {
        feeAmount = this.calculateTieredFee(subtotal, rule.tiers || [])
      }
      feeAmount = Math.round(feeAmount * 100) / 100
      totalFees += feeAmount
      feeBreakdown.push({
        name: rule.name || 'fee',
        type: rule.type || 'flat',
        amount: feeAmount,
      })
    }

    return {
      totalFees: Math.round(totalFees * 100) / 100,
      breakdown: feeBreakdown,
    }
  }

  static calculateTieredFee(amount, tiers) {
    if (!Array.isArray(tiers) || tiers.length === 0) return 0

    const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold)
    let fee = 0
    let remaining = amount

    for (const tier of sortedTiers) {
      if (remaining <= 0) break
      const tierAmount = Math.min(remaining, tier.threshold)
      fee += tierAmount * (tier.rate || 0)
      remaining -= tierAmount
    }

    return fee
  }

  static validateAmount(amount, fieldName = 'amount') {
    if (amount === undefined || amount === null) {
      throw new PaymentAmountError(`${fieldName} is required`)
    }
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new PaymentAmountError(`${fieldName} must be a valid number`)
    }
    if (amount < 0) {
      throw new PaymentAmountError(`${fieldName} cannot be negative`, amount)
    }
    return amount
  }

  static splitPayment(total, parts) {
    this.validateAmount(total, 'total')
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new PaymentAmountError('Parts must be a non-empty array')
    }

    const totalParts = parts.reduce((sum, p) => sum + (p.amount || 0), 0)
    if (Math.abs(totalParts - total) > 0.01) {
      throw new PaymentAmountError(`Parts sum ${totalParts} does not match total ${total}`)
    }

    return parts.map((part, index) => ({
      ...part,
      partNumber: index + 1,
      totalParts: parts.length,
    }))
  }

  static calculatePartialPayment(total, paidAmount) {
    this.validateAmount(total, 'total')
    this.validateAmount(paidAmount, 'paidAmount')

    if (paidAmount > total) {
      throw new PaymentAmountError(`Paid amount ${paidAmount} exceeds total ${total}`, paidAmount)
    }

    const remaining = total - paidAmount
    const percentage = total > 0 ? (paidAmount / total) * 100 : 0

    return {
      total,
      paidAmount,
      remainingAmount: Math.round(remaining * 100) / 100,
      percentagePaid: Math.round(percentage * 100) / 100,
      isPartial: paidAmount > 0 && remaining > 0,
      isComplete: remaining <= 0,
    }
  }
}
