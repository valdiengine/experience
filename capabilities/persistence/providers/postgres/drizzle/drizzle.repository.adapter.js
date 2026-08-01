import { DRIZZLE_EVENTS, createDrizzleEvent } from './drizzle.events.js'
import { DrizzleError } from './drizzle.errors.js'

export class DrizzleRepositoryAdapter {
  constructor(entityName, drizzleClient, queryBuilder, schema, options = {}) {
    this.entityName = entityName
    this.client = drizzleClient
    this.queryBuilder = queryBuilder
    this.schema = schema
    this.eventBus = options.eventBus || null
    this.initialized = false
    this.config = options
  }

  async initialize() {
    this.initialized = true
  }

  async destroy() {
    this.initialized = false
  }

  async ping() {
    try {
      const result = await this.client.db.query(`SELECT 1 AS ping FROM "${this.schema.tableName}" LIMIT 1`)
      return true
    } catch { return false }
  }

  get db() { return this.client.db }

  async find(query, options = {}) {
    const builder = this.queryBuilder.select(this.schema, query, options)
    const { text, params } = builder.toSQL()
    try {
      const result = await this.db.query(text, params)
      this.#emit(DRIZZLE_EVENTS.DRIZZLE_QUERY_EXECUTED, { operation: 'find', entityName: this.entityName, rowCount: result?.rows?.length || 0 })
      return result?.rows || []
    } catch (err) {
      throw new DrizzleError(`Drizzle find failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'find', query: text.substring(0, 100), cause: err })
    }
  }

  async findOne(query, options = {}) {
    const results = await this.find(query, { ...options, limit: 1 })
    return results[0] || null
  }

  async findById(id, options = {}) {
    return this.findOne({ [this.schema.primaryKey || 'id']: id }, options)
  }

  async findAll(options = {}) {
    return this.find({}, options)
  }

  async count(query) {
    const builder = this.queryBuilder.count(this.schema, query)
    const { text, params } = builder.toSQL()
    try {
      const result = await this.db.query(text, params)
      const count = parseInt(result?.rows?.[0]?.count ?? '0', 10)
      return count
    } catch (err) {
      throw new DrizzleError(`Drizzle count failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'count', cause: err })
    }
  }

  async exists(query) {
    const count = await this.count(query)
    return count > 0
  }

  async create(data, options = {}) {
    const builder = this.queryBuilder.insert(this.schema, data, options)
    const { text, params } = builder.toSQL()
    try {
      const result = await this.db.query(text, params)
      return result?.rows?.[0] || data
    } catch (err) {
      throw new DrizzleError(`Drizzle create failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'create', cause: err })
    }
  }

  async createMany(dataArray, options = {}) {
    const results = []
    for (const data of dataArray) {
      const entity = await this.create(data, options)
      results.push(entity)
    }
    return results
  }

  async update(query, data, options = {}) {
    const builder = this.queryBuilder.update(this.schema, query, data, options)
    const { text, params } = builder.toSQL()
    try {
      const result = await this.db.query(text, params)
      return result?.rows?.[0] || null
    } catch (err) {
      throw new DrizzleError(`Drizzle update failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'update', cause: err })
    }
  }

  async updateMany(query, data, options = {}) {
    const builder = this.queryBuilder.update(this.schema, query, data, { ...options, returning: false })
    const { text, params } = builder.toSQL()
    try {
      const result = await this.db.query(text, params)
      return result?.rowCount || 0
    } catch (err) {
      throw new DrizzleError(`Drizzle updateMany failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'updateMany', cause: err })
    }
  }

  async delete(query, options = {}) {
    const builder = this.queryBuilder.delete(this.schema, query, options)
    const { text, params } = builder.toSQL()
    try {
      const result = await this.db.query(text, params)
      return (result?.rowCount || 0) > 0
    } catch (err) {
      throw new DrizzleError(`Drizzle delete failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'delete', cause: err })
    }
  }

  async softDelete(query, options = {}) {
    return this.update(query, { deletedAt: new Date().toISOString() }, { ...options, softDelete: true })
  }

  async restore(query, options = {}) {
    return this.update(query, { deletedAt: null }, { ...options, softDelete: true })
  }

  async upsert(query, data, options = {}) {
    const existing = await this.findOne(query)
    if (existing) return this.update(query, { ...existing, ...data }, options)
    return this.create({ ...query, ...data }, options)
  }

  async paginate(query, page, size, options = {}) {
    const offset = (page - 1) * size
    const [items, total] = await Promise.all([
      this.find(query, { ...options, limit: size, offset }),
      this.count(query),
    ])
    return {
      data: items,
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
      hasNext: page * size < total,
      hasPrev: page > 1,
    }
  }

  async search(text, options = {}) {
    const searchFields = options.searchFields || ['name', 'description']
    const conditions = searchFields.map(f => `"${f}"::text ILIKE '%' || $1 || '%'`)
    const whereClause = conditions.length > 0 ? `WHERE (${conditions.join(' OR ')})` : ''
    const sql = `SELECT * FROM "${this.schema.tableName}" ${whereClause} LIMIT ${options.limit || 50}`
    try {
      const result = await this.db.query(sql, [text])
      return result?.rows || []
    } catch (err) {
      throw new DrizzleError(`Drizzle search failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'search', cause: err })
    }
  }

  async aggregate(pipeline, options = {}) {
    const stages = pipeline.map(s => Object.entries(s)[0])
    let sql = `SELECT * FROM "${this.schema.tableName}"`
    for (const [stage, value] of stages) {
      if (stage === '$match' && value) {
        const conditions = Object.entries(value).map(([k, v]) => `"${k}" = '${v}'`).join(' AND ')
        sql += ` WHERE ${conditions}`
      }
      if (stage === '$group') {
        const fields = Object.entries(value).map(([k, v]) => `${v} AS "${k}"`).join(', ')
        sql = `SELECT ${fields} FROM "${this.schema.tableName}"`
      }
      if (stage === '$sort' && value) {
        const sorts = Object.entries(value).map(([k, v]) => `"${k}" ${v === -1 ? 'DESC' : 'ASC'}`).join(', ')
        sql += ` ORDER BY ${sorts}`
      }
      if (stage === '$limit') sql += ` LIMIT ${value}`
      if (stage === '$skip') sql += ` OFFSET ${value}`
    }
    try {
      const result = await this.db.query(sql)
      return result?.rows || []
    } catch (err) {
      throw new DrizzleError(`Drizzle aggregate failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'aggregate', cause: err })
    }
  }

  async distinct(field, query = {}) {
    const where = Object.keys(query).length > 0
      ? `WHERE ${Object.entries(query).map(([k, v]) => `"${k}" = '${v}'`).join(' AND ')}`
      : ''
    const sql = `SELECT DISTINCT "${field}" FROM "${this.schema.tableName}" ${where}`
    try {
      const result = await this.db.query(sql)
      return result?.rows?.map(r => r[field]) || []
    } catch (err) {
      throw new DrizzleError(`Drizzle distinct failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'distinct', cause: err })
    }
  }

  async bulkCreate(dataArray, options = {}) {
    return this.createMany(dataArray, options)
  }

  async bulkUpdate(query, data, options = {}) {
    return this.updateMany(query, data, options)
  }

  async bulkDelete(query, options = {}) {
    return this.delete(query, options)
  }

  async projection(query, fields, options = {}) {
    const fieldList = fields.map(f => `"${f}"`).join(', ')
    const where = Object.keys(query).length > 0
      ? `WHERE ${Object.entries(query).map(([k, v]) => `"${k}" = '${v}'`).join(' AND ')}`
      : ''
    const sql = `SELECT ${fieldList} FROM "${this.schema.tableName}" ${where} LIMIT ${options.limit || 100}`
    try {
      const result = await this.db.query(sql)
      return result?.rows || []
    } catch (err) {
      throw new DrizzleError(`Drizzle projection failed for ${this.entityName}: ${err.message}`, { entityName: this.entityName, operation: 'projection', cause: err })
    }
  }

  #emit(event, data) {
    if (this.eventBus) this.eventBus.emit(event, createDrizzleEvent(event, data))
  }
}

export default DrizzleRepositoryAdapter
