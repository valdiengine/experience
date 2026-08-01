export class AccommodationPricing {
  static create(data) {
    return {
      basePrice: data.basePrice || 0,
      currency: data.currency || 'CLP',
      weekendPrice: data.weekendPrice || null,
      seasonPrice: data.seasonPrice || null,
      taxes: data.taxes || 0,
      cleaningFee: data.cleaningFee || 0,
      commission: data.commission || 0,
    }
  }

  static calculateTotal(basePrice, nights, options = {}) {
    const { weekendPrice, seasonPrice, taxes, cleaningFee, commission } = options
    let total = basePrice * nights
    if (weekendPrice) total += weekendPrice
    if (seasonPrice) total += seasonPrice
    if (taxes) total += total * (taxes / 100)
    if (cleaningFee) total += cleaningFee
    if (commission) total += total * (commission / 100)
    return Math.round(total * 100) / 100
  }

  static toPayload(pricing) {
    return {
      base_price: pricing.basePrice,
      currency: pricing.currency,
      weekend_price: pricing.weekendPrice,
      season_price: pricing.seasonPrice,
      taxes_percentage: pricing.taxes,
      cleaning_fee: pricing.cleaningFee,
      commission_percentage: pricing.commission,
    }
  }
}
