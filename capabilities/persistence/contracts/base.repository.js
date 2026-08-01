import { RepositoryNotFoundError, RepositoryValidationError } from '../errors/repository.errors.js'

export class BaseRepository {
  static entityName = null
  static version = '1.0.0'
  static dependencies = []
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true

  #adapter = null
  #context = null
  #initialized = false
  #disposed = false

  constructor(adapter, context, config = {}) {
    if (new.target === BaseRepository) {
      throw new Error('BaseRepository is abstract — extend it')
    }
    this.#adapter = adapter
    this.#context = context
    this.config = config
    this.metadata = {
      entityName: this.constructor.entityName,
      version: this.constructor.version,
      readOnly: this.constructor.readOnly,
      aggregate: this.constructor.aggregate,
      softDeletable: this.constructor.softDeletable,
    }
  }

  get adapter() { return this.#adapter }
  get context() { return this.#context }
  get initialized() { return this.#initialized }
  get disposed() { return this.#disposed }

  async initialize() { this.#initialized = true }
  async destroy() { this.#disposed = true; this.#adapter = null; this.#context = null }

  _enforceNotDisposed() {
    if (this.#disposed) throw new Error(`Repository ${this.constructor.entityName} is disposed`)
  }
  _enforceInitialized() {
    if (!this.#initialized) throw new Error(`Repository ${this.constructor.entityName} is not initialized`)
  }
  _enforceWritable() {
    if (this.constructor.readOnly) throw new Error(`Repository ${this.constructor.entityName} is read-only`)
  }
  _enforceContext() {
    if (!this.#context) throw new Error(`Repository ${this.constructor.entityName} has no context`)
  }

  _buildQuery(query) {
    let q = { ...query }
    const tenant = this.#context?.tenant
    if (tenant && typeof tenant === 'string') q = { ...q, tenantId: tenant }
    else if (tenant && typeof tenant === 'object' && tenant.id) q = { ...q, tenantId: tenant.id }
    const destination = this.#context?.destination
    if (destination && typeof destination === 'string') q = { ...q, destinationId: destination }
    if (this.constructor.softDeletable && !q._includeDeleted) q = { ...q, deletedAt: null }
    const { _includeDeleted, ...clean } = q
    return clean
  }

  _emit(event, data) {
    this.#context?.eventBus?.emit(event, { entityName: this.constructor.entityName, ...data, timestamp: Date.now() })
  }

  async findById(id, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    const query = this._buildQuery({ id })
    const result = await this.#adapter.findOne(query, options)
    if (!result && options.throwIfNotFound !== false) {
      throw new RepositoryNotFoundError(`${this.constructor.entityName} with id ${id} not found`, { entityName: this.constructor.entityName, entityId: id, operation: 'findById', tenant: this.#context?.tenant })
    }
    return result
  }

  async findMany(query = {}, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    return this.#adapter.find(this._buildQuery(query), options)
  }

  async findOne(query = {}, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    const result = await this.#adapter.findOne(this._buildQuery(query), options)
    if (!result && options.throwIfNotFound) {
      throw new RepositoryNotFoundError(`${this.constructor.entityName} not found`, { entityName: this.constructor.entityName, operation: 'findOne', tenant: this.#context?.tenant })
    }
    return result || null
  }

  async findAll(options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    return this.#adapter.find(this._buildQuery({}), options)
  }

  async exists(query = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    return this.#adapter.exists(this._buildQuery(query))
  }

  async count(query = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    return this.#adapter.count(this._buildQuery(query))
  }

  async create(data, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const entity = await this.#adapter.create(data, options)
    this._emit('repository:entity_created', { entityId: entity?.id })
    return entity
  }

  async createMany(data, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const entities = await this.#adapter.createMany(data, options)
    this._emit('repository:entity_created', { count: data.length })
    return entities
  }

  async update(query, data, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const q = this._buildQuery(query)
    if (options.optimisticLock !== undefined) {
      const current = await this.#adapter.findOne(q)
      if (!current) throw new RepositoryNotFoundError(`${this.constructor.entityName} not found for update`, { entityName: this.constructor.entityName, operation: 'update' })
      if (current.version !== options.optimisticLock) {
        const { RepositoryConcurrencyError } = await import('../errors/repository.errors.js')
        throw new RepositoryConcurrencyError(`Version conflict on ${this.constructor.entityName}`, { entityName: this.constructor.entityName, entityId: current.id, operation: 'update', expectedVersion: options.optimisticLock, actualVersion: current.version })
      }
      data = { ...data, version: (current.version || 0) + 1 }
    }
    const result = await this.#adapter.update(q, data, options)
    this._emit('repository:entity_updated', { data })
    return result
  }

  async updateMany(query, data, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const count = await this.#adapter.updateMany(this._buildQuery(query), data, options)
    this._emit('repository:entity_updated', { count })
    return count
  }

  async delete(query, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const result = await this.#adapter.delete(this._buildQuery(query), options)
    this._emit('repository:entity_deleted', {})
    return result
  }

  async upsert(query, data, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const result = await this.#adapter.upsert(this._buildQuery(query), data, options)
    this._emit('repository:entity_created', { entityId: result?.id, upsert: true })
    return result
  }

  async validate(data) {
    if (!data || typeof data !== 'object') return { valid: false, errors: ['Data must be an object'] }
    return { valid: true, errors: [] }
  }

  async paginate(query = {}, page = 1, size = 50, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    return this.#adapter.paginate(this._buildQuery(query), page, size, options)
  }

  async cursor(query = {}, cursor, limit = 50, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    return this.#adapter.find(this._buildQuery(query), { ...options, cursor, limit })
  }
}
