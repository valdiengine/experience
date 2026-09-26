import { RepositoryAdapter } from '../repository.adapter.js'
import { query } from '../../../../database/connection/postgres.connection.js'

const FILTER_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  status: 'status',
  destinationId: 'destination_id',
}

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    status: row.status,
    isActive: row.is_active,
    destinationId: row.destination_id,
    logo: row.logo,
    coverImage: row.cover_image,
    description: row.description,
    shortDescription: row.short_description,
    contact: row.contact || {},
    location: row.location || {},
    hours: row.hours || {},
    social: row.social || {},
    website: row.website,
    email: row.email,
    phone: row.phone,
    taxId: row.tax_id,
    registrationNumber: row.registration_number,
    foundedYear: row.founded_year,
    employeeCount: row.employee_count,
    branding: row.branding || {},
    metadata: row.metadata || {},
    settings: row.settings || {},
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildWhere(filters = {}, startIndex = 1) {
  const clauses = []
  const values = []
  let index = startIndex

  for (const [key, rawValue] of Object.entries(filters)) {
    if (key === 'deletedAt') continue

    const column = FILTER_COLUMNS[key]

    if (!column) {
      throw new Error(`Unsupported business filter: ${key}`)
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
          throw new Error(`Unsupported business filter operator: ${operator}`)
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

export class PostgresBusinessAdapter extends RepositoryAdapter {
  constructor(provider, config = {}) {
    super(provider, config)
    this.entityName = 'business'
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
      `SELECT * FROM companies WHERE ${where.sql}${suffix}`,
      values
    )

    return result.rows.map(mapRow)
  }

  async findOne(filters = {}) {
    const where = buildWhere(filters)

    const result = await query(
      `SELECT * FROM companies WHERE ${where.sql} ORDER BY created_at DESC LIMIT 1`,
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

export default PostgresBusinessAdapter
