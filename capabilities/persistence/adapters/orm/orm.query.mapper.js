import { OrmQueryError } from './orm.errors.js'

export class OrmQueryMapper {
  constructor(config = {}) {
    this.config = config
    this.operatorMap = {
      eq: '=',
      ne: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      in: 'in',
      notIn: 'notIn',
      contains: 'contains',
      notContains: 'notContains',
      startsWith: 'startsWith',
      endsWith: 'endsWith',
      between: 'between',
      like: 'like',
      ilike: 'ilike',
      isNull: 'isNull',
      isNotNull: 'isNotNull',
    }
    this.specOperators = new Set(['and', 'or', 'not'])
  }

  toOrmQuery(repositoryQuery, options = {}) {
    if (!repositoryQuery || typeof repositoryQuery !== 'object') {
      throw new OrmQueryError('Invalid repository query', { query: repositoryQuery })
    }
    const { filters, sort, page, size, projection, include, search, ...rest } = repositoryQuery
    const ormQuery = {}
    if (filters || Object.keys(rest).length > 0) {
      ormQuery.where = this.#buildWhere(filters || rest)
    }
    if (sort) ormQuery.orderBy = this.#buildSort(sort)
    if (page !== undefined && size !== undefined) {
      ormQuery.skip = (page - 1) * size
      ormQuery.take = size
    } else if (page !== undefined) {
      ormQuery.skip = (page - 1) * (options.defaultSize || 20)
      ormQuery.take = options.defaultSize || 20
    }
    if (projection) ormQuery.select = this.#buildProjection(projection)
    if (include) ormQuery.include = this.#buildIncludes(include)
    if (search && options.searchFields) {
      ormQuery.where = ormQuery.where || {}
      ormQuery.where.OR = this.#buildSearch(search, options.searchFields)
    }
    if (options.cursor) ormQuery.cursor = this.#buildCursor(options.cursor)
    if (options.distinct) ormQuery.distinct = true
    return ormQuery
  }

  toOrmAggregation(pipeline, options = {}) {
    if (!Array.isArray(pipeline)) {
      throw new OrmQueryError('Aggregation pipeline must be an array', { pipeline })
    }
    return pipeline.map((stage, i) => this.#mapAggStage(stage, i))
  }

  #buildWhere(filters) {
    if (Array.isArray(filters)) {
      return { AND: filters.map(f => this.#mapFilter(f)) }
    }
    if (typeof filters !== 'object' || filters === null) return {}
    const entries = Object.entries(filters)
    if (entries.length === 0) return {}
    const conditions = entries.map(([key, value]) => this.#mapCondition(key, value))
    return conditions.length === 1 ? conditions[0] : { AND: conditions }
  }

  #mapCondition(key, value) {
    if (key === 'and' && Array.isArray(value)) return { AND: value.map(v => this.#buildWhere(v)) }
    if (key === 'or' && Array.isArray(value)) return { OR: value.map(v => this.#buildWhere(v)) }
    if (key === 'not' && value) {
      const not = this.#buildWhere(value)
      return { NOT: Object.keys(not).length === 1 && (not.AND || not.OR) ? not : not }
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const ops = Object.entries(value)
      if (ops.length === 0) return { [key]: { equals: value } }
      if (ops.length === 1 && ops[0][0] === 'eq') return { [key]: ops[0][1] }
      const ormCond = {}
      for (const [op, opValue] of ops) {
        const mapped = this.operatorMap[op]
        if (mapped) {
          if (mapped === 'between') {
            ormCond[key] = { gte: opValue[0], lte: opValue[1] }
          } else {
            ormCond[key] = { [mapped]: opValue }
          }
        }
      }
      return ormCond
    }
    return { [key]: value }
  }

  #mapFilter(filter) {
    if (typeof filter !== 'object') return filter
    const entries = Object.entries(filter)
    if (entries.length === 0) return {}
    const [key, value] = entries[0]
    return this.#mapCondition(key, value)
  }

  #buildSort(sort) {
    if (typeof sort === 'string') return { [sort]: 'asc' }
    if (Array.isArray(sort)) {
      const result = {}
      for (const s of sort) {
        if (typeof s === 'string') result[s] = 'asc'
        else if (s.field) result[s.field] = s.direction || 'asc'
      }
      return result
    }
    if (typeof sort === 'object') return sort
    return {}
  }

  #buildProjection(fields) {
    if (Array.isArray(fields)) {
      const result = {}
      for (const f of fields) result[f] = true
      return result
    }
    if (typeof fields === 'object') return fields
    return {}
  }

  #buildIncludes(relations) {
    if (Array.isArray(relations)) {
      return relations.map(r => typeof r === 'string' ? { [r]: true } : r)
    }
    if (typeof relations === 'object') return relations
    return {}
  }

  #buildSearch(text, searchFields) {
    if (!text || !searchFields?.length) return []
    return searchFields.map(field => ({
      [field]: { contains: text, mode: 'insensitive' },
    }))
  }

  #buildCursor(cursor) {
    if (typeof cursor === 'object' && cursor.field) {
      return { [cursor.field]: cursor.value || cursor.after || cursor.before, ...cursor }
    }
    return cursor
  }

  #mapAggStage(stage, index) {
    if (stage.$match) return { $match: this.#buildWhere(stage.$match) }
    if (stage.$group) return { $group: stage.$group }
    if (stage.$sort) return { $sort: this.#buildSort(stage.$sort) }
    if (stage.$project) return { $project: this.#buildProjection(stage.$project) }
    if (stage.$limit) return { $limit: stage.$limit }
    if (stage.$skip) return { $skip: stage.$skip }
    if (stage.$count) return { $count: stage.$count }
    if (stage.$lookup) return { $lookup: stage.$lookup }
    return stage
  }

  getSupportedOperators() {
    return Object.keys(this.operatorMap)
  }
}

export default OrmQueryMapper
