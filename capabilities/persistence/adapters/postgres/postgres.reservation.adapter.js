import { RepositoryAdapter } from '../repository.adapter.js'
import { query } from '../../../../database/connection/postgres.connection.js'

const FILTER_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  accommodationId: 'accommodation_id',
  userId: 'user_id',
  visitorId: 'visitor_id',
  status: 'status',
  confirmationCode: 'confirmation_code',
  checkIn: 'check_in_date',
  checkOut: 'check_out_date',
  deletedAt: 'deleted_at',
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

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    tenantId: row.tenant_id,
    accommodationId: row.accommodation_id,
    userId: row.user_id,
    visitorId: row.visitor_id,
    status: row.status,
    confirmationCode: row.confirmation_code,
    dates: {
      checkIn: row.check_in_date,
      checkOut: row.check_out_date,
    },
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time,
    guests: row.guest_count,
    adults: row.adults,
    children: row.children,
    infants: row.infants,
    pets: row.pets,
    subtotal: toNumber(row.subtotal),
    taxes: toNumber(row.taxes),
    fees: toNumber(row.fees),
    discount: toNumber(row.discount),
    totalPrice: toNumber(row.total_price),
    currency: row.currency,
    source: row.channel,
    customer: row.customer || {},
    guestDetails: row.guest_details || {},
    notes: row.special_requests || '',
    internalNotes: row.internal_notes,
    metadata: row.metadata || {},
    expiresAt: toIso(row.expires_at),
    confirmedAt: toIso(row.confirmed_at),
    cancelledAt: toIso(row.cancelled_at),
    checkedInAt: toIso(row.checked_in_at),
    checkedOutAt: toIso(row.checked_out_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: toIso(row.deleted_at),
  }
}

function buildWhere(filters = {}, startIndex = 1) {
  const clauses = []
  const values = []
  let index = startIndex

  for (const [key, rawValue] of Object.entries(filters)) {
    const column = FILTER_COLUMNS[key]

    if (!column) {
      throw new Error(`Unsupported reservation filter: ${key}`)
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
          throw new Error(`Unsupported reservation filter operator: ${operator}`)
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

function writableFields(data = {}) {
  const fields = []

  const add = (column, value) => {
    if (value !== undefined) fields.push([column, value])
  }

  add('id', data.id)
  add('tenant_id', data.tenantId)
  add('accommodation_id', data.accommodationId)
  add('user_id', data.userId)
  add('visitor_id', data.visitorId)
  add('status', data.status)
  add('confirmation_code', data.confirmationCode)
  add('check_in_date', data.checkInDate ?? data.dates?.checkIn)
  add('check_out_date', data.checkOutDate ?? data.dates?.checkOut)
  add('check_in_time', data.checkInTime)
  add('check_out_time', data.checkOutTime)
  add('guest_count', data.guestCount ?? data.guests)
  add('adults', data.adults)
  add('children', data.children)
  add('infants', data.infants)
  add('pets', data.pets)
  add('subtotal', data.subtotal)
  add('taxes', data.taxes)
  add('fees', data.fees)
  add('discount', data.discount)
  add('total_price', data.totalPrice)
  add('currency', data.currency)
  add('channel', data.channel ?? data.source)
  add('customer', data.customer === undefined ? undefined : JSON.stringify(data.customer))
  add('guest_details', data.guestDetails === undefined ? undefined : JSON.stringify(data.guestDetails))
  add('special_requests', data.specialRequests ?? data.notes)
  add('internal_notes', data.internalNotes)
  add('metadata', data.metadata === undefined ? undefined : JSON.stringify(data.metadata))
  add('expires_at', data.expiresAt)
  add('confirmed_at', data.confirmedAt)
  add('cancelled_at', data.cancelledAt)
  add('checked_in_at', data.checkedInAt)
  add('checked_out_at', data.checkedOutAt)
  add('created_at', data.createdAt)
  add('updated_at', data.updatedAt)
  add('deleted_at', data.deletedAt)

  return fields
}

export class PostgresReservationAdapter extends RepositoryAdapter {
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
    let suffix = ' ORDER BY created_at DESC'

    if (Number.isInteger(options.limit) && options.limit > 0) {
      suffix += ` LIMIT $${values.length + 1}`
      values.push(options.limit)
    }

    const result = await query(
      `SELECT * FROM reservations WHERE ${where.sql}${suffix}`,
      values
    )

    return result.rows.map(mapRow)
  }

  async findOne(filters = {}) {
    const where = buildWhere(filters)

    const result = await query(
      `SELECT * FROM reservations WHERE ${where.sql} ORDER BY created_at DESC LIMIT 1`,
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
    const entity = {
      ...data,
      confirmationCode:
        data.confirmationCode ||
        `CONF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    }

    const fields = writableFields(entity)

    if (!fields.length) {
      throw new Error('Reservation create requires writable fields')
    }

    const columns = fields.map(([column]) => column)
    const values = fields.map(([, value]) => value)
    const placeholders = values.map((_, index) => `$${index + 1}`)

    const result = await query(
      `INSERT INTO reservations (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    )

    return mapRow(result.rows[0])
  }

  async update(filters, data) {
    const fields = writableFields({
      ...data,
      id: undefined,
      tenantId: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      deletedAt: undefined,
    })

    if (!fields.length) {
      return this.findOne(filters)
    }

    const setValues = fields.map(([, value]) => value)
    const assignments = fields.map(
      ([column], index) => `${column} = $${index + 1}`
    )

    assignments.push('updated_at = NOW()')

    const where = buildWhere(filters, setValues.length + 1)

    const result = await query(
      `UPDATE reservations
       SET ${assignments.join(', ')}
       WHERE ${where.sql}
       RETURNING *`,
      [...setValues, ...where.values]
    )

    return mapRow(result.rows[0])
  }

  async delete(filters) {
    const where = buildWhere(filters)

    const result = await query(
      `UPDATE reservations
       SET deleted_at = NOW(), updated_at = NOW()
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
       FROM reservations
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
         FROM reservations
         WHERE ${where.sql}
       ) AS exists`,
      where.values
    )

    return result.rows[0]?.exists === true
  }
}

export default PostgresReservationAdapter
