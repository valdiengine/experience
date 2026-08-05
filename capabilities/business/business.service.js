export class BusinessService {
  #manager

  constructor(manager) {
    this.#manager = manager
  }

  async create(data, identity) {
    return this.#manager.createBusiness(data, identity)
  }

  async get(id, identity) {
    return this.#manager.getById(id, identity)
  }

  async getBusiness(id, identity) {
    return this.#manager.getById(id, identity)
  }

  async list(filter, identity) {
    return this.#manager.getMany(filter, identity)
  }

  async listBusinesses(filter, identity) {
    return this.#manager.getMany(filter, identity)
  }

  async update(id, data, identity) {
    return this.#manager.updateBusiness(id, data, identity)
  }

  async publish(id, identity) {
    return this.#manager.publishBusiness(id, identity)
  }

  async suspend(id, identity) {
    return this.#manager.suspendBusiness(id, identity)
  }

  async archive(id, identity) {
    return this.#manager.archiveBusiness(id, identity)
  }

  async restore(id, identity) {
    return this.#manager.restoreBusiness(id, identity)
  }

  async delete(id, identity) {
    return this.#manager.deleteBusiness(id, identity)
  }

  async createBusiness(data, identity) {
    return this.#manager.createBusiness(data, identity)
  }

  async updateBusiness(id, data, identity) {
    return this.#manager.updateBusiness(id, data, identity)
  }

  async patchBusiness(id, data, identity) {
    return this.#manager.updateBusiness(id, data, identity)
  }

  async deleteBusiness(id, identity) {
    return this.#manager.deleteBusiness(id, identity)
  }

  async archiveBusiness(id, identity) {
    return this.#manager.archiveBusiness(id, identity)
  }

  async restoreBusiness(id, identity) {
    return this.#manager.restoreBusiness(id, identity)
  }

  async verify(id, identity) {
    return this.#manager.verifyBusiness(id, identity)
  }

  async transferOwner(id, newOwnerId, identity) {
    return this.#manager.transferBusinessOwner(id, newOwnerId, identity)
  }

  async findBySlug(slug, identity) {
    return this.#manager.findBySlug(slug, identity)
  }

  async findByTenant(tenantId, options, identity) {
    return this.#manager.findByTenant(tenantId, options, identity)
  }

  async findByDestination(destinationId, options, identity) {
    return this.#manager.findByDestination(destinationId, options, identity)
  }

  async search(query, options, identity) {
    return this.#manager.searchBusinesses(query, options, identity)
  }

  async getSEO(id, identity) {
    return this.#manager.getSEO(id, identity)
  }

  // ── Accommodation API ──

  async createAccommodation(businessId, data, identity) {
    return this.#manager.createAccommodation(businessId, data, identity)
  }

  async attachAccommodation(businessId, accommodationId, identity) {
    return this.#manager.attachAccommodation(businessId, accommodationId, identity)
  }

  async detachAccommodation(businessId, accommodationId, identity) {
    return this.#manager.detachAccommodation(businessId, accommodationId, identity)
  }

  async archiveAccommodation(businessId, accommodationId, identity) {
    return this.#manager.archiveAccommodation(businessId, accommodationId, identity)
  }

  async publishAccommodation(businessId, accommodationId, identity) {
    return this.#manager.publishAccommodation(businessId, accommodationId, identity)
  }

  async hideAccommodation(businessId, accommodationId, identity) {
    return this.#manager.hideAccommodation(businessId, accommodationId, identity)
  }

  async restoreAccommodation(businessId, accommodationId, identity) {
    return this.#manager.restoreAccommodation(businessId, accommodationId, identity)
  }

  async deleteAccommodation(businessId, accommodationId, identity) {
    return this.#manager.deleteAccommodation(businessId, accommodationId, identity)
  }

  async duplicateAccommodation(businessId, accommodationId, identity) {
    return this.#manager.duplicateAccommodation(businessId, accommodationId, identity)
  }

  async countAccommodations(businessId) {
    return this.#manager.countAccommodations(businessId)
  }

  async getBusinessAccommodations(businessId, options) {
    return this.#manager.listAccommodations(businessId, options)
  }

  async listAccommodations({ businessId, page, perPage, tenantId }) {
    return this.#manager.listAccommodations(businessId, { page, perPage, tenantId })
  }

  async getAccommodation(accommodationId, { tenantId }) {
    return this.#manager.getById(accommodationId, { tenantId })
  }

  async createAccommodation(data, { tenantId, userId }) {
    return this.#manager.createAccommodation(null, data, { tenantId, userId })
  }

  async updateAccommodation(accommodationId, data, { tenantId, userId }) {
    return this.#manager.updateAccommodation(accommodationId, data, { tenantId, userId })
  }

  async patchAccommodation(accommodationId, data, { tenantId, userId }) {
    return this.#manager.updateAccommodation(accommodationId, data, { tenantId, userId })
  }

  async deleteAccommodation(accommodationId, { tenantId, userId }) {
    return this.#manager.deleteAccommodation(accommodationId, { tenantId, userId })
  }

  async archiveAccommodation(accommodationId, { tenantId, userId }) {
    return this.#manager.archiveAccommodation(accommodationId, { tenantId, userId })
  }

  async restoreAccommodation(accommodationId, { tenantId, userId }) {
    return this.#manager.restoreAccommodation(accommodationId, { tenantId, userId })
  }

  async publishAccommodation(accommodationId, { tenantId, userId }) {
    return this.#manager.publishAccommodation(accommodationId, { tenantId, userId })
  }

  async unpublishAccommodation(accommodationId, { tenantId, userId }) {
    return this.#manager.hideAccommodation(accommodationId, { tenantId, userId })
  }

  async getPublishedAccommodations(businessId) {
    return this.#manager.listPublished(businessId)
  }

  async getHiddenAccommodations(businessId) {
    return this.#manager.listHidden(businessId)
  }

  async getAccommodationCount(businessId) {
    return this.#manager.countAccommodations(businessId)
  }

  async getPublishedAccommodationCount(businessId) {
    return this.#manager.countPublished(businessId)
  }

  async getAccommodationStatistics(businessId) {
    return this.#manager.getAccommodationStatistics(businessId)
  }

  // ── Availability API ──

  async getAccommodationAvailability(accommodationId, startDate, endDate, identity) {
    return this.#manager.getAccommodationAvailability(accommodationId, startDate, endDate, identity)
  }

  async getAccommodationOccupancy(accommodationId, startDate, endDate, identity) {
    return this.#manager.getAccommodationOccupancy(accommodationId, startDate, endDate, identity)
  }

  async checkAccommodationAvailability(accommodationId, checkIn, checkOut, identity) {
    return this.#manager.checkAccommodationAvailability(accommodationId, checkIn, checkOut, identity)
  }

  async getAccommodationCalendarSummary(accommodationId, startDate, endDate, identity) {
    return this.#manager.getAccommodationCalendarSummary(accommodationId, startDate, endDate, identity)
  }

  async blockAccommodation(accommodationId, startDate, endDate, reason, identity) {
    return this.#manager.blockAccommodation(accommodationId, startDate, endDate, reason, identity)
  }

  async unblockAccommodation(accommodationId, startDate, endDate, identity) {
    return this.#manager.unblockAccommodation(accommodationId, startDate, endDate, identity)
  }

  async reserveAccommodation(accommodationId, checkIn, checkOut, reservationId, identity) {
    return this.#manager.reserveAccommodation(accommodationId, checkIn, checkOut, reservationId, identity)
  }

  async releaseReservation(accommodationId, checkIn, checkOut, identity) {
    return this.#manager.releaseReservation(accommodationId, checkIn, checkOut, identity)
  }

  async applySeason(accommodationId, seasonData, identity) {
    return this.#manager.applySeason(accommodationId, seasonData, identity)
  }

  async removeSeason(seasonId, identity) {
    return this.#manager.removeSeason(seasonId, identity)
  }

  async applyRule(accommodationId, ruleData, identity) {
    return this.#manager.applyRule(accommodationId, ruleData, identity)
  }

  async removeRule(ruleId, identity) {
    return this.#manager.removeRule(ruleId, identity)
  }

  async updateAvailabilityRule(ruleId, ruleData, identity) {
    return this.#manager.updateAvailabilityRule(ruleId, ruleData, identity)
  }

  async createAvailabilityWindow(accommodationId, windowData, identity) {
    return this.#manager.createAvailabilityWindow(accommodationId, windowData, identity)
  }

  async createAvailabilityBlock(accommodationId, blockData, identity) {
    return this.#manager.createAvailabilityBlock(accommodationId, blockData, identity)
  }

  async getBusinessAvailability(businessId, startDate, endDate, identity) {
    return this.#manager.getBusinessAvailability(businessId, startDate, endDate, identity)
  }

  async getBusinessCalendar(businessId, startDate, endDate, identity) {
    return this.#manager.getBusinessCalendar(businessId, startDate, endDate, identity)
  }

  async getBusinessOccupancy(businessId, startDate, endDate, identity) {
    return this.#manager.getBusinessOccupancy(businessId, startDate, endDate, identity)
  }

  async blockMany(businessId, accommodationIds, startDate, endDate, reason, identity) {
    return this.#manager.blockMany(businessId, accommodationIds, startDate, endDate, reason, identity)
  }

  async unblockMany(businessId, accommodationIds, startDate, endDate, identity) {
    return this.#manager.unblockMany(businessId, accommodationIds, startDate, endDate, identity)
  }

  async copyAvailability(sourceAccommodationId, targetAccommodationId, startDate, endDate, identity) {
    return this.#manager.copyAvailability(sourceAccommodationId, targetAccommodationId, startDate, endDate, identity)
  }

  async duplicateCalendar(sourceBusinessId, targetBusinessId, startDate, endDate, identity) {
    return this.#manager.duplicateCalendar(sourceBusinessId, targetBusinessId, startDate, endDate, identity)
  }

  async bulkAvailabilityUpdate(businessId, updates, identity) {
    return this.#manager.bulkAvailabilityUpdate(businessId, updates, identity)
  }

  async recalculateOccupancy(businessId, identity) {
    return this.#manager.recalculateOccupancy(businessId, identity)
  }

  async syncAvailabilityStatistics(businessId, identity) {
    return this.#manager.syncAvailabilityStatistics(businessId, identity)
  }

  async refreshBusinessAvailability(businessId, identity) {
    return this.#manager.refreshBusinessAvailability(businessId, identity)
  }

  async getDailyCalendar(businessId, date, identity) {
    return this.#manager.getDailyCalendar(businessId, date, identity)
  }

  async getWeeklyCalendar(businessId, weekStart, identity) {
    return this.#manager.getWeeklyCalendar(businessId, weekStart, identity)
  }

  async getMonthlyCalendar(businessId, monthStart, identity) {
    return this.#manager.getMonthlyCalendar(businessId, monthStart, identity)
  }

  async getTimeline(businessId, startDate, endDate, identity) {
    return this.#manager.getTimeline(businessId, startDate, endDate, identity)
  }

  async getOccupancyMap(businessId, startDate, endDate, identity) {
    return this.#manager.getOccupancyMap(businessId, startDate, endDate, identity)
  }

  async getAvailabilityMatrix(businessId, accommodationIds, startDate, endDate, identity) {
    return this.#manager.getAvailabilityMatrix(businessId, accommodationIds, startDate, endDate, identity)
  }

  async getAccommodationAvailabilitySummary(accommodationId, startDate, endDate, identity) {
    return this.#manager.getAccommodationAvailabilitySummary(accommodationId, startDate, endDate, identity)
  }

  async getBusinessAvailabilitySummary(businessId, startDate, endDate, identity) {
    return this.#manager.getBusinessAvailabilitySummary(businessId, startDate, endDate, identity)
  }

  // ── Reservation API ──

  async createReservation(businessId, data, identity) {
    return this.#manager.createReservation(businessId, data, identity)
  }

  async updateReservation(businessId, reservationId, data, identity) {
    return this.#manager.updateReservation(businessId, reservationId, data, identity)
  }

  async confirmReservation(businessId, reservationId, identity) {
    return this.#manager.confirmReservation(businessId, reservationId, identity)
  }

  async rejectReservation(businessId, reservationId, reason, identity) {
    return this.#manager.rejectReservation(businessId, reservationId, reason, identity)
  }

  async cancelReservation(businessId, reservationId, reason, identity) {
    return this.#manager.cancelReservation(businessId, reservationId, reason, identity)
  }

  async expireReservation(businessId, reservationId, identity) {
    return this.#manager.expireReservation(businessId, reservationId, identity)
  }

  async checkInReservation(businessId, reservationId, identity) {
    return this.#manager.checkInReservation(businessId, reservationId, identity)
  }

  async checkOutReservation(businessId, reservationId, identity) {
    return this.#manager.checkOutReservation(businessId, reservationId, identity)
  }

  async noShowReservation(businessId, reservationId, identity) {
    return this.#manager.noShowReservation(businessId, reservationId, identity)
  }

  async archiveReservation(businessId, reservationId, identity) {
    return this.#manager.archiveReservation(businessId, reservationId, identity)
  }

  async restoreReservation(businessId, reservationId, identity) {
    return this.#manager.restoreReservation(businessId, reservationId, identity)
  }

  async deleteReservation(businessId, reservationId, identity) {
    return this.#manager.deleteReservation(businessId, reservationId, identity)
  }

  async getReservation(businessId, reservationId, identity) {
    return this.#manager.getReservation(businessId, reservationId, identity)
  }

  async getReservations(businessId, filter, identity) {
    return this.#manager.getReservations(businessId, filter, identity)
  }

  async listReservations({ page, perPage, status, businessId, visitorId, tenantId }) {
    return this.#manager.getReservations(businessId, { page, perPage, status, visitorId, tenantId })
  }

  async getReservation(reservationId, { tenantId }) {
    return this.#manager.getReservation(null, reservationId, { tenantId })
  }

  async createReservation(data, { tenantId, userId }) {
    return this.#manager.createReservation(null, data, { tenantId, userId })
  }

  async updateReservation(reservationId, data, { tenantId, userId }) {
    return this.#manager.updateReservation(null, reservationId, data, { tenantId, userId })
  }

  async patchReservation(reservationId, data, { tenantId, userId }) {
    return this.#manager.updateReservation(null, reservationId, data, { tenantId, userId })
  }

  async deleteReservation(reservationId, { tenantId, userId }) {
    return this.#manager.deleteReservation(null, reservationId, { tenantId, userId })
  }

  async confirmReservation(reservationId, { tenantId, userId }) {
    return this.#manager.confirmReservation(null, reservationId, { tenantId, userId })
  }

  async rejectReservation(reservationId, reason, { tenantId, userId }) {
    return this.#manager.rejectReservation(null, reservationId, reason, { tenantId, userId })
  }

  async cancelReservation(reservationId, reason, { tenantId, userId }) {
    return this.#manager.cancelReservation(null, reservationId, reason, { tenantId, userId })
  }

  async checkInReservation(reservationId, { tenantId, userId }) {
    return this.#manager.checkInReservation(null, reservationId, { tenantId, userId })
  }

  async checkOutReservation(reservationId, { tenantId, userId }) {
    return this.#manager.checkOutReservation(null, reservationId, { tenantId, userId })
  }

  async findByVisitor(businessId, visitorId, identity) {
    return this.#manager.findByVisitor(businessId, visitorId, identity)
  }

  async findByAccommodation(businessId, accommodationId, identity) {
    return this.#manager.findByAccommodation(businessId, accommodationId, identity)
  }

  async findPendingReservations(businessId, identity) {
    return this.#manager.findPendingReservations(businessId, identity)
  }

  async findConfirmedReservations(businessId, identity) {
    return this.#manager.findConfirmedReservations(businessId, identity)
  }

  async getUpcomingReservations(businessId, identity) {
    return this.#manager.getUpcomingReservations(businessId, identity)
  }

  async getTodayArrivals(businessId, identity) {
    return this.#manager.getTodayArrivals(businessId, identity)
  }

  async getTodayDepartures(businessId, identity) {
    return this.#manager.getTodayDepartures(businessId, identity)
  }

  async getCurrentGuests(businessId, identity) {
    return this.#manager.getCurrentGuests(businessId, identity)
  }

  async getReservationTimeline(businessId, startDate, endDate, identity) {
    return this.#manager.getReservationTimeline(businessId, startDate, endDate, identity)
  }

  async getReservationDashboard(businessId, identity) {
    return this.#manager.getReservationDashboard(businessId, identity)
  }

  async calculateOccupancy(businessId, startDate, endDate, identity) {
    return this.#manager.calculateOccupancy(businessId, startDate, endDate, identity)
  }

  async calculateRevenue(businessId, startDate, endDate, identity) {
    return this.#manager.calculateRevenue(businessId, startDate, endDate, identity)
  }

  async calculateADR(businessId, startDate, endDate, identity) {
    return this.#manager.calculateADR(businessId, startDate, endDate, identity)
  }

  async calculateRevPAR(businessId, startDate, endDate, identity) {
    return this.#manager.calculateRevPAR(businessId, startDate, endDate, identity)
  }

  async calculateAverageStay(businessId, startDate, endDate, identity) {
    return this.#manager.calculateAverageStay(businessId, startDate, endDate, identity)
  }

  async calculateCancellationRate(businessId, startDate, endDate, identity) {
    return this.#manager.calculateCancellationRate(businessId, startDate, endDate, identity)
  }

  async calculateNoShowRate(businessId, startDate, endDate, identity) {
    return this.#manager.calculateNoShowRate(businessId, startDate, endDate, identity)
  }

  async refreshReservationStatistics(businessId, identity) {
    return this.#manager.refreshReservationStatistics(businessId, identity)
  }

  async getReservationCapability(businessId) {
    return this.#manager.getReservationManager().getReservationCapability()
  }

  // ── Visitor API ──

  async createVisitor(businessId, data, identity) {
    return this.#manager.createVisitor(businessId, data, identity)
  }

  async updateVisitor(businessId, visitorId, data, identity) {
    return this.#manager.updateVisitor(businessId, visitorId, data, identity)
  }

  async archiveVisitor(businessId, visitorId, identity) {
    return this.#manager.archiveVisitor(businessId, visitorId, identity)
  }

  async restoreVisitor(businessId, visitorId, identity) {
    return this.#manager.restoreVisitor(businessId, visitorId, identity)
  }

  async deleteVisitor(businessId, visitorId, identity) {
    return this.#manager.deleteVisitor(businessId, visitorId, identity)
  }

  async mergeVisitors(businessId, targetId, sourceId, identity) {
    return this.#manager.mergeVisitors(businessId, targetId, sourceId, identity)
  }

  async activateVisitor(businessId, visitorId, identity) {
    return this.#manager.activateVisitor(businessId, visitorId, identity)
  }

  async deactivateVisitor(businessId, visitorId, identity) {
    return this.#manager.deactivateVisitor(businessId, visitorId, identity)
  }

  async verifyVisitor(businessId, visitorId, identity) {
    return this.#manager.verifyVisitor(businessId, visitorId, identity)
  }

  async grantVip(businessId, visitorId, identity) {
    return this.#manager.grantVip(businessId, visitorId, identity)
  }

  async revokeVip(businessId, visitorId, identity) {
    return this.#manager.revokeVip(businessId, visitorId, identity)
  }

  async blacklistVisitor(businessId, visitorId, reason, identity) {
    return this.#manager.blacklistVisitor(businessId, visitorId, reason, identity)
  }

  async unblacklistVisitor(businessId, visitorId, identity) {
    return this.#manager.unblacklistVisitor(businessId, visitorId, identity)
  }

  async updateVisitorProfile(businessId, visitorId, profile, identity) {
    return this.#manager.updateVisitorProfile(businessId, visitorId, profile, identity)
  }

  async updateVisitorPreferences(businessId, visitorId, preferences, identity) {
    return this.#manager.updateVisitorPreferences(businessId, visitorId, preferences, identity)
  }

  async updateVisitorTags(businessId, visitorId, tags, identity) {
    return this.#manager.updateVisitorTags(businessId, visitorId, tags, identity)
  }

  async getVisitor(businessId, visitorId, identity) {
    return this.#manager.getVisitor(businessId, visitorId, identity)
  }

  async getVisitorById(visitorId, { tenantId }) {
    return this.#manager.getVisitor(null, visitorId, { tenantId })
  }

  async createVisitor(data, { tenantId, userId }) {
    return this.#manager.createVisitor(null, data, { tenantId, userId })
  }

  async updateVisitor(visitorId, data, { tenantId, userId }) {
    return this.#manager.updateVisitor(null, visitorId, data, { tenantId, userId })
  }

  async patchVisitor(visitorId, data, { tenantId, userId }) {
    return this.#manager.updateVisitor(null, visitorId, data, { tenantId, userId })
  }

  async deleteVisitor(visitorId, { tenantId, userId }) {
    return this.#manager.deleteVisitor(null, visitorId, { tenantId, userId })
  }

  async archiveVisitor(visitorId, { tenantId, userId }) {
    return this.#manager.archiveVisitor(null, visitorId, { tenantId, userId })
  }

  async restoreVisitor(visitorId, { tenantId, userId }) {
    return this.#manager.restoreVisitor(null, visitorId, { tenantId, userId })
  }

  async verifyVisitor(visitorId, { tenantId, userId }) {
    return this.#manager.verifyVisitor(null, visitorId, { tenantId, userId })
  }

  async mergeVisitors(targetId, sourceId, { tenantId, userId }) {
    return this.#manager.mergeVisitors(null, targetId, sourceId, { tenantId, userId })
  }

  async findVisitorByEmail(businessId, email, identity) {
    return this.#manager.findVisitorByEmail(businessId, email, identity)
  }

  async findVisitorByPhone(businessId, phone, identity) {
    return this.#manager.findVisitorByPhone(businessId, phone, identity)
  }

  async findVisitors(businessId, filter, identity) {
    return this.#manager.findVisitors(businessId, filter, identity)
  }

  async listVisitors(businessId, options, identity) {
    return this.#manager.listVisitors(businessId, options, identity)
  }

  async searchVisitors(businessId, query, options, identity) {
    return this.#manager.searchVisitors(businessId, query, options, identity)
  }

  async visitorExists(businessId, visitorId, identity) {
    return this.#manager.visitorExists(businessId, visitorId, identity)
  }

  async countVisitors(businessId, identity) {
    return this.#manager.countVisitors(businessId, identity)
  }

  async getBusinessVisitors(businessId, identity) {
    return this.#manager.getBusinessVisitors(businessId, identity)
  }

  async attachReservation(businessId, visitorId, reservationId, identity) {
    return this.#manager.attachReservation(businessId, visitorId, reservationId, identity)
  }

  async detachReservation(businessId, visitorId, reservationId, identity) {
    return this.#manager.detachReservation(businessId, visitorId, reservationId, identity)
  }

  async getVisitorReservations(businessId, visitorId, identity) {
    return this.#manager.getVisitorReservations(businessId, visitorId, identity)
  }

  async getReservationHistory(businessId, visitorId, identity) {
    return this.#manager.getReservationHistory(businessId, visitorId, identity)
  }

  async getCurrentReservation(businessId, visitorId, identity) {
    return this.#manager.getCurrentReservation(businessId, visitorId, identity)
  }

  async getUpcomingReservationsByVisitor(businessId, visitorId, identity) {
    return this.#manager.getUpcomingReservationsByVisitor(businessId, visitorId, identity)
  }

  async getPastReservations(businessId, visitorId, identity) {
    return this.#manager.getPastReservations(businessId, visitorId, identity)
  }

  async calculateLifetimeValue(businessId, visitorId, identity) {
    return this.#manager.calculateLifetimeValue(businessId, visitorId, identity)
  }

  async calculateVisitorAverageStay(businessId, visitorId, identity) {
    return this.#manager.calculateVisitorAverageStay(businessId, visitorId, identity)
  }

  async calculateVisitorCancellationRate(businessId, visitorId, identity) {
    return this.#manager.calculateVisitorCancellationRate(businessId, visitorId, identity)
  }

  async calculateVisitorNoShowRate(businessId, visitorId, identity) {
    return this.#manager.calculateVisitorNoShowRate(businessId, visitorId, identity)
  }

  async getVisitorStatistics(businessId, visitorId, identity) {
    return this.#manager.getVisitorStatistics(businessId, visitorId, identity)
  }

  async calculateBusinessVisitorMetrics(businessId, identity) {
    return this.#manager.calculateBusinessVisitorMetrics(businessId, identity)
  }

  async refreshVisitorStatistics(businessId, identity) {
    return this.#manager.refreshVisitorStatistics(businessId, identity)
  }

  async syncVisitorStatistics(businessId, identity) {
    return this.#manager.syncVisitorStatistics(businessId, identity)
  }

  async calculateVisitorSegments(businessId, identity) {
    return this.#manager.calculateVisitorSegments(businessId, identity)
  }

  async calculateTopVisitors(businessId, limit, identity) {
    return this.#manager.calculateTopVisitors(businessId, limit, identity)
  }

  async calculateReturningVisitors(businessId, identity) {
    return this.#manager.calculateReturningVisitors(businessId, identity)
  }

  async calculateVipVisitors(businessId, identity) {
    return this.#manager.calculateVipVisitors(businessId, identity)
  }

  async archiveManyVisitors(businessId, visitorIds, identity) {
    return this.#manager.archiveManyVisitors(businessId, visitorIds, identity)
  }

  async restoreManyVisitors(businessId, visitorIds, identity) {
    return this.#manager.restoreManyVisitors(businessId, visitorIds, identity)
  }

  async deleteManyVisitors(businessId, visitorIds, identity) {
    return this.#manager.deleteManyVisitors(businessId, visitorIds, identity)
  }

  async mergeManyVisitors(businessId, visitorIds, identity) {
    return this.#manager.mergeManyVisitors(businessId, visitorIds, identity)
  }

  async tagManyVisitors(businessId, visitorIds, tag, identity) {
    return this.#manager.tagManyVisitors(businessId, visitorIds, tag, identity)
  }

  async exportVisitors(businessId, options, identity) {
    return this.#manager.exportVisitors(businessId, options, identity)
  }

  async refreshVisitorSearch(businessId, identity) {
    return this.#manager.refreshVisitorSearch(businessId, identity)
  }

  async getVisitorCapability(businessId) {
    return this.#manager.getVisitorManager().getVisitorCapability()
  }

  // ── Payment API ──

  async createPayment(businessId, data, identity) {
    return this.#manager.createPayment(businessId, data, identity)
  }

  async updatePayment(businessId, paymentId, data, identity) {
    return this.#manager.updatePayment(businessId, paymentId, data, identity)
  }

  async authorizePayment(businessId, paymentId, identity) {
    return this.#manager.authorizePayment(businessId, paymentId, identity)
  }

  async capturePayment(businessId, paymentId, identity) {
    return this.#manager.capturePayment(businessId, paymentId, identity)
  }

  async markPaid(businessId, paymentId, amount, identity) {
    return this.#manager.markPaid(businessId, paymentId, amount, identity)
  }

  async cancelPayment(businessId, paymentId, identity) {
    return this.#manager.cancelPayment(businessId, paymentId, identity)
  }

  async expirePayment(businessId, paymentId, identity) {
    return this.#manager.expirePayment(businessId, paymentId, identity)
  }

  async refundPayment(businessId, paymentId, amount, identity, reason) {
    return this.#manager.refundPayment(businessId, paymentId, amount, identity, reason)
  }

  async partialRefundPayment(businessId, paymentId, amount, identity, reason) {
    return this.#manager.partialRefundPayment(businessId, paymentId, amount, identity, reason)
  }

  async archivePayment(businessId, paymentId, identity) {
    return this.#manager.archivePayment(businessId, paymentId, identity)
  }

  async restorePayment(businessId, paymentId, identity) {
    return this.#manager.restorePayment(businessId, paymentId, identity)
  }

  async deletePayment(businessId, paymentId, identity) {
    return this.#manager.deletePayment(businessId, paymentId, identity)
  }

  async findPayment(businessId, paymentId, identity) {
    return this.#manager.findPayment(businessId, paymentId, identity)
  }

  async findPayments(businessId, filter, identity) {
    return this.#manager.findPayments(businessId, filter, identity)
  }

  async findPaymentByReservation(businessId, reservationId, identity) {
    return this.#manager.findPaymentByReservation(businessId, reservationId, identity)
  }

  async findPaymentsByVisitor(businessId, visitorId, identity) {
    return this.#manager.findPaymentsByVisitor(businessId, visitorId, identity)
  }

  async findPendingPayments(businessId, identity) {
    return this.#manager.findPendingPayments(businessId, identity)
  }

  async findPaidPayments(businessId, identity) {
    return this.#manager.findPaidPayments(businessId, identity)
  }

  async findFailedPayments(businessId, identity) {
    return this.#manager.findFailedPayments(businessId, identity)
  }

  async findRefundedPayments(businessId, identity) {
    return this.#manager.findRefundedPayments(businessId, identity)
  }

  async findExpiredPayments(businessId, identity) {
    return this.#manager.findExpiredPayments(businessId, identity)
  }

  async getPayment(businessId, paymentId, identity) {
    return this.#manager.getPayment(businessId, paymentId, identity)
  }

  async getPaymentById(paymentId, { tenantId }) {
    return this.#manager.getPayment(null, paymentId, { tenantId })
  }

  async listPayments({ page, perPage, reservationId, status, tenantId }) {
    return this.#manager.getPayments(null, { page, perPage, reservationId, status, tenantId })
  }

  async createPayment(data, { tenantId, userId }) {
    return this.#manager.createPayment(null, data, { tenantId, userId })
  }

  async updatePayment(paymentId, data, { tenantId, userId }) {
    return this.#manager.updatePayment(null, paymentId, data, { tenantId, userId })
  }

  async patchPayment(paymentId, data, { tenantId, userId }) {
    return this.#manager.updatePayment(null, paymentId, data, { tenantId, userId })
  }

  async processPayment(paymentId, { tenantId, userId }) {
    return this.#manager.capturePayment(null, paymentId, { tenantId, userId })
  }

  async refundPayment(paymentId, amount, { tenantId, userId }) {
    if (amount) {
      return this.#manager.partialRefundPayment(null, paymentId, amount, { tenantId, userId })
    }
    return this.#manager.refundPayment(null, paymentId, { tenantId, userId })
  }

  async retryPayment(paymentId, { tenantId, userId }) {
    return this.#manager.expirePayment(null, paymentId, { tenantId, userId })
  }

  async cancelPayment(paymentId, { tenantId, userId }) {
    return this.#manager.cancelPayment(null, paymentId, { tenantId, userId })
  }

  async archivePayment(paymentId, { tenantId, userId }) {
    return this.#manager.archivePayment(null, paymentId, { tenantId, userId })
  }

  async restorePayment(paymentId, { tenantId, userId }) {
    return this.#manager.restorePayment(null, paymentId, { tenantId, userId })
  }

  async getBusinessPayments(businessId, identity) {
    return this.#manager.getBusinessPayments(businessId, identity)
  }

  async paymentExists(businessId, paymentId, identity) {
    return this.#manager.paymentExists(businessId, paymentId, identity)
  }

  async countPayments(businessId, identity) {
    return this.#manager.countPayments(businessId, identity)
  }

  async getBusinessRevenue(businessId, identity) {
    return this.#manager.getBusinessRevenue(businessId, identity)
  }

  async getBusinessOutstandingPayments(businessId, identity) {
    return this.#manager.getBusinessOutstandingPayments(businessId, identity)
  }

  async getBusinessRefunds(businessId, identity) {
    return this.#manager.getBusinessRefunds(businessId, identity)
  }

  async getBusinessCommissions(businessId, identity) {
    return this.#manager.getBusinessCommissions(businessId, identity)
  }

  async getBusinessPaymentStatistics(businessId, identity) {
    return this.#manager.getBusinessPaymentStatistics(businessId, identity)
  }

  async getBusinessPaymentSummary(businessId, identity) {
    return this.#manager.getBusinessPaymentSummary(businessId, identity)
  }

  async getBusinessCashFlow(businessId, startDate, endDate, identity) {
    return this.#manager.getBusinessCashFlow(businessId, startDate, endDate, identity)
  }

  async getBusinessRevenueByPeriod(businessId, period, identity) {
    return this.#manager.getBusinessRevenueByPeriod(businessId, period, identity)
  }

  async getBusinessPaymentDashboard(businessId, identity) {
    return this.#manager.getBusinessPaymentDashboard(businessId, identity)
  }

  async createReservationPayment(businessId, reservationId, data, identity) {
    return this.#manager.createReservationPayment(businessId, reservationId, data, identity)
  }

  async cancelReservationPayment(businessId, reservationId, identity) {
    return this.#manager.cancelReservationPayment(businessId, reservationId, identity)
  }

  async expireReservationPayment(businessId, reservationId, identity) {
    return this.#manager.expireReservationPayment(businessId, reservationId, identity)
  }

  async refundReservationPayment(businessId, reservationId, amount, identity, reason) {
    return this.#manager.refundReservationPayment(businessId, reservationId, amount, identity, reason)
  }

  async findReservationPayment(businessId, reservationId, identity) {
    return this.#manager.findReservationPayment(businessId, reservationId, identity)
  }

  async getVisitorPayments(businessId, visitorId, identity) {
    return this.#manager.getVisitorPayments(businessId, visitorId, identity)
  }

  async getVisitorOutstandingBalance(businessId, visitorId, identity) {
    return this.#manager.getVisitorOutstandingBalance(businessId, visitorId, identity)
  }

  async getVisitorPaymentHistory(businessId, visitorId, identity) {
    return this.#manager.getVisitorPaymentHistory(businessId, visitorId, identity)
  }

  async refundVisitorPayments(businessId, visitorId, paymentIds, amount, identity, reason) {
    return this.#manager.refundVisitorPayments(businessId, visitorId, paymentIds, amount, identity, reason)
  }

  async archiveBusinessPayments(businessId, paymentIds, identity) {
    return this.#manager.archiveBusinessPayments(businessId, paymentIds, identity)
  }

  async restoreBusinessPayments(businessId, paymentIds, identity) {
    return this.#manager.restoreBusinessPayments(businessId, paymentIds, identity)
  }

  async cancelPendingPayments(businessId, paymentIds, identity) {
    return this.#manager.cancelPendingPayments(businessId, paymentIds, identity)
  }

  async expirePendingPayments(businessId, paymentIds, identity) {
    return this.#manager.expirePendingPayments(businessId, paymentIds, identity)
  }

  async bulkRefundPayments(businessId, paymentIds, amounts, identity, reason) {
    return this.#manager.bulkRefundPayments(businessId, paymentIds, amounts, identity, reason)
  }

  async cancelAllPendingPayments(businessId, identity) {
    return this.#manager.cancelAllPendingPayments(businessId, identity)
  }

  async expireAllPendingPayments(businessId, identity) {
    return this.#manager.expireAllPendingPayments(businessId, identity)
  }

  async refreshPaymentSearch(businessId, identity) {
    return this.#manager.refreshPaymentSearch(businessId, identity)
  }

  async refreshPaymentStatistics(businessId, identity) {
    return this.#manager.refreshPaymentStatistics(businessId, identity)
  }

  async getRefundEligibility(businessId, paymentId, identity) {
    return this.#manager.getRefundEligibility(businessId, paymentId, identity)
  }

  async calculateFees(businessId, subtotal, options, identity) {
    return this.#manager.calculateFees(businessId, subtotal, options, identity)
  }

  async getPaymentCapability(businessId) {
    return this.#manager.getPaymentManager().getPaymentCapability()
  }

  // ── Notification API ──

  async createNotification(businessId, data, identity) {
    return this.#manager.createNotification(businessId, data, identity)
  }

  async updateNotification(businessId, notificationId, data, identity) {
    return this.#manager.updateNotification(businessId, notificationId, data, identity)
  }

  async scheduleNotification(businessId, notificationId, scheduledAt, identity) {
    return this.#manager.scheduleNotification(businessId, notificationId, scheduledAt, identity)
  }

  async sendNotification(businessId, notificationId, identity) {
    return this.#manager.sendNotification(businessId, notificationId, identity)
  }

  async cancelNotification(businessId, notificationId, identity) {
    return this.#manager.cancelNotification(businessId, notificationId, identity)
  }

  async retryNotification(businessId, notificationId, identity) {
    return this.#manager.retryNotification(businessId, notificationId, identity)
  }

  async archiveNotification(businessId, notificationId, identity) {
    return this.#manager.archiveNotification(businessId, notificationId, identity)
  }

  async restoreNotification(businessId, notificationId, identity) {
    return this.#manager.restoreNotification(businessId, notificationId, identity)
  }

  async deleteNotification(businessId, notificationId, identity) {
    return this.#manager.deleteNotification(businessId, notificationId, identity)
  }

  async markSent(businessId, notificationId, identity) {
    return this.#manager.markSent(businessId, notificationId, identity)
  }

  async markDelivered(businessId, notificationId, identity) {
    return this.#manager.markDelivered(businessId, notificationId, identity)
  }

  async markFailed(businessId, notificationId, errorMessage, identity) {
    return this.#manager.markFailed(businessId, notificationId, errorMessage, identity)
  }

  async findNotification(businessId, notificationId, identity) {
    return this.#manager.findNotification(businessId, notificationId, identity)
  }

  async findNotifications(businessId, filter, identity) {
    return this.#manager.findNotifications(businessId, filter, identity)
  }

  async findBusinessNotifications(businessId, identity) {
    return this.#manager.findBusinessNotifications(businessId, identity)
  }

  async findPendingNotifications(businessId, identity) {
    return this.#manager.findPendingNotifications(businessId, identity)
  }

  async findScheduledNotifications(businessId, identity) {
    return this.#manager.findScheduledNotifications(businessId, identity)
  }

  async findSentNotifications(businessId, identity) {
    return this.#manager.findSentNotifications(businessId, identity)
  }

  async findFailedNotifications(businessId, identity) {
    return this.#manager.findFailedNotifications(businessId, identity)
  }

  async findDeliveredNotifications(businessId, identity) {
    return this.#manager.findDeliveredNotifications(businessId, identity)
  }

  async notificationExists(businessId, notificationId, identity) {
    return this.#manager.notificationExists(businessId, notificationId, identity)
  }

  async countNotifications(businessId, identity) {
    return this.#manager.countNotifications(businessId, identity)
  }

  async createReservationNotification(businessId, reservationId, data, identity) {
    return this.#manager.createReservationNotification(businessId, reservationId, data, identity)
  }

  async cancelReservationNotifications(businessId, reservationId, identity) {
    return this.#manager.cancelReservationNotifications(businessId, reservationId, identity)
  }

  async findReservationNotifications(businessId, reservationId, identity) {
    return this.#manager.findReservationNotifications(businessId, reservationId, identity)
  }

  async scheduleReservationReminder(businessId, reservationId, reminderData, identity) {
    return this.#manager.scheduleReservationReminder(businessId, reservationId, reminderData, identity)
  }

  async sendReservationConfirmation(businessId, reservationId, identity) {
    return this.#manager.sendReservationConfirmation(businessId, reservationId, identity)
  }

  async sendReservationCancellation(businessId, reservationId, identity) {
    return this.#manager.sendReservationCancellation(businessId, reservationId, identity)
  }

  async createPaymentNotification(businessId, paymentId, data, identity) {
    return this.#manager.createPaymentNotification(businessId, paymentId, data, identity)
  }

  async sendPaymentReceipt(businessId, paymentId, identity) {
    return this.#manager.sendPaymentReceipt(businessId, paymentId, identity)
  }

  async sendRefundNotification(businessId, paymentId, identity) {
    return this.#manager.sendRefundNotification(businessId, paymentId, identity)
  }

  async findPaymentNotifications(businessId, paymentId, identity) {
    return this.#manager.findPaymentNotifications(businessId, paymentId, identity)
  }

  async findVisitorNotifications(businessId, visitorId, identity) {
    return this.#manager.findVisitorNotifications(businessId, visitorId, identity)
  }

  async findUnreadVisitorNotifications(businessId, visitorId, identity) {
    return this.#manager.findUnreadVisitorNotifications(businessId, visitorId, identity)
  }

  async markVisitorNotificationsRead(businessId, visitorId, identity) {
    return this.#manager.markVisitorNotificationsRead(businessId, visitorId, identity)
  }

  async sendVisitorNotification(businessId, visitorId, data, identity) {
    return this.#manager.sendVisitorNotification(businessId, visitorId, data, identity)
  }

  async getNotificationStatistics(businessId, identity) {
    return this.#manager.getNotificationStatistics(businessId, identity)
  }

  async getBusinessNotificationSummary(businessId, identity) {
    return this.#manager.getBusinessNotificationSummary(businessId, identity)
  }

  async getDeliveryRate(businessId, identity) {
    return this.#manager.getDeliveryRate(businessId, identity)
  }

  async getFailureRate(businessId, identity) {
    return this.#manager.getFailureRate(businessId, identity)
  }

  async getChannelStatistics(businessId, identity) {
    return this.#manager.getChannelStatistics(businessId, identity)
  }

  async getTemplateStatistics(businessId, identity) {
    return this.#manager.getTemplateStatistics(businessId, identity)
  }

  async getDailyNotificationVolume(businessId, days, identity) {
    return this.#manager.getDailyNotificationVolume(businessId, days, identity)
  }

  async getNotificationDashboard(businessId, identity) {
    return this.#manager.getNotificationDashboard(businessId, identity)
  }

  async archiveBusinessNotifications(businessId, notificationIds, identity) {
    return this.#manager.archiveBusinessNotifications(businessId, notificationIds, identity)
  }

  async restoreBusinessNotifications(businessId, notificationIds, identity) {
    return this.#manager.restoreBusinessNotifications(businessId, notificationIds, identity)
  }

  async cancelPendingNotifications(businessId, notificationIds, identity) {
    return this.#manager.cancelPendingNotifications(businessId, notificationIds, identity)
  }

  async retryFailedNotifications(businessId, notificationIds, identity) {
    return this.#manager.retryFailedNotifications(businessId, notificationIds, identity)
  }

  async markAllDelivered(businessId, notificationIds, identity) {
    return this.#manager.markAllDelivered(businessId, notificationIds, identity)
  }

  async cleanupArchivedNotifications(businessId, daysOld, identity) {
    return this.#manager.cleanupArchivedNotifications(businessId, daysOld, identity)
  }

  async refreshNotificationSearch(businessId, identity) {
    return this.#manager.refreshNotificationSearch(businessId, identity)
  }

  async refreshNotificationStatistics(businessId, identity) {
    return this.#manager.refreshNotificationStatistics(businessId, identity)
  }

  async calculateNotificationCosts(businessId, options, identity) {
    return this.#manager.calculateNotificationCosts(businessId, options, identity)
  }

  async estimateNotificationVolume(businessId, options, identity) {
    return this.#manager.estimateNotificationVolume(businessId, options, identity)
  }

  async getNotificationCapability(businessId) {
    return this.#manager.getNotificationManager().getNotificationCapability()
  }

  #getCommunityCapability() {
    return this.#manager?.context?.capabilities?.get?.('community')
  }

  async listReviews({ page = 1, perPage = 20, accommodationId, businessId, status, tenantId }) {
    const community = this.#getCommunityCapability()
    if (!community?.reviews) return { items: [], total: 0 }
    const allReviews = community.reviews.getAll?.() || []
    const filtered = allReviews.filter(r => r.entityType === 'accommodation' && r.entityId === accommodationId)
    return {
      items: filtered.slice((page - 1) * perPage, page * perPage),
      total: filtered.length
    }
  }

  async getReview(reviewId, { tenantId }) {
    const community = this.#getCommunityCapability()
    return community?.reviews?.getById?.(reviewId) || null
  }

  async createReview(data, { tenantId, userId }) {
    const community = this.#getCommunityCapability()
    return community?.createReview?.(data) || { success: false, error: 'Not implemented' }
  }

  async updateReview(reviewId, data, { tenantId, userId }) {
    const community = this.#getCommunityCapability()
    return community?.reviews?.update?.(reviewId, data) || { success: false, error: 'Not implemented' }
  }

  async patchReview(reviewId, data, { tenantId, userId }) {
    return this.updateReview(reviewId, data, { tenantId, userId })
  }

  async deleteReview(reviewId, { tenantId, userId }) {
    const community = this.#getCommunityCapability()
    return community?.reviews?.delete?.(reviewId) || { success: false, error: 'Not implemented' }
  }

  async approveReview(reviewId, { tenantId, userId }) {
    const community = this.#getCommunityCapability()
    return community?.approveContent?.(reviewId, userId) || { success: false, error: 'Not implemented' }
  }

  async rejectReview(reviewId, reason, { tenantId, userId }) {
    const community = this.#getCommunityCapability()
    return community?.rejectContent?.(reviewId, reason, userId) || { success: false, error: 'Not implemented' }
  }

  async reportReview(reviewId, reason, { tenantId, userId }) {
    const community = this.#getCommunityCapability()
    return community?.reportContent?.(reviewId, reason, userId) || { success: false, error: 'Not implemented' }
  }

  #getAvailabilityCapability() {
    return this.#manager?.context?.capabilities?.get?.('availability')
  }

  async listAvailability({ accommodationId, startDate, endDate, tenantId }) {
    const availability = this.#getAvailabilityCapability()
    if (!availability) return { items: [], total: 0 }
    return availability?.listAvailability?.({ accommodationId, startDate, endDate, tenantId }) || { items: [], total: 0 }
  }

  async getAvailability(availabilityId, { tenantId }) {
    const availability = this.#getAvailabilityCapability()
    return availability?.getAvailability?.(availabilityId, { tenantId }) || null
  }

  async createAvailability(data, { tenantId, userId }) {
    const availability = this.#getAvailabilityCapability()
    return availability?.createAvailability?.(data, { tenantId, userId }) || { success: false, error: 'Not implemented' }
  }

  async updateAvailability(availabilityId, data, { tenantId, userId }) {
    const availability = this.#getAvailabilityCapability()
    return availability?.updateAvailability?.(availabilityId, data, { tenantId, userId }) || { success: false, error: 'Not implemented' }
  }

  async patchAvailability(availabilityId, data, { tenantId, userId }) {
    return this.updateAvailability(availabilityId, data, { tenantId, userId })
  }

  async deleteAvailability(availabilityId, { tenantId, userId }) {
    const availability = this.#getAvailabilityCapability()
    return availability?.deleteAvailability?.(availabilityId, { tenantId, userId }) || { success: false, error: 'Not implemented' }
  }

  async blockDate(availabilityId, { startDate, endDate, reason }, identity) {
    const availabilityCap = this.#getAvailabilityCapability()
    if (!availabilityCap?.manager) return null
    const av = await availabilityCap?.manager?.getAvailabilityById?.(availabilityId)
    if (!av) return null
    return this.#manager.blockAccommodation(av.accommodationId, startDate, endDate, reason, identity)
  }

  async unblockDate(availabilityId, { startDate, endDate }, identity) {
    const availabilityCap = this.#getAvailabilityCapability()
    if (!availabilityCap?.manager) return null
    const av = await availabilityCap?.manager?.getAvailabilityById?.(availabilityId)
    if (!av) return null
    return this.#manager.unblockAccommodation(av.accommodationId, startDate, endDate, identity)
  }

  async reserveDate(availabilityId, { checkIn, checkOut, reservationId }, identity) {
    const availabilityCap = this.#getAvailabilityCapability()
    if (!availabilityCap?.manager) return null
    const av = await availabilityCap?.manager?.getAvailabilityById?.(availabilityId)
    if (!av) return null
    return this.#manager.reserveAccommodation(av.accommodationId, checkIn, checkOut, reservationId, identity)
  }

  async releaseDate(availabilityId, { checkIn, checkOut }, identity) {
    const availabilityCap = this.#getAvailabilityCapability()
    if (!availabilityCap?.manager) return null
    const av = await availabilityCap?.manager?.getAvailabilityById?.(availabilityId)
    if (!av) return null
    return this.#manager.releaseReservation(av.accommodationId, checkIn, checkOut, identity)
  }
}
