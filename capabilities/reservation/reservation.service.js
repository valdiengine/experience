import { RESERVATION_PERMISSIONS } from './reservation.permissions.js'

export class ReservationService {
  #manager

  constructor(manager) {
    this.#manager = manager
  }

  async #assertRead(identity) {
    if (identity) {
      await this.#manager.authorize(identity, RESERVATION_PERMISSIONS.READ, 'reservation')
    }
  }

  async createReservation(data, identity) {
    return this.#manager.createRequest(data, identity)
  }

  async updateReservation(id, data, identity) {
    return this.#manager.updateReservation(id, data, identity)
  }

  async cancelReservation(id, reason, identity) {
    return this.#manager.cancelReservation(id, reason, identity)
  }

  async confirmReservation(id, identity) {
    return this.#manager.confirmReservation(id, identity)
  }

  async rejectReservation(id, reason, identity) {
    return this.#manager.rejectReservation(id, reason, identity)
  }

  async expireReservation(id, identity) {
    return this.#manager.expireReservation(id, identity)
  }

  async completeReservation(id, identity) {
    return this.#manager.completeReservation(id, identity)
  }

  async archiveReservation(id, identity) {
    return this.#manager.archiveReservation(id, identity)
  }

  async restoreReservation(id, identity) {
    return this.#manager.restoreReservation(id, identity)
  }

  async deleteReservation(id, identity) {
    return this.#manager.deleteReservation(id, identity)
  }

  async findReservation(id, identity) {
    await this.#assertRead(identity)
    return this.#manager.getById(id)
  }

  async findReservations(filter, identity) {
    await this.#assertRead(identity)
    if (filter?.status) return this.#manager.getByStatus(filter.status)
    return this.#manager.getAll()
  }

  async findByAccommodation(accommodationId, identity) {
    await this.#assertRead(identity)
    return this.#manager.getByAccommodation(accommodationId)
  }

  async findByVisitor(visitorId, identity) {
    await this.#assertRead(identity)
    return this.#manager.getByVisitor(visitorId)
  }

  async findByBusiness(businessId, identity) {
    await this.#assertRead(identity)
    return this.#manager.getByBusiness(businessId)
  }

  async findUpcoming(identity) {
    await this.#assertRead(identity)
    return this.#manager.getUpcoming()
  }

  async findActive(identity) {
    await this.#assertRead(identity)
    return this.#manager.getActive()
  }

  async findCompleted(identity) {
    await this.#assertRead(identity)
    return this.#manager.getCompleted()
  }

  async findCancelled(identity) {
    await this.#assertRead(identity)
    return this.#manager.getCancelled()
  }

  async calculateReservationPrice(accommodationId, checkIn, checkOut, guests, identity) {
    return this.#manager.calculatePrice(accommodationId, checkIn, checkOut, guests)
  }

  async calculateNights(checkIn, checkOut) {
    return this.#manager.calculateNights(checkIn, checkOut)
  }

  async calculateGuests(data) {
    return this.#manager.calculateGuests(data)
  }

  async validateAvailability(accommodationId, checkIn, checkOut, identity) {
    return this.#manager.validateCheckAvailability(accommodationId, checkIn, checkOut)
  }

  async estimateTaxes(totalPrice, identity) {
    return this.#manager.estimateTaxes(totalPrice)
  }

  async estimateCommission(totalPrice, identity) {
    return this.#manager.estimateCommission(totalPrice)
  }
}
