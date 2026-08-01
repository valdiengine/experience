export class AvailabilitySearch {
  static toPayload(availability) {
    return {
      id: availability.id,
      accommodation_id: availability.accommodationId,
      tenant_id: availability.tenantId,
      date: availability.date,
      status: availability.status,
      capacity: availability.capacity || 0,
      available: availability.available || 0,
      price: availability.price || 0,
      currency: availability.currency || null,
      type: 'availability',
      blocked: availability.status === 'blocked' || availability.status === 'reserved' || availability.status === 'maintenance',
      created_at: availability.createdAt,
      updated_at: availability.updatedAt,
    }
  }

  static toCalendarPayload(accommodationId, calendarData) {
    const total = calendarData.length
    const available = calendarData.filter((d) => d.status === 'available').length
    const blocked = calendarData.filter((d) => d.status !== 'available').length

    const today = new Date().toISOString().split('T')[0]
    const futureDates = calendarData.filter((d) => d.date >= today)
    const nextAvailable = futureDates.find((d) => d.status === 'available')

    return {
      accommodation_id: accommodationId,
      total_days: total,
      available_days: available,
      blocked_days: blocked,
      occupancy_percentage: total > 0 ? Math.round((blocked / total) * 100) : 0,
      next_available_date: nextAvailable?.date || null,
      min_stay: calendarData.minStay || null,
      max_stay: calendarData.maxStay || null,
    }
  }
}
