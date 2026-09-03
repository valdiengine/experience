import { BaseRepository } from '../../contracts/base.repository.js'
import { query, transaction } from '../../../../database/connection/postgres.connection.js'

export class ReservationRepository extends BaseRepository {
  static entityName = 'reservation'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination', 'business', 'accommodation']
  static readOnly = false
  static aggregate = true
  static cacheable = true
  static searchable = true
  static softDeletable = true

  async createReservationWithLine(reservationData, lineData) {
    this._enforceNotDisposed()
    this._enforceWritable()

    const r = {
      ...reservationData,
      checkInDate: reservationData.checkInDate || reservationData.dates?.checkIn || null,
      checkOutDate: reservationData.checkOutDate || reservationData.dates?.checkOut || null,
      guestCount: reservationData.guestCount || reservationData.guests || 1,
      confirmationCode: reservationData.confirmationCode || `CONF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      specialRequests: reservationData.specialRequests || reservationData.notes || null,
      channel: reservationData.channel || reservationData.source || null,
    }

    return transaction(async (client) => {
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
          quantity, unit_price, line_total, metadata,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12
        ) RETURNING *`,
        [
          lineData.id,
          reservation.id,
          lineData.lineOrder || 1,
          lineData.targetType,
          lineData.targetId,
          JSON.stringify(lineData.temporal),
          lineData.quantity || 1,
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

  async findLinesByReservationId(tenantId, reservationId) {
    this._enforceNotDisposed()
    this._enforceInitialized()

    const hasPostgres = this.adapter?.client?.db != null

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
          createdAt: line.createdAt,
          updatedAt: line.updatedAt,
        }))
    }

    return []
  }
}
