export class AvailabilityService {
  #manager

  constructor(manager) {
    this.#manager = manager
  }

  async createDay(data, identity) {
    return this.#manager.createDay(data, identity)
  }

  async get(id, identity) {
    return this.#manager.getById(id, identity)
  }

  async list(filter, identity) {
    return this.#manager.getMany(filter, identity)
  }

  async update(id, data, identity) {
    return this.#manager.updateDay(id, data, identity)
  }

  async archive(id, identity) {
    return this.#manager.archiveDay(id, identity)
  }

  async restore(id, identity) {
    return this.#manager.restoreDay(id, identity)
  }

  async delete(id, identity) {
    return this.#manager.deleteDay(id, identity)
  }

  async block(accommodationId, startDate, endDate, reason, identity) {
    return this.#manager.block(accommodationId, startDate, endDate, reason, identity)
  }

  async unblock(accommodationId, startDate, endDate, identity) {
    return this.#manager.unblock(accommodationId, startDate, endDate, identity)
  }

  async reserve(accommodationId, checkIn, checkOut, reservationId, identity) {
    return this.#manager.reserve(accommodationId, checkIn, checkOut, reservationId, identity)
  }

  async release(accommodationId, checkIn, checkOut, identity) {
    return this.#manager.release(accommodationId, checkIn, checkOut, identity)
  }

  async getCalendar(accommodationId, startDate, endDate, identity) {
    return this.#manager.getCalendar(accommodationId, startDate, endDate, identity)
  }

  async checkAvailability(accommodationId, checkIn, checkOut, identity) {
    return this.#manager.checkAvailability(accommodationId, checkIn, checkOut, identity)
  }

  async getOccupancy(accommodationId, startDate, endDate, identity) {
    return this.#manager.getOccupancy(accommodationId, startDate, endDate, identity)
  }

  async getCalendarSummary(accommodationId, startDate, endDate, identity) {
    return this.#manager.getCalendarSummary(accommodationId, startDate, endDate, identity)
  }

  async createWindow(data, identity) {
    return this.#manager.createWindow(data, identity)
  }

  async createRule(data, identity) {
    return this.#manager.createRule(data, identity)
  }

  async updateRule(id, data, identity) {
    return this.#manager.updateRule(id, data, identity)
  }

  async deleteRule(id, identity) {
    return this.#manager.deleteRule(id, identity)
  }

  async createSeason(data, identity) {
    return this.#manager.createSeason(data, identity)
  }

  async createBlock(data, identity) {
    return this.#manager.createBlock(data, identity)
  }
}
