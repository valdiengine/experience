export class VisitorService {
  #manager

  constructor(manager) {
    this.#manager = manager
  }

  async create(data, identity) {
    return this.#manager.createVisitor(data, identity)
  }

  async get(id, identity) {
    return this.#manager.getById(id, identity)
  }

  async list(filter, identity) {
    return this.#manager.getMany(filter, identity)
  }

  async update(id, data, identity) {
    return this.#manager.updateVisitor(id, data, identity)
  }

  async delete(id, identity) {
    return this.#manager.deleteVisitor(id, identity)
  }

  async archive(id, identity) {
    return this.#manager.archiveVisitor(id, identity)
  }

  async restore(id, identity) {
    return this.#manager.restoreVisitor(id, identity)
  }

  async verify(id, identity) {
    return this.#manager.verifyVisitor(id, identity)
  }

  async activate(id, identity) {
    return this.#manager.activateVisitor(id, identity)
  }

  async deactivate(id, identity) {
    return this.#manager.deactivateVisitor(id, identity)
  }

  async grantVIP(id, identity) {
    return this.#manager.grantVIP(id, identity)
  }

  async revokeVIP(id, identity) {
    return this.#manager.revokeVIP(id, identity)
  }

  async blacklist(id, reason, identity) {
    return this.#manager.blacklistVisitor(id, reason, identity)
  }

  async removeFromBlacklist(id, identity) {
    return this.#manager.removeFromBlacklist(id, identity)
  }

  async findByName(name, identity) {
    return this.#manager.findByName(name, identity)
  }

  async findByEmail(email, identity) {
    return this.#manager.findByEmail(email, identity)
  }

  async findByPhone(phone, identity) {
    return this.#manager.findByPhone(phone, identity)
  }

  async findByIdentity(identityId, identityProvider, identity) {
    return this.#manager.findByIdentity(identityId, identityProvider, identity)
  }

  async findByReservation(reservationId, identity) {
    return this.#manager.findByReservation(reservationId, identity)
  }

  async findByBusiness(businessId, identity) {
    return this.#manager.findByBusiness(businessId, identity)
  }

  async findVIP(identity) {
    return this.#manager.findVIPVisitors(identity)
  }

  async findBlacklisted(identity) {
    return this.#manager.findBlacklisted(identity)
  }

  async findInactive(identity) {
    return this.#manager.findInactive(identity)
  }

  async merge(targetId, sourceId, identity) {
    return this.#manager.mergeVisitors(targetId, sourceId, identity)
  }

  async calculateStatistics(id, identity) {
    return this.#manager.calculateStatistics(id, identity)
  }

  async updatePreferences(id, preferences, identity) {
    return this.#manager.updatePreferences(id, preferences, identity)
  }

  async updateProfile(id, profile, identity) {
    return this.#manager.updateProfile(id, profile, identity)
  }

  async addTag(id, tag, identity) {
    return this.#manager.addTag(id, tag, identity)
  }

  async removeTag(id, tag, identity) {
    return this.#manager.removeTag(id, tag, identity)
  }
}
