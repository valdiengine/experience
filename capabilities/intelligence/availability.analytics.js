/**
 * Availability Analytics — Analyzes availability data and generates metrics
 *
 * Business-agnostic: works with any resource type
 * Consumes data through DataManager only
 */

export class AvailabilityAnalytics {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Analyze availability for a resource
   * @param {string} resourceId - Resource ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {object} - Availability metrics
   */
  analyze(resourceId, startDate, endDate) {
    const availabilityData = this.#getAvailabilityData(resourceId, startDate, endDate)
    const totalDays = this.#calculateDays(startDate, endDate)

    const metrics = {
      id: `metrics_${resourceId}_${Date.now()}`,
      resourceId,
      tenantId: this.#context?.tenant?.id,
      period: `${startDate} to ${endDate}`,
      totalDays,
      availableDays: 0,
      occupiedDays: 0,
      blockedDays: 0,
      tentativeDays: 0,
      occupancyRate: 0,
      emptyPeriods: [],
      responseTime: 0,
      updateFrequency: 0,
      createdAt: new Date().toISOString(),
    }

    for (const entry of availabilityData) {
      switch (entry.status) {
        case 'available':
          metrics.availableDays++
          break
        case 'unavailable':
          metrics.occupiedDays++
          break
        case 'blocked':
          metrics.blockedDays++
          break
        case 'tentative':
          metrics.tentativeDays++
          break
      }
    }

    metrics.occupancyRate = totalDays > 0
      ? (metrics.occupiedDays / totalDays) * 100
      : 0

    metrics.emptyPeriods = this.#findEmptyPeriods(availabilityData, startDate, endDate)

    const responseTimes = this.#calculateResponseTimes(resourceId)
    metrics.responseTime = responseTimes.average
    metrics.updateFrequency = responseTimes.frequency

    return metrics
  }

  /**
   * Analyze availability across all resources
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {object[]} - Array of metrics per resource
   */
  analyzeAll(startDate, endDate) {
    const resources = this.#getResources()
    return resources.map(resource => this.analyze(resource.id, startDate, endDate))
  }

  /**
   * Get occupancy trend for a resource
   * @param {string} resourceId - Resource ID
   * @param {number} months - Number of months to analyze
   * @returns {object[]} - Monthly occupancy rates
   */
  getOccupancyTrend(resourceId, months = 6) {
    const trend = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const metrics = this.analyze(
        resourceId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )

      trend.push({
        month: startDate.toISOString().split('T')[0].substring(0, 7),
        occupancyRate: metrics.occupancyRate,
        availableDays: metrics.availableDays,
        occupiedDays: metrics.occupiedDays,
      })
    }

    return trend
  }

  /**
   * Get empty periods (consecutive available days)
   * @param {string} resourceId - Resource ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {number} minDays - Minimum consecutive days
   * @returns {object[]} - Empty periods
   */
  getEmptyPeriods(resourceId, startDate, endDate, minDays = 3) {
    const availabilityData = this.#getAvailabilityData(resourceId, startDate, endDate)
    return this.#findEmptyPeriods(availabilityData, startDate, endDate, minDays)
  }

  /**
   * Calculate days between two dates
   * @private
   */
  #calculateDays(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  /**
   * Find empty periods (consecutive available days)
   * @private
   */
  #findEmptyPeriods(availabilityData, startDate, endDate, minDays = 1) {
    const periods = []
    let currentPeriod = null

    const dateMap = new Map()
    for (const entry of availabilityData) {
      dateMap.set(entry.date, entry.status)
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
        if (currentPeriod && currentPeriod.days >= minDays) {
          periods.push(currentPeriod)
        }
        currentPeriod = null
      }
    }

    if (currentPeriod && currentPeriod.days >= minDays) {
      periods.push(currentPeriod)
    }

    return periods
  }

  /**
   * Calculate response times from availability requests
   * @private
   */
  #calculateResponseTimes(resourceId) {
    const requests = this.#context?.dataManager?.get('availabilityRequests') || []
    const resourceRequests = requests.filter(r => r.resourceId === resourceId)

    if (resourceRequests.length === 0) {
      return { average: 0, frequency: 0 }
    }

    let totalTime = 0
    let respondedCount = 0

    for (const request of resourceRequests) {
      if (request.respondedAt && request.createdAt) {
        const created = new Date(request.createdAt)
        const responded = new Date(request.respondedAt)
        totalTime += responded - created
        respondedCount++
      }
    }

    return {
      average: respondedCount > 0 ? totalTime / respondedCount : 0,
      frequency: resourceRequests.length,
    }
  }

  /**
   * Get availability data from DataManager
   * @private
   */
  #getAvailabilityData(resourceId, startDate, endDate) {
    const allAvailability = this.#context?.dataManager?.get('availability') || []
    return allAvailability.filter(a =>
      a.resourceId === resourceId &&
      a.date >= startDate &&
      a.date <= endDate
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
