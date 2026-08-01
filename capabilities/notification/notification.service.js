export class NotificationService {
  #manager

  constructor(manager) {
    this.#manager = manager
  }

  async create(data, identity) {
    return this.#manager.createNotification(data, identity)
  }

  async update(id, data, identity) {
    return this.#manager.updateNotification(id, data, identity)
  }

  async schedule(id, scheduledAt, identity) {
    return this.#manager.scheduleNotification(id, scheduledAt, identity)
  }

  async send(id, identity) {
    return this.#manager.sendNotification(id, identity)
  }

  async cancel(id, identity) {
    return this.#manager.cancelNotification(id, identity)
  }

  async retry(id, identity) {
    return this.#manager.retryNotification(id, identity)
  }

  async markSent(id, identity) {
    return this.#manager.markSent(id, identity)
  }

  async markDelivered(id, identity) {
    return this.#manager.markDelivered(id, identity)
  }

  async markFailed(id, errorMessage, identity) {
    return this.#manager.markFailed(id, errorMessage, identity)
  }

  async archive(id, identity) {
    return this.#manager.archiveNotification(id, identity)
  }

  async restore(id, identity) {
    return this.#manager.restoreNotification(id, identity)
  }

  async delete(id, identity) {
    return this.#manager.deleteNotification(id, identity)
  }

  async get(id, identity) {
    return this.#manager.getNotification(id, identity)
  }

  async list(filter, identity) {
    return this.#manager.findNotifications(filter, identity)
  }

  async findByRecipient(recipientId, identity) {
    return this.#manager.findByRecipient(recipientId, identity)
  }

  async findByBusiness(businessId, identity) {
    return this.#manager.findByBusiness(businessId, identity)
  }

  async findByReservation(reservationId, identity) {
    return this.#manager.findByReservation(reservationId, identity)
  }

  async findByPayment(paymentId, identity) {
    return this.#manager.findByPayment(paymentId, identity)
  }

  async findPending(identity) {
    return this.#manager.findPending(identity)
  }

  async findScheduled(identity) {
    return this.#manager.findScheduled(identity)
  }

  async findSent(identity) {
    return this.#manager.findSent(identity)
  }

  async findFailed(identity) {
    return this.#manager.findFailed(identity)
  }

  async findArchived(identity) {
    return this.#manager.findArchived(identity)
  }

  async getStatistics(businessId, identity) {
    return this.#manager.getNotificationStatistics(businessId, identity)
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
}
