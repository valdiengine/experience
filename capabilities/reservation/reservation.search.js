export class ReservationSearch {
  static toPayload(reservation) {
    return {
      id: reservation.id,
      type: 'reservation',
      tenant_id: reservation.tenantId,
      business_id: reservation.businessId || null,
      accommodation_id: reservation.accommodationId || null,
      visitor_id: reservation.visitorId || null,
      resource_id: reservation.resourceId || null,
      status: reservation.status,
      check_in: reservation.dates?.checkIn || null,
      check_out: reservation.dates?.checkOut || null,
      guest_count: reservation.guests || 0,
      total_price: reservation.totalPrice || 0,
      currency: reservation.currency || null,
      source: reservation.source || null,
      reservation_age_days: reservation.createdAt
        ? Math.floor((Date.now() - new Date(reservation.createdAt).getTime()) / 86400000)
        : 0,
      status_age_hours: reservation.updatedAt
        ? Math.floor((Date.now() - new Date(reservation.updatedAt).getTime()) / 3600000)
        : 0,
      occupancy_contribution: reservation.guests || 0,
      channel: reservation.channel || null,
      confirmation_code: reservation.confirmationCode || null,
      notes: reservation.notes || null,
      is_active: !reservation.status || ![
        'completed', 'cancelled', 'rejected', 'expired', 'no_response', 'archived',
      ].includes(reservation.status),
      created_at: reservation.createdAt,
      updated_at: reservation.updatedAt,
      confirmed_at: reservation.confirmedAt || null,
      completed_at: reservation.completedAt || null,
      cancelled_at: reservation.cancelledAt || null,
    }
  }
}
