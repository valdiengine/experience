import { RepositoryAdapter } from '../repository.adapter.js'
import { query } from '../../../../database/connection/postgres.connection.js'

const FILTER_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  accommodationId: 'accommodation_id',
  date: 'date',
  status: 'status',
  isBlocked: 'is_blocked',
  isReserved: 'is_reserved',
  minStay: 'min_stay',
  maxStay: 'max_stay',
  targetType: 'target_type',
  targetId: 'target_id',
}

function toIso(value) {
  if (!value) return value ?? null
  if (value instanceof Date) return value.toISOString()
  return value
}

function toNumber(value) {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isNaN(number) ? value : number
}

/**
 * Reconstruct the domain availability projection from a physical row.
 * price lives in the jsonb price column as {raw, currency}; the domain
 * contract requires `price` to be a NUMBER (e.g. 90000) plus `currency`.
 * `available` is always derived from inventory - reservedCount (clamped at 0).
 * capacity/notes are domain metadata persisted in the metadata jsonb column.
 */
function mapRow(row) {
  if (!row) return null

  const priceJson = row.price || {}
  const price =
    typeof priceJson === 'number'
      ? priceJson
      : priceJson.raw != null
        ? toNumber(priceJson.raw)
        : null

  return {
    id: row.id,
    tenantId: row.tenant_id,
    accommodationId: row.accommodation_id,
    date: row.date,
    status: row.status,
    isBlocked: row.is_blocked === true,
    isReserved: row.is_reserved === true,
    minStay: row.min_stay,
    maxStay: row.max_stay,
    arrivalDays: row.arrival_days || [],
    departureDays: row.departure_days || [],
    price,
    currency: priceJson.currency ?? null,
    inventory: row.inventory ?? 1,
    reservedCount: row.reserved_count ?? 0,
    available: Math.max(0, (row.inventory ?? 0) - (row.reserved_count ?? 0)),
    capacity: row.metadata?.capacity ?? null,
    notes: row.metadata?.notes ?? '',
    metadata: row.metadata || {},
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function buildWhere(filters = {}, startIndex = 1) {
  const clauses = []
  const values = []
  let index = startIndex

  for (const [key, rawValue] of Object.entries(filters)) {
    // The availability table has no deleted_at column. BaseRepository
    // injects deletedAt: null for softDeletable entities, so it must be
    // ignored rather than rejected (see PostgresBusinessAdapter).
    if (key === 'deletedAt') continue

    const column = FILTER_COLUMNS[key]

    if (!column) {
      throw new Error(`Unsupported availability filter: ${key}`)
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
          throw new Error(`Unsupported availability filter operator: ${operator}`)
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

function buildPrice(data = {}) {
  if (data.price === undefined && data.currency === undefined) return undefined
  const price = {}
  if (data.price !== undefined) price.raw = data.price
  if (data.currency !== undefined) price.currency = data.currency
  return price
}

/**
 * Merge domain metadata (capacity, available, notes) into the metadata
 * jsonb column without destroying existing keys.
 */
function buildMetadata(data = {}) {
  const meta = { ...(data.metadata || {}) }
  if (data.capacity !== undefined && meta.capacity === undefined) meta.capacity = data.capacity
  if (data.available !== undefined && meta.available === undefined) meta.available = data.available
  if (data.notes !== undefined && meta.notes === undefined) meta.notes = data.notes
  if (Object.keys(meta).length === 0) return undefined
  return meta
}

function mapCreateFields(data = {}) {
  const fields = []

  const add = (column, value) => {
    if (value !== undefined) fields.push([column, value])
  }

  add('id', data.id)
  add('tenant_id', data.tenantId)
  add('accommodation_id', data.accommodationId)
  add('date', data.date)
  add('status', data.status)
  add('is_blocked', data.isBlocked ?? false)
  add('is_reserved', data.isReserved ?? false)
  add('min_stay', data.minStay)
  add('max_stay', data.maxStay)
  add('arrival_days', data.arrivalDays === undefined ? undefined : JSON.stringify(data.arrivalDays))
  add('departure_days', data.departureDays === undefined ? undefined : JSON.stringify(data.departureDays))
  add('price', buildPrice(data) === undefined ? undefined : JSON.stringify(buildPrice(data)))
  add('inventory', data.inventory ?? data.capacity ?? (data.available ?? 1))
  add('reserved_count', data.reservedCount ?? 0)
  add('metadata', buildMetadata(data) === undefined ? undefined : JSON.stringify(buildMetadata(data)))
  add('target_type', data.targetType || 'accommodation')
  add('target_id', data.targetId || data.accommodationId)
  add('created_at', data.createdAt)
  add('updated_at', data.updatedAt)

  return fields
}

/**
 * Update { SET clauses, values }. price/metadata merge with COALESCE(...) ||
 * $k::jsonb so existing jsonb content is never destroyed.
 */
function mapUpdateFields(data = {}) {
  const setClauses = []
  const values = []

  const add = (column, value) => {
    if (value === undefined) return
    const expression = column.includes('||') || column.includes('COALESCE')
      ? `${column} || $${values.length + 1}::jsonb`
      : `${column} = $${values.length + 1}`
    setClauses.push(expression)
    values.push(value)
  }

  add('status', data.status)
  add('is_reserved', data.isReserved)
  add('min_stay', data.minStay)
  add('max_stay', data.maxStay)
  add('arrival_days', data.arrivalDays === undefined ? undefined : JSON.stringify(data.arrivalDays))
  add('departure_days', data.departureDays === undefined ? undefined : JSON.stringify(data.departureDays))
  add('inventory', data.inventory)
  add('reserved_count', data.reservedCount)

  const price = buildPrice(data)
  if (price !== undefined) {
    add('price = COALESCE(price, \'{}\'::jsonb)', JSON.stringify(price))
  }

  const metadata = buildMetadata(data)
  if (metadata !== undefined) {
    add('metadata = COALESCE(metadata, \'{}\'::jsonb)', JSON.stringify(metadata))
  }

  const explicitIsBlocked = data.isBlocked
  const derivedIsBlocked =
    data.status === 'blocked' ? true : data.status === 'available' ? false : undefined
  const isBlocked = explicitIsBlocked !== undefined ? explicitIsBlocked : derivedIsBlocked
  add('is_blocked', isBlocked)

  return { setClauses, values }
}

export class PostgresAvailabilityAdapter extends RepositoryAdapter {
  /**
   * Test/verification seam: delegates to the module-level buildWhere so the
   * static contract tests can assert SQL generation directly.
   */
  _buildWhere(filters, startIndex = 1) {
    return buildWhere(filters, startIndex)
  }

  /**
   * Test/verification seam: delegates to the module-level mapRow.
   */
  _mapRow(row) {
    return mapRow(row)
  }

  async ping() {
    await query('SELECT 1')
    return true
  }

  async health() {
    const startedAt = Date.now()

    try {
      await this.ping()

      return {
        status: 'up',
        provider: 'postgres',
        physical: true,
        entityName: this.entityName,
        latency: Date.now() - startedAt,
      }
    } catch (error) {
      return {
        status: 'down',
        provider: 'postgres',
        physical: true,
        entityName: this.entityName,
        latency: Date.now() - startedAt,
        error: error.message,
      }
    }
  }

  async find(filters = {}, options = {}) {
    const where = buildWhere(filters)
    const values = [...where.values]
    let suffix = ' ORDER BY date ASC'

    if (Number.isInteger(options.limit) && options.limit > 0) {
      suffix += ` LIMIT $${values.length + 1}`
      values.push(options.limit)
    }

    const result = await query(
      `SELECT * FROM availability WHERE ${where.sql}${suffix}`,
      values
    )

    return result.rows.map(mapRow)
  }

  async findOne(filters = {}) {
    const where = buildWhere(filters)

    const result = await query(
      `SELECT * FROM availability WHERE ${where.sql} ORDER BY date DESC LIMIT 1`,
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

  async create(data) {
    const fields = mapCreateFields(data)

    if (!fields.length) {
      throw new Error('Availability create requires writable fields')
    }

    const columns = fields.map(([column]) => column)
    const values = fields.map(([, value]) => value)
    const placeholders = values.map((_, index) => `$${index + 1}`)

    const result = await query(
      `INSERT INTO availability (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    )

    return mapRow(result.rows[0])
  }

  async update(filters, data) {
    const { setClauses, values } = mapUpdateFields({
      ...data,
      id: undefined,
      tenantId: undefined,
      accommodationId: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    })

    if (!setClauses.length) {
      return this.findOne(filters)
    }

    setClauses.push('updated_at = NOW()')

    const where = buildWhere(filters, values.length + 1)

    const result = await query(
      `UPDATE availability
       SET ${setClauses.join(', ')}
       WHERE ${where.sql}
       RETURNING *`,
      [...values, ...where.values]
    )

    return mapRow(result.rows[0])
  }

  /**
   * Hard DELETE. The availability table has no deleted_at column; soft
   * deletion is expressed at the domain level as status='DELETED' via the
   * AvailabilityManager, so the physical row delete is the only delete form.
   */
  async delete(filters) {
    const where = buildWhere(filters)

    const result = await query(
      `DELETE FROM availability
       WHERE ${where.sql}
       RETURNING *`,
      where.values
    )

    return mapRow(result.rows[0])
  }

  async count(filters = {}) {
    const where = buildWhere(filters)

    const result = await query(
      `SELECT COUNT(*)::int AS count
       FROM availability
       WHERE ${where.sql}`,
      where.values
    )

    return result.rows[0]?.count || 0
  }

  async exists(filters = {}) {
    const where = buildWhere(filters)

    const result = await query(
      `SELECT EXISTS(
         SELECT 1
         FROM availability
         WHERE ${where.sql}
       ) AS exists`,
      where.values
    )

    return result.rows[0]?.exists === true
  }
}

export default PostgresAvailabilityAdapter