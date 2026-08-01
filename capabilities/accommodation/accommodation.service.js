export class AccommodationService {
  #manager

  constructor(manager) {
    this.#manager = manager
  }

  async create(data, identity) {
    return this.#manager.createAccommodation(data, identity)
  }

  async get(id, identity) {
    return this.#manager.getById(id, identity)
  }

  async list(filter, identity) {
    return this.#manager.getMany(filter, identity)
  }

  async update(id, data, identity) {
    return this.#manager.updateAccommodation(id, data, identity)
  }

  async publish(id, identity) {
    return this.#manager.publishAccommodation(id, identity)
  }

  async unpublish(id, identity) {
    return this.#manager.unpublishAccommodation(id, identity)
  }

  async archive(id, identity) {
    return this.#manager.archiveAccommodation(id, identity)
  }

  async restore(id, identity) {
    return this.#manager.restoreAccommodation(id, identity)
  }

  async delete(id, identity) {
    return this.#manager.deleteAccommodation(id, identity)
  }

  async duplicate(id, identity) {
    return this.#manager.duplicateAccommodation(id, identity)
  }
}
