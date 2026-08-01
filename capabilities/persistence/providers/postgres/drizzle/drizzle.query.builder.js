import { DrizzleError } from './drizzle.errors.js'

export class DrizzleQueryBuilder {
  constructor(options = {}) {
    this.eventBus = options.eventBus || null
    this._paramIndex = 0
    this._params = []
  }

  select(schema, query = {}, options = {}) {
    this.#reset()
    const fields = options.fields || '*'
    const fieldList = Array.isArray(fields) ? fields.map(f => `"${f}"`).join(', ') : fields
    const table = `"${schema.tableName}"`
    let sql = `SELECT ${fieldList} FROM ${table}`
    const where = this.#buildWhere(schema, query)
    if (where) sql += ` WHERE ${where}`
    if (options.sort) sql += this.#buildOrderBy(options.sort)
    if (options.limit) sql += ` LIMIT ${this.#param(options.limit)}`
    if (options.offset) sql += ` OFFSET ${this.#param(options.offset)}`
    return { text: sql, params: this._params, toSQL: () => ({ text: sql, params: this._params }) }
  }

  count(schema, query = {}) {
    this.#reset()
    const table = `"${schema.tableName}"`
    let sql = `SELECT COUNT(*) as count FROM ${table}`
    const where = this.#buildWhere(schema, query)
    if (where) sql += ` WHERE ${where}`
    return { text: sql, params: this._params, toSQL: () => ({ text: sql, params: this._params }) }
  }

  insert(schema, data, options = {}) {
    this.#reset()
    const table = `"${schema.tableName}"`
    const entries = Object.entries(data || {}).filter(([, v]) => v !== undefined)
    if (entries.length === 0) throw new DrizzleError('No data to insert', { entityName: schema.entityName, operation: 'insert' })
    const cols = entries.map(([k]) => `"${k}"`).join(', ')
    const vals = entries.map(([, v]) => this.#param(v)).join(', ')
    const returning = options.returning !== false ? ' RETURNING *' : ''
    return { text: `INSERT INTO ${table} (${cols}) VALUES (${vals})${returning}`, params: this._params, toSQL: () => ({ text: `INSERT INTO ${table} (${cols}) VALUES (${vals})${returning}`, params: this._params }) }
  }

  update(schema, query, data, options = {}) {
    this.#reset()
    const table = `"${schema.tableName}"`
    const entries = Object.entries(data || {}).filter(([, v]) => v !== undefined)
    if (entries.length === 0) throw new DrizzleError('No data to update', { entityName: schema.entityName, operation: 'update' })
    const sets = entries.map(([k, v]) => `"${k}" = ${this.#param(v)}`).join(', ')
    const where = this.#buildWhere(schema, query)
    const returning = options.returning !== false ? ' RETURNING *' : ''
    let sql = `UPDATE ${table} SET ${sets}`
    if (where) sql += ` WHERE ${where}`
    sql += returning
    return { text: sql, params: this._params, toSQL: () => ({ text: sql, params: this._params }) }
  }

  delete(schema, query, options = {}) {
    this.#reset()
    const table = `"${schema.tableName}"`
    let sql = `DELETE FROM ${table}`
    const where = this.#buildWhere(schema, query)
    if (where) sql += ` WHERE ${where}`
    if (options.returning) sql += ' RETURNING *'
    return { text: sql, params: this._params, toSQL: () => ({ text: sql, params: this._params }) }
  }

  #buildWhere(schema, query) {
    if (!query || Object.keys(query).length === 0) return null
    const conditions = []
    for (const [key, value] of Object.entries(query)) {
      if (key === 'and' && Array.isArray(value)) {
        const nested = value.map(v => this.#buildWhere(schema, v)).filter(Boolean)
        if (nested.length > 0) conditions.push(`(${nested.join(' AND ')})`)
      } else if (key === 'or' && Array.isArray(value)) {
        const nested = value.map(v => this.#buildWhere(schema, v)).filter(Boolean)
        if (nested.length > 0) conditions.push(`(${nested.join(' OR ')})`)
      } else if (key === 'not' && value) {
        const notWhere = this.#buildWhere(schema, value)
        if (notWhere) conditions.push(`(NOT ${notWhere})`)
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        conditions.push(this.#buildOperatorCondition(key, value))
      } else if (value === null) {
        conditions.push(`"${key}" IS NULL`)
      } else {
        conditions.push(`"${key}" = ${this.#param(value)}`)
      }
    }
    return conditions.join(' AND ')
  }

  #buildOperatorCondition(field, ops) {
    const parts = []
    for (const [op, value] of Object.entries(ops)) {
      switch (op) {
        case 'eq': parts.push(`"${field}" = ${this.#param(value)}`); break
        case 'ne': parts.push(`"${field}" != ${this.#param(value)}`); break
        case 'gt': parts.push(`"${field}" > ${this.#param(value)}`); break
        case 'gte': parts.push(`"${field}" >= ${this.#param(value)}`); break
        case 'lt': parts.push(`"${field}" < ${this.#param(value)}`); break
        case 'lte': parts.push(`"${field}" <= ${this.#param(value)}`); break
        case 'in': parts.push(`"${field}" = ANY(${this.#param(value)})`); break
        case 'notIn': parts.push(`"${field}" != ALL(${this.#param(value)})`); break
        case 'contains': parts.push(`"${field}"::text ILIKE ${this.#param(`%${value}%`)}`); break
        case 'notContains': parts.push(`"${field}"::text NOT ILIKE ${this.#param(`%${value}%`)}`); break
        case 'startsWith': parts.push(`"${field}"::text ILIKE ${this.#param(`${value}%`)}`); break
        case 'endsWith': parts.push(`"${field}"::text ILIKE ${this.#param(`%${value}`)}`); break
        case 'like': parts.push(`"${field}" LIKE ${this.#param(value)}`); break
        case 'ilike': parts.push(`"${field}" ILIKE ${this.#param(value)}`); break
        case 'isNull': parts.push(`"${field}" IS NULL`); break
        case 'isNotNull': parts.push(`"${field}" IS NOT NULL`); break
        case 'between': parts.push(`"${field}" BETWEEN ${this.#param(value[0])} AND ${this.#param(value[1])}`); break
      }
    }
    return parts.join(' AND ')
  }

  #buildOrderBy(sort) {
    if (typeof sort === 'string') return ` ORDER BY "${sort}" ASC`
    if (Array.isArray(sort)) {
      const parts = sort.map(s => {
        if (typeof s === 'string') return `"${s}" ASC`
        return `"${s.field || s}" ${(s.direction || 'asc').toUpperCase()}`
      })
      return ` ORDER BY ${parts.join(', ')}`
    }
    if (typeof sort === 'object') {
      const parts = Object.entries(sort).map(([k, v]) => `"${k}" ${(v || 'asc').toUpperCase()}`)
      return ` ORDER BY ${parts.join(', ')}`
    }
    return ''
  }

  #param(value) {
    this._paramIndex++
    this._params.push(value)
    return `$${this._paramIndex}`
  }

  #reset() {
    this._paramIndex = 0
    this._params = []
  }
}

export default DrizzleQueryBuilder
