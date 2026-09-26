import { BaseRepository } from '../../contracts/base.repository.js'
import { query, transaction } from '../../../../database/connection/postgres.connection.js'
import { AvailabilityCalendar } from '../../../availability/availability.calendar.js'
import { AvailabilityConflictError } from '../../../availability/availability.errors.js'

export class ReservationRepository extends BaseRepository {
  static entityName = 'reservation'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination', 'business', 'accommodation']
  static readOnly = false
  static aggregate = true
  static cacheable = true
  static searchable = true
  static softDeletable = true

  /**
   * Expand date range from temporal.startDate (check-in, inclusive) to
   * temporal.endDate (check-out, exclusive).
   * @param {object} temporal - { mode, startDate, endDate }
   * @returns {string[]} Array of date strings 'YYYY-MM-DD'
   */
  #expandDateRange(temporal) {
    if (!temporal?.startDate || !temporal?.endDate) return []
    const endDate = new Date(temporal.endDate)
    endDate.setDate(endDate.getDate() - 1)
    return AvailabilityCalendar.expandRange(
      temporal.startDate,
      endDate.toISOString().split('T')[0]
    )
  }

  /**
   * Compute new status projection based on is_blocked and reserved_count vs inventory.
   * @param {boolean} isBlocked
   * @param {number} reservedCount
   * @param {number} inventory
   * @returns {string} 'available' | 'reserved' | 'blocked'
   */
  #computeStatus(isBlocked, reservedCount, inventory) {
    if (isBlocked) return 'blocked'
    if (reservedCount >= inventory) return 'reserved'
    return 'available'
  }

  async createReservationWithLine(reservationData, lineData) {
    this._enforceNotDisposed()
    this._enforceWritable()

    const hasPostgresAdapter = this.adapter?.provider?.name === 'postgres'
    if (!hasPostgresAdapter) {
      return this.#createReservationFallback(reservationData, lineData)
    }

    const r = {
      ...reservationData,
      checkInDate: reservationData.checkInDate || reservationData.dates?.checkIn || null,
      checkOutDate: reservationData.checkOutDate || reservationData.dates?.checkOut || null,
      guestCount: reservationData.guestCount || reservationData.guests || 1,
      confirmationCode: reservationData.confirmationCode || `CONF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      specialRequests: reservationData.specialRequests || reservationData.notes || null,
      channel: reservationData.channel || reservationData.source || null,
    }

    const quantity = lineData.quantity || 1
    const dates = this.#expandDateRange(lineData.temporal)

    return transaction(async (client) => {
      for (const date of dates) {
        const result = await client.query(`
          UPDATE availability
          SET reserved_count = reserved_count + $1,
              status = CASE
                WHEN is_blocked = true THEN 'blocked'
                WHEN reserved_count + $1 >= inventory THEN 'reserved'
                ELSE 'available'
              END,
              updated_at = NOW()
          WHERE tenant_id = $2
            AND accommodation_id = $3
            AND date = $4
            AND is_blocked = false
            AND status = 'available'
            AND reserved_count + $1 <= inventory
          RETURNING id
        `, [quantity, r.tenantId, r.accommodationId, date])

        if (result.rows.length === 0) {
          throw new AvailabilityConflictError(`No capacity for ${date}`)
        }
      }

      const reservationResult = await client.query(
        `INSERT INTO reservations (
          id, tenant_id, accommodation_id, user_id, visitor_id, status, confirmation_code,
          check_in_date, check_out_date, check_in_time, check_out_time,
          guest_count, adults, children, infants, pets,
          subtotal, taxes, fees, discount, total_price, currency, channel,
          customer, guest_details, special_requests, internal_notes, metadata,
          expires_at, confirmed_at, cancelled_at, checked_in_at, checked_out_at,
          created_at, updated_at, deleted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23,
          $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36
        ) RETURNING *`,
        [
          r.id,
          r.tenantId,
          r.accommodationId,
          r.userId || null,
          r.visitorId || null,
          r.status || 'pending',
          r.confirmationCode,
          r.checkInDate,
          r.checkOutDate,
          r.checkInTime || null,
          r.checkOutTime || null,
          r.guestCount || 1,
          r.adults || 1,
          r.children || 0,
          r.infants || 0,
          r.pets || 0,
          r.subtotal || null,
          r.taxes || null,
          r.fees || null,
          r.discount || null,
          r.totalPrice || null,
          r.currency || 'USD',
          r.channel || null,
          JSON.stringify(r.customer || {}),
          JSON.stringify(r.guestDetails || {}),
          r.specialRequests || null,
          r.internalNotes || null,
          JSON.stringify(r.metadata || {}),
          r.expiresAt || null,
          r.confirmedAt || null,
          r.cancelledAt || null,
          r.checkedInAt || null,
          r.checkedOutAt || null,
          r.createdAt || new Date().toISOString(),
          new Date().toISOString(),
          null,
        ]
      )

      const reservation = reservationResult.rows[0]

      const lineResult = await client.query(
        `INSERT INTO reservation_lines (
          id, reservation_id, line_order, target_type, target_id, temporal,
          quantity, unit_price, line_total, metadata, released_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, NULL,
          $11, $12
        ) RETURNING *`,
        [
          lineData.id,
          reservation.id,
          lineData.lineOrder || 1,
          lineData.targetType,
          lineData.targetId,
          JSON.stringify(lineData.temporal),
          quantity,
          lineData.unitPrice || null,
          lineData.lineTotal || null,
          JSON.stringify(lineData.metadata || {}),
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      )

      return { reservation, line: lineResult.rows[0] }
    })
  }

  async #createReservationFallback(reservationData, lineData) {
    const r = {
      ...reservationData,
      checkInDate: reservationData.checkInDate || reservationData.dates?.checkIn || null,
      checkOutDate: reservationData.checkOutDate || reservationData.dates?.checkOut || null,
      guestCount: reservationData.guestCount || reservationData.guests || 1,
      confirmationCode: reservationData.confirmationCode || `CONF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      specialRequests: reservationData.specialRequests || reservationData.notes || null,
      channel: reservationData.channel || reservationData.source || null,
    }

    const quantity = lineData.quantity || 1
    const dates = this.#expandDateRange(lineData.temporal)

    const store = this.adapter?.constructor?.store
    const availStore = store?.get?.('availability') || null

    if (dates.length > 0) {
      this.#consumeMockAvailability(r, dates, quantity, availStore)
    }

    await this.create(r)

    const reservation = r

    const line = {
      id: lineData.id,
      reservationId: reservation.id,
      lineOrder: lineData.lineOrder || 1,
      targetType: lineData.targetType,
      targetId: lineData.targetId,
      temporal: lineData.temporal,
      quantity,
      unitPrice: lineData.unitPrice || null,
      lineTotal: lineData.lineTotal || null,
      metadata: lineData.metadata || {},
      releasedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (store) {
      this.#persistMockLine(line)
    }

    return { reservation, line }
  }

  #mockAvailabilityRow(availStore, tenantId, accommodationId, date) {
    if (!availStore) return null
    for (const row of availStore.values()) {
      if (row?.tenantId === tenantId && row?.accommodationId === accommodationId && row?.date === date) {
        return row
      }
    }
    return null
  }

  #consumeMockAvailability(r, dates, quantity, availStore) {
    const pending = []
    for (const date of dates) {
      const row = this.#mockAvailabilityRow(availStore, r.tenantId, r.accommodationId, date)
      if (!row) throw new AvailabilityConflictError(`No capacity for ${date}`)
      const isBlocked = row.isBlocked === true
      const inventory = Number(row.inventory ?? row.capacity) || 0
      const reservedCount = Number(row.reservedCount ?? (row.capacity != null && row.available != null ? row.capacity - row.available : 0)) || 0
      if (isBlocked || row.status !== 'available' || reservedCount + quantity > inventory) {
        throw new AvailabilityConflictError(`No capacity for ${date}`)
      }
      const nextReservedCount = reservedCount + quantity
      pending.push({
        row,
        nextReservedCount,
        status: nextReservedCount >= inventory ? 'reserved' : 'available',
      })
    }
    for (const update of pending) {
      const inventory = Number(update.row.inventory ?? update.row.capacity) || 0
      availStore.set(update.row.id, {
        ...update.row,
        reservedCount: update.nextReservedCount,
        available: Math.max(0, inventory - update.nextReservedCount),
        status: update.status,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  #persistMockLine(line) {
    const store = this.adapter?.constructor?.store
    if (!store || !line?.id) return
    if (!store.has('reservation_lines')) store.set('reservation_lines', new Map())
    store.get('reservation_lines').set(line.id, line)
  }

  #releaseMockCapacity(reservationId, tenantId) {
    const store = this.adapter?.constructor?.store
    if (!store) return { released: [], noOp: true }

    const linesStore = store.get('reservation_lines')
    const availStore = store.get('availability')
    if (!linesStore || !availStore) return { released: [], noOp: true }

    const released = []
    for (const line of Array.from(linesStore.values())) {
      if (line?.reservationId !== reservationId || line.releasedAt) continue
      if (line.temporal?.mode === 'DATE_RANGE') {
        const dates = this.#expandDateRange(line.temporal)
        for (const date of dates) {
          const row = this.#mockAvailabilityRow(availStore, tenantId, line.targetId, date)
          if (!row) continue
          const inventory = Number(row.inventory ?? row.capacity) || 0
          const releasedQty = Number(line.quantity || 1)
          const reservedCount = Math.max(0, (Number(row.reservedCount ?? (row.capacity != null && row.available != null ? row.capacity - row.available : 0)) || 0) - releasedQty)
          availStore.set(row.id, {
            ...row,
            reservedCount,
            available: Math.max(0, inventory - reservedCount),
            status: row.isBlocked === true ? 'blocked' : (reservedCount >= inventory ? 'reserved' : 'available'),
            updatedAt: new Date().toISOString(),
          })
        }
      }
      const now = new Date().toISOString()
      linesStore.set(line.id, { ...line, releasedAt: now, updatedAt: now })
      released.push({ ...line, releasedAt: now })
    }

    return { released, noOp: released.length === 0 }
  }

  async cancelReservationWithRelease(reservationData, tenantId) {
    this._enforceNotDisposed()
    this._enforceInitialized()
    this._enforceWritable()

    const hasPostgres = this.adapter?.provider?.name === 'postgres'

    if (!hasPostgres) {
      this.#releaseMockCapacity(reservationData.id, tenantId)
      return this.update(
        { id: reservationData.id, tenantId },
        reservationData
      )
    }

    return transaction(async (client) => {
      const reservationResult = await client.query(
        `UPDATE reservations
         SET status = $1,
             cancelled_at = $2,
             special_requests = $3,
             updated_at = NOW()
         WHERE id = $4
           AND tenant_id = $5
         RETURNING *`,
        [
          reservationData.status,
          reservationData.cancelledAt || null,
          reservationData.notes || null,
          reservationData.id,
          tenantId,
        ]
      )

      if (reservationResult.rows.length === 0) {
        throw new Error(
          `Reservation ${reservationData.id} update failed - not found or not authorized`
        )
      }

      const release = await this.releaseReservationLines(
        client,
        reservationData.id,
        tenantId
      )

      return {
        reservation: reservationResult.rows[0],
        release,
      }
    })
  }
  async releaseReservationLines(client, reservationId, tenantId) {
    const linesResult = await client.query(`
      SELECT rl.*
      FROM reservation_lines rl
      JOIN reservations r ON r.id = rl.reservation_id
      WHERE rl.reservation_id = $1
        AND r.tenant_id = $2
        AND rl.released_at IS NULL
    `, [reservationId, tenantId])

    if (linesResult.rows.length === 0) {
      return { released: [], noOp: true }
    }

    for (const line of linesResult.rows) {
      const releasedResult = await client.query(`
        UPDATE reservation_lines
        SET released_at = NOW()
        WHERE id = $1 AND released_at IS NULL
        RETURNING quantity
      `, [line.id])

      if (releasedResult.rows.length === 0) {
        continue
      }

      const quantity = releasedResult.rows[0].quantity

      if (line.temporal?.mode === 'DATE_RANGE') {
        const dates = this.#expandDateRange(line.temporal)

        for (const date of dates) {
          const releaseResult = await client.query(`
            UPDATE availability
            SET reserved_count = reserved_count - $1,
                status = CASE
                  WHEN is_blocked = true THEN 'blocked'
                  WHEN reserved_count - $1 >= inventory THEN 'reserved'
                  ELSE 'available'
                END,
                updated_at = NOW()
            WHERE tenant_id = $2
              AND accommodation_id = $3
              AND date = $4
              AND reserved_count >= $1
            RETURNING id
          `, [quantity, tenantId, line.target_id, date])

          if (releaseResult.rows.length === 0) {
            throw new AvailabilityConflictError(
              `Cannot release: date ${date} has insufficient reserved_count`
            )
          }
        }
      }
    }

    return { released: linesResult.rows, noOp: false }
  }

  async findLinesByReservationId(tenantId, reservationId) {
    this._enforceNotDisposed()
    this._enforceInitialized()

    const hasPostgres = this.adapter?.provider?.name === 'postgres'

    if (hasPostgres) {
      const result = await query(
        `SELECT rl.*
         FROM reservation_lines rl
         JOIN reservations r ON r.id = rl.reservation_id
         WHERE rl.reservation_id = $1 AND r.tenant_id = $2
         ORDER BY rl.line_order ASC, rl.created_at ASC, rl.id ASC`,
        [reservationId, tenantId]
      )
      return result.rows
    }

    const reservation = await this.adapter.findOne({ id: reservationId })
    if (!reservation || reservation.tenantId !== tenantId) {
      return []
    }

    const mockStore = this.adapter?.constructor?.store
    const linesStore = mockStore?.get?.('reservation_lines')
    if (linesStore) {
      const lines = Array.from(linesStore.values()).filter((l) => l.reservationId === reservationId)
      return lines
        .sort((a, b) => {
          if (a.lineOrder !== b.lineOrder) return (a.lineOrder || 0) - (b.lineOrder || 0)
          if (a.createdAt !== b.createdAt) return (a.createdAt || '').localeCompare(b.createdAt || '')
          return (a.id || '').localeCompare(b.id || '')
        })
        .map((line) => ({
          id: line.id,
          reservationId: line.reservationId,
          lineOrder: line.lineOrder,
          targetType: line.targetType,
          targetId: line.targetId,
          temporal: line.temporal,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          metadata: line.metadata,
          releasedAt: line.releasedAt || null,
          createdAt: line.createdAt,
          updatedAt: line.updatedAt,
        }))
    }

    return []
  }
}