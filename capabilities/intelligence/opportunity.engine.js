/**
 * Opportunity Engine — Identifies opportunities from availability and demand data
 *
 * Business-agnostic: works with any resource type
 * Consumes data through DataManager only
 */

export class OpportunityEngine {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Find opportunities for a resource
   * @param {string} resourceId - Resource ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {object[]} - Identified opportunities
   */
  findOpportunities(resourceId, startDate, endDate) {
    const opportunities = []

    const longEmptyPeriods = this.#findLongEmptyPeriods(resourceId, startDate, endDate)
    opportunities.push(...longEmptyPeriods)

    const highDemandGaps = this.#findHighDemandGaps(resourceId, startDate, endDate)
    opportunities.push(...highDemandGaps)

    const weekendPatterns = this.#findWeekendPatterns(resourceId, startDate, endDate)
    opportunities.push(...weekendPatterns)

    return opportunities
  }

  /**
   * Find opportunities across all resources
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {object[]} - All opportunities
   */
  findAll(startDate, endDate) {
    const resources = this.#getResources()
    const allOpportunities = []

    for (const resource of resources) {
      const opportunities = this.findOpportunities(resource.id, startDate, endDate)
      allOpportunities.push(...opportunities)
    }

    return allOpportunities.sort((a, b) => b.potentialImpact - a.potentialImpact)
  }

  /**
   * Find long empty periods (7+ consecutive available days)
   * @private
   */
  #findLongEmptyPeriods(resourceId, startDate, endDate) {
    const availability = this.#getAvailability(resourceId, startDate, endDate)
    const opportunities = []

    let currentPeriod = null
    const dateMap = new Map()
    for (const a of availability) {
      dateMap.set(a.date, a.status)
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const status = dateMap.get(dateStr)

      if (status === 'available' || !status) {
        if (!currentPeriod) {
          currentPeriod = { start: dateStr, end: dateStr, days: 1 }
        } else {
          currentPeriod.end = dateStr
          currentPeriod.days++
        }
      } else {
        if (currentPeriod && currentPeriod.days >= 7) {
          opportunities.push({
            id: `opp_empty_${resourceId}_${currentPeriod.start}`,
            resourceId,
            tenantId: this.#context?.tenant?.id,
            type: 'long_empty_period',
            title: `Período vacío de ${currentPeriod.days} días`,
            description: `${currentPeriod.days} días consecutivos disponibles (${currentPeriod.start} al ${currentPeriod.end})`,
            date: currentPeriod.start,
            endDate: currentPeriod.end,
            potentialImpact: currentPeriod.days * 10,
            confidence: 0.8,
            metadata: { days: currentPeriod.days, type: 'empty_period' },
            createdAt: new Date().toISOString(),
          })
        }
        currentPeriod = null
      }
    }

    return opportunities
  }

  /**
   * Find gaps between high-demand dates
   * @private
   */
  #findHighDemandGaps(resourceId, startDate, endDate) {
    const bookings = this.#getBookings(resourceId, startDate, endDate)
    const opportunities = []

    const bookedDates = new Set()
    for (const b of bookings) {
      bookedDates.add(b.date)
    }

    const sortedBooked = [...bookedDates].sort()
    if (sortedBooked.length < 2) return opportunities

    for (let i = 0; i < sortedBooked.length - 1; i++) {
      const current = new Date(sortedBooked[i])
      const next = new Date(sortedBooked[i + 1])
      const diffDays = (next - current) / (1000 * 60 * 60 * 24)

      if (diffDays > 1 && diffDays <= 3) {
        opportunities.push({
          id: `opp_gap_${resourceId}_${sortedBooked[i]}`,
          resourceId,
          tenantId: this.#context?.tenant?.id,
          type: 'demand_gap',
          title: `Brecha entre reservas`,
          description: `Espacio de ${diffDays - 1} días entre ${sortedBooked[i]} y ${sortedBooked[i + 1]}`,
          date: sortedBooked[i],
          endDate: sortedBooked[i + 1],
          potentialImpact: (diffDays - 1) * 15,
          confidence: 0.7,
          metadata: { gapDays: diffDays - 1, type: 'demand_gap' },
          createdAt: new Date().toISOString(),
        })
      }
    }

    return opportunities
  }

  /**
   * Find weekend availability patterns
   * @private
   */
  #findWeekendPatterns(resourceId, startDate, endDate) {
    const availability = this.#getAvailability(resourceId, startDate, endDate)
    const opportunities = []

    let weekendAvailable = 0
    let totalWeekends = 0

    for (const a of availability) {
      const date = new Date(a.date)
      const dayOfWeek = date.getDay()

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        totalWeekends++
        if (a.status === 'available') {
          weekendAvailable++
        }
      }
    }

    if (totalWeekends > 0 && weekendAvailable === totalWeekends) {
      opportunities.push({
        id: `opp_weekend_${resourceId}`,
        resourceId,
        tenantId: this.#context?.tenant?.id,
        type: 'weekend_availability',
        title: 'Fines de semana disponibles',
        description: `Todos los fines de semana están disponibles en el período`,
        date: startDate,
        endDate,
        potentialImpact: totalWeekends * 20,
        confidence: 0.9,
        metadata: { totalWeekends, available: weekendAvailable, type: 'weekend_pattern' },
        createdAt: new Date().toISOString(),
      })
    }

    return opportunities
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
   * Get resources from DataManager
   * @private
   */
  #getResources() {
    return this.#context?.dataManager?.get('resources') || []
  }
}
