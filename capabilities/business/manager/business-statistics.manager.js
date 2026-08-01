export class BusinessStatisticsManager {
  #context

  constructor(context) {
    this.#context = context
  }

  // ── Statistics ──

  async getKPIs(businessId) {
    const repo = this.#context?.repositories?.business
    if (!repo) return null
    const business = await repo.findById(businessId)
    if (!business) return null
    return {
      publishedAccommodationCount: business.publishedAccommodationCount || 0,
      draftAccommodationCount: business.draftAccommodationCount || 0,
      rating: business.rating || null,
      accommodationCategories: business.accommodationCategories || [],
    }
  }

  // ── Future: Reservation / Occupancy / Revenue Stats ──

  // async getOccupancyRate(businessId, dateRange) { /* TODO: P13.x */ }
  // async getRevenueStats(businessId, period) { /* TODO: P13.x */ }
  // async getCachedMetrics(businessId) { /* TODO: P13.x */ }
}
