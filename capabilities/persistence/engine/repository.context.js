export class RepositoryContext {
  #tenant = null
  #destination = null
  #identity = null
  #permissions = null
  #locale = null
  #timezone = null
  #logger = null
  #cache = null
  #eventBus = null
  #unitOfWork = null
  #provider = null
  #configuration = null

  constructor(options = {}) {
    this.#tenant = options.tenant || null
    this.#destination = options.destination || null
    this.#identity = options.identity || null
    this.#permissions = options.permissions || null
    this.#locale = options.locale || 'en'
    this.#timezone = options.timezone || 'UTC'
    this.#logger = options.logger || null
    this.#cache = options.cache || null
    this.#eventBus = options.eventBus || null
    this.#unitOfWork = options.unitOfWork || null
    this.#provider = options.provider || null
    this.#configuration = options.configuration || {}
  }

  get tenant() { return this.#tenant }
  get destination() { return this.#destination }
  get identity() { return this.#identity }
  get permissions() { return this.#permissions }
  get locale() { return this.#locale }
  get timezone() { return this.#timezone }
  get logger() { return this.#logger }
  get cache() { return this.#cache }
  get eventBus() { return this.#eventBus }
  get unitOfWork() { return this.#unitOfWork }
  get provider() { return this.#provider }
  get configuration() { return this.#configuration }
  get hasActiveTransaction() { return this.#unitOfWork !== null && !this.#unitOfWork.disposed }

  set unitOfWork(uow) { this.#unitOfWork = uow }

  withUnitOfWork(uow) {
    return new RepositoryContext({
      tenant: this.#tenant, destination: this.#destination, identity: this.#identity,
      permissions: this.#permissions, locale: this.#locale, timezone: this.#timezone,
      logger: this.#logger, cache: this.#cache, eventBus: this.#eventBus, unitOfWork: uow,
      provider: this.#provider, configuration: this.#configuration,
    })
  }

  withIdentity(identity) {
    return new RepositoryContext({
      tenant: this.#tenant, destination: this.#destination, identity,
      permissions: this.#permissions, locale: this.#locale, timezone: this.#timezone,
      logger: this.#logger, cache: this.#cache, eventBus: this.#eventBus, unitOfWork: this.#unitOfWork,
      provider: this.#provider, configuration: this.#configuration,
    })
  }

  toJSON() {
    return {
      tenant: this.#tenant, destination: this.#destination,
      identity: this.#identity ? { id: this.#identity.id, roles: this.#identity.roles } : null,
      locale: this.#locale, timezone: this.#timezone, hasUnitOfWork: this.#unitOfWork !== null,
    }
  }
}
