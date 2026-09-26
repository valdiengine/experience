import { RepositoryAdapter } from '../repository.adapter.js'
import { query } from '../../../../database/connection/postgres.connection.js'

const FILTER_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  businessId: 'company_id',
  status: 'status',
  categoryId: 'category_id',
  ownerId: 'owner_id',
  type: 'type',
  deletedAt: 'deleted_at',
}

function toIso(value) {
  if (!value) return value ?? null
  if (value instanceof Date) return value.toISOString()
  return value
}

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    tenantId: row.tenant_id,
    businessId: row.company_id,
    categoryId: row.category_id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    status: row.status,
    description: row.description,
    shortDescription: row.short_description,
    images: row.images || [],
    gallery: row.gallery || [],
    location: row.location || {},
    contact: row.contact || {},
    amenities: row.amenities || [],
    policies: row.policies || {},
    rooms: row.rooms || [],
    pricing: row.pricing || {},
    inventory: row.inventory || {},
    seo: row.seo || {},
    branding: row.branding || {},
    rating: row.rating ? parseFloat(row.rating) : null,
    reviewCount: row.review_count,
    metadata: row.metadata || {},
    settings: row.settings || {},
    publishedAt: toIso(row.published_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: toIso(row.deleted_at),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  }
}

function buildWhere(filters = {}, startIndex = 1) {
  const clauses = []
  const values = []
  let index = startIndex

  for (const [key, rawValue] of Object.entries(filters)) {
    const column = FILTER_COLUMNS[key]

    if (!column) {
      throw new Error(`Unsupported accommodation filter: ${key}`)
    }

    if (key === 'deletedAt') {
      if (rawValue === null) {
        clauses.push(`deleted_at IS NULL`)
      }
      continue
    }

    if (rawValue === null) {
      clauses.push(`${column} IS NULL`)
      continue
    }

    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      for (const [operator, value] of Object.entries(rawValue)) {
        const sqlOperator = {
          eq: '=',
          ne: '<>',
          lt: '<',
          lte: '<=',
          gt: '>',
          gte: '>=',
        }[operator]

        if (!sqlOperator) {
          throw new Error(`Unsupported accommodation filter operator: ${operator}`)
        }

        clauses.push(`${column} ${sqlOperator} $${index++}`)
        values.push(value)
      }

      continue
    }

    clauses.push(`${column} = $${index++}`)
    values.push(rawValue)
  }

  return {
    sql: clauses.length ? clauses.join(' AND ') : 'TRUE',
    values,
    nextIndex: index,
  }
}

export class PostgresAccommodationAdapter extends RepositoryAdapter {
  constructor(provider, config = {}) {
    super(provider, config)
    this.entityName = 'accommodation'
  }

  async find(filters = {}, options = {}) {
    const where = buildWhere(filters)
    const values = [...where.values]
    let suffix = ' ORDER BY created_at DESC'

    if (Number.isInteger(options.limit) && options.limit > 0) {
      suffix += ` LIMIT $${values.length + 1}`
      values.push(options.limit)
    }

    const result = await query(
      `SELECT * FROM accommodations WHERE ${where.sql}${suffix}`,
      values
    )

    return result.rows.map(mapRow)
  }

  async findOne(filters = {}) {
    const where = buildWhere(filters)

    const result = await query(
      `SELECT * FROM accommodations WHERE ${where.sql} ORDER BY created_at DESC LIMIT 1`,
      where.values
    )

    return mapRow(result.rows[0])
  }

  async findById(id) {
    return this.findOne({ id })
  }

  async findAll(options = {}) {
    return this.find({}, options)
  }

  async ping() {
    return true
  }

  async health() {
    return { status: 'up', provider: 'postgres', entityName: this.entityName }
  }
}

export default PostgresAccommodationAdapter
