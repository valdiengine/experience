/**
 * Demand Analyzer — Analyzes demand patterns from availability and booking data
 *
 * Business-agnostic: works with any resource type
 * Consumes data through DataManager only
 */
import { DEMAND_LEVEL } from './intelligence.schema.js'

export class DemandAnalyzer {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Analyze demand for a resource in a date range
   * @param {string} resourceId - Resource ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {object[]} - Demand signals
   */
  analyze(resourceId, startDate, endDate) {
    const bookings = this.#getBookings(resourceId, startDate, endDate)
    const availability = this.#getAvailability(resourceId, startDate, endDate)
    const requests = this.#getRequests(resourceId, startDate, endDate)

    const signals = []

    const dateMap = new Map()
    for (const a of availability) {
      dateMap.set(a.date, a)
    }

    const bookingCountByDate = new Map()
    for (const b of bookings) {
      const date = b.date || b.createdAt?.split('T')[0]
      if (date) {
        bookingCountByDate.set(date, (bookingCountByDate.get(date) || 0) + 1)
      }
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const bookingCount = bookingCountByDate.get(dateStr) || 0
      const avail = dateMap.get(dateStr)
      const requestCount = requests.filter(r => r.date === dateStr).length

      const level = this.#calculateDemandLevel(bookingCount, requestCount, avail)

      if (level !== DEMAND_LEVEL.LOW) {
        signals.push({
          id: `demand_${resourceId}_${dateStr}`,
          resourceId,
          tenantId: this.#context?.tenant?.id,
          date: dateStr,
          level,
          source: this.#determineSource(bookingCount, requestCount),
          confidence: this.#calculateConfidence(bookingCount, requestCount),
          metadata: {
            bookingCount,
            requestCount,
            availabilityStatus: avail?.status,
          },
          createdAt: new Date().toISOString(),
        })
      }
    }

    return signals
  }

  /**
   * Analyze demand trends across all resources
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {object} - Aggregated demand data
   */
  analyzeTrends(startDate, endDate) {
    const resources = this.#getResources()
    const allSignals = []

    for (const resource of resources) {
      const signals = this.analyze(resource.id, startDate, endDate)
      allSignals.push(...signals)
    }

    const highDemandDates = allSignals
      .filter(s => s.level === DEMAND_LEVEL.HIGH || s.level === DEMAND_LEVEL.VERY_HIGH)
      .map(s => s.date)

    const uniqueHighDemandDates = [...new Set(highDemandDates)]

    return {
      totalSignals: allSignals.length,
      highDemandDates: uniqueHighDemandDates,
      demandByLevel: {
        low: allSignals.filter(s => s.level === DEMAND_LEVEL.LOW).length,
        moderate: allSignals.filter(s => s.level === DEMAND_LEVEL.MODERATE).length,
        high: allSignals.filter(s => s.level === DEMAND_LEVEL.HIGH).length,
        veryHigh: allSignals.filter(s => s.level === DEMAND_LEVEL.VERY_HIGH).length,
      },
    }
  }

  /**
   * Predict demand for future dates based on historical patterns
   * @param {string} resourceId - Resource ID
   * @param {string} startDate - Start date
   * @param {number} days - Number of days to predict
   * @returns {object[]} - Predicted demand signals
   */
  predictDemand(resourceId, startDate, days = 30) {
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + days)

    const historicalStart = new Date(startDate)
    historicalStart.setMonth(historicalStart.getMonth() - 3)

    const historicalSignals = this.analyze(
      resourceId,
      historicalStart.toISOString().split('T')[0],
      startDate
    )

    const dayOfWeekDemand = new Map()
    for (const signal of historicalSignals) {
      const date = new Date(signal.date)
      const dayOfWeek = date.getDay()
      const existing = dayOfWeekDemand.get(dayOfWeek) || { count: 0, levels: [] }
      existing.count++
      existing.levels.push(signal.level)
      dayOfWeekDemand.set(dayOfWeek, existing)
    }

    const predictions = []
    const current = new Date(startDate)

    for (let i = 0; i < days; i++) {
      const dateStr = current.toISOString().split('T')[0]
      const dayOfWeek = current.getDay()
      const dayData = dayOfWeekDemand.get(dayOfWeek)

      if (dayData && dayData.count > 0) {
        const highCount = dayData.levels.filter(l =>
          l === DEMAND_LEVEL.HIGH || l === DEMAND_LEVEL.VERY_HIGH
        ).length

        const confidence = highCount / dayData.count

        if (confidence > 0.3) {
          predictions.push({
            id: `predict_${resourceId}_${dateStr}`,
            resourceId,
            tenantId: this.#context?.tenant?.id,
            date: dateStr,
            level: confidence > 0.7 ? DEMAND_LEVEL.HIGH : DEMAND_LEVEL.MODERATE,
            source: 'prediction',
            confidence,
            metadata: {
              dayOfWeek,
              historicalCount: dayData.count,
            },
            createdAt: new Date().toISOString(),
          })
        }
      }

      current.setDate(current.getDate() + 1)
    }

    return predictions
  }

  /**
   * Calculate demand level
   * @private
   */
  #calculateDemandLevel(bookingCount, requestCount, availability) {
    const score = bookingCount * 2 + requestCount

    if (score >= 5) return DEMAND_LEVEL.VERY_HIGH
    if (score >= 3) return DEMAND_LEVEL.HIGH
    if (score >= 1) return DEMAND_LEVEL.MODERATE
    return DEMAND_LEVEL.LOW
  }

  /**
   * Determine demand source
   * @private
   */
  #determineSource(bookingCount, requestCount) {
    if (bookingCount > 0 && requestCount > 0) return 'bookings_and_requests'
    if (bookingCount > 0) return 'bookings'
    if (requestCount > 0) return 'requests'
    return 'unknown'
  }

  /**
   * Calculate confidence level
   * @private
   */
  #calculateConfidence(bookingCount, requestCount) {
    const total = bookingCount + requestCount
    if (total >= 5) return 0.9
    if (total >= 3) return 0.7
    if (total >= 1) return 0.5
    return 0.3
  }

  /**
   * Get bookings from DataManager
   * @private
   */
  #getBookings(resourceId, startDate, endDate) {
    const bookings = this.#context?.dataManager?.get('bookings') || []
    return bookings.filter(b =>
      b.resourceId === resourceId &&
      b.date >= startDate &&
      b.date <= endDate
    )
  }

  /**
   * Get availability from DataManager
   * @private
   */
  #getAvailability(resourceId, startDate, endDate) {
    const availability = this.#context?.dataManager?.get('availability') || []
    return availability.filter(a =>
      a.resourceId === resourceId &&
      a.date >= startDate &&
      a.date <= endDate
    )
  }

  /**
   * Get requests from DataManager
   * @private
   */
  #getRequests(resourceId, startDate, endDate) {
    const requests = this.#context?.dataManager?.get('availabilityRequests') || []
    return requests.filter(r =>
      r.resourceId === resourceId &&
      r.date >= startDate &&
      r.date <= endDate
    )
  }

  /**
   * Get resources from DataManager
   * @private
   */
  #getResources() {
    return this.#context?.dataManager?.get('resources') || []
  }
}
