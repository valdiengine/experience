import { OrmNotImplementedError } from './orm.errors.js'

export class OrmAdapter {
  constructor(model, config = {}) {
    if (new.target === OrmAdapter) throw new Error('OrmAdapter is abstract — extend it')
    this.model = model
    this.config = config
    this.entityName = config.entityName || 'unknown'
    this.providerName = config.providerName || 'unknown'
    this.initialized = false
  }

  async initialize() { this.initialized = true }

  async destroy() {
    this.initialized = false
    this.model = null
    this.config = {}
  }

  async ping() { throw new OrmNotImplementedError('ping', this.entityName) }

  async find(query, options) { throw new OrmNotImplementedError('find', this.entityName) }
  async findOne(query, options) { throw new OrmNotImplementedError('findOne', this.entityName) }
  async findById(id, options) { throw new OrmNotImplementedError('findById', this.entityName) }
  async findAll(options) { throw new OrmNotImplementedError('findAll', this.entityName) }
  async count(query) { throw new OrmNotImplementedError('count', this.entityName) }
  async exists(query) { throw new OrmNotImplementedError('exists', this.entityName) }
  async create(data, options) { throw new OrmNotImplementedError('create', this.entityName) }
  async createMany(data, options) { throw new OrmNotImplementedError('createMany', this.entityName) }
  async update(query, data, options) { throw new OrmNotImplementedError('update', this.entityName) }
  async updateMany(query, data, options) { throw new OrmNotImplementedError('updateMany', this.entityName) }
  async delete(query, options) { throw new OrmNotImplementedError('delete', this.entityName) }
  async softDelete(query, options) { throw new OrmNotImplementedError('softDelete', this.entityName) }
  async restore(query, options) { throw new OrmNotImplementedError('restore', this.entityName) }
  async upsert(query, data, options) { throw new OrmNotImplementedError('upsert', this.entityName) }
  async paginate(query, page, size, options) { throw new OrmNotImplementedError('paginate', this.entityName) }
  async search(text, options) { throw new OrmNotImplementedError('search', this.entityName) }
  async aggregate(pipeline, options) { throw new OrmNotImplementedError('aggregate', this.entityName) }
  async distinct(field, query) { throw new OrmNotImplementedError('distinct', this.entityName) }
  async bulkCreate(data, options) { throw new OrmNotImplementedError('bulkCreate', this.entityName) }
  async bulkUpdate(query, data, options) { throw new OrmNotImplementedError('bulkUpdate', this.entityName) }
  async bulkDelete(query, options) { throw new OrmNotImplementedError('bulkDelete', this.entityName) }
  async projection(query, fields, options) { throw new OrmNotImplementedError('projection', this.entityName) }

  toEntity(raw) { throw new OrmNotImplementedError('toEntity', this.entityName) }
  fromEntity(entity) { throw new OrmNotImplementedError('fromEntity', this.entityName) }
}

export default OrmAdapter
