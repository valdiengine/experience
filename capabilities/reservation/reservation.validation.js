export function validateDateRange(checkIn, checkOut) {
  const errors = []
  if (!checkIn || !checkOut) {
    errors.push('Check-in and check-out dates are required')
    return { valid: false, errors }
  }
  const inDate = new Date(checkIn)
  const outDate = new Date(checkOut)
  if (isNaN(inDate.getTime())) errors.push('Invalid check-in date')
  if (isNaN(outDate.getTime())) errors.push('Invalid check-out date')
  if (errors.length > 0) return { valid: false, errors }
  if (outDate <= inDate) errors.push('Check-out must be after check-in')
  if (inDate < new Date(new Date().toISOString().split('T')[0])) errors.push('Check-in cannot be in the past')
  return { valid: errors.length === 0, errors }
}

export function validateGuestCount(guests, maxGuests) {
  const errors = []
  if (guests == null || guests < 1) errors.push('Guest count must be at least 1')
  if (maxGuests != null && guests > maxGuests) errors.push(`Guest count exceeds maximum of ${maxGuests}`)
  return { valid: errors.length === 0, errors }
}

export function validateStatusTransition(from, to, workflow) {
  if (!workflow) return { valid: false, errors: ['Workflow rules not provided'] }
  const valid = workflow.canTransition(from, to)
  return {
    valid,
    errors: valid ? [] : [`Invalid status transition: ${from} → ${to}`],
  }
}

export function validatePricing(totalPrice, currency) {
  const errors = []
  if (totalPrice != null && totalPrice < 0) errors.push('Total price cannot be negative')
  if (currency && typeof currency !== 'string') errors.push('Currency must be a string')
  return { valid: errors.length === 0, errors }
}

export function validateTimezone(timezone) {
  if (!timezone) return { valid: true, errors: [] }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return { valid: true, errors: [] }
  } catch {
    return { valid: false, errors: [`Invalid timezone: ${timezone}`] }
  }
}

export function validateTenantIsolation(tenantId, contextTenantId) {
  if (!tenantId || !contextTenantId) return { valid: true, errors: [] }
  return {
    valid: tenantId === contextTenantId,
    errors: tenantId === contextTenantId ? [] : ['Tenant isolation violation'],
  }
}

export function validateFutureLimit(checkIn, maxDaysAhead) {
  if (!maxDaysAhead) return { valid: true, errors: [] }
  const inDate = new Date(checkIn)
  const limit = new Date()
  limit.setDate(limit.getDate() + maxDaysAhead)
  return {
    valid: inDate <= limit,
    errors: inDate <= limit ? [] : [`Cannot book more than ${maxDaysAhead} days in advance`],
  }
}

export function validateOwnership(resourceOwnerId, identityId) {
  if (!resourceOwnerId || !identityId) return { valid: true, errors: [] }
  return {
    valid: resourceOwnerId === identityId,
    errors: resourceOwnerId === identityId ? [] : ['Ownership validation failed'],
  }
}

export function validateReservationData(data) {
  const errors = []
  if (!data.dates) errors.push('Reservation dates are required')
  if (!data.customer) errors.push('Customer information is required')
  if (data.customer && !data.customer.name) errors.push('Customer name is required')
  if (data.guests != null) {
    const guestValidation = validateGuestCount(data.guests, data.maxGuests)
    if (!guestValidation.valid) errors.push(...guestValidation.errors)
  }
  if (data.dates) {
    const dateValidation = validateDateRange(data.dates.checkIn, data.dates.checkOut)
    if (!dateValidation.valid) errors.push(...dateValidation.errors)
  }
  if (data.totalPrice != null || data.currency) {
    const pricingValidation = validatePricing(data.totalPrice, data.currency)
    if (!pricingValidation.valid) errors.push(...pricingValidation.errors)
  }
  return { valid: errors.length === 0, errors }
}

export async function checkAvailability(context, accommodationId, checkIn, checkOut) {
  const availability = context?.capabilities?.get?.('availability')
  if (!availability?.service) return { available: true, conflicts: [] }
  try {
    const result = await availability.service.checkAvailability(accommodationId, checkIn, checkOut, null)
    return {
      available: result?.available !== false,
      conflicts: result?.blockedDates || [],
    }
  } catch {
    return { available: true, conflicts: [] }
  }
}

export async function checkReservationOverlap(context, accommodationId, checkIn, checkOut, excludeId) {
  const repo = context?.repositories?.reservation
  if (!repo) return { hasOverlap: false, overlapping: [] }
  const filter = { accommodationId }
  if (checkIn) filter.checkIn = { lte: checkOut }
  if (checkOut) filter.checkOut = { gte: checkIn }
  if (excludeId) filter.id = { ne: excludeId }
  try {
    const existing = await repo.findMany(filter) || []
    const overlapping = existing.filter((r) =>
      r.status !== 'cancelled' && r.status !== 'rejected' && r.status !== 'expired' && r.status !== 'archived'
    )
    return { hasOverlap: overlapping.length > 0, overlapping }
  } catch {
    return { hasOverlap: false, overlapping: [] }
  }
}

export async function validateReservationAgainstContext(context, reservationData) {
  const errors = []
  if (reservationData.tenantId) {
    const tenantCheck = validateTenantIsolation(reservationData.tenantId, context?.tenant?.id)
    if (!tenantCheck.valid) errors.push(...tenantCheck.errors)
  }
  if (reservationData.dates?.checkIn) {
    const futureCheck = validateFutureLimit(reservationData.dates.checkIn, 365)
    if (!futureCheck.valid) errors.push(...futureCheck.errors)
  }
  if (reservationData.accommodationId && reservationData.dates?.checkIn && reservationData.dates?.checkOut) {
    const overlap = await checkReservationOverlap(
      context,
      reservationData.accommodationId,
      reservationData.dates.checkIn,
      reservationData.dates.checkOut,
      reservationData.id,
    )
    if (overlap.hasOverlap) errors.push('Date range overlaps with existing reservation')
  }
  return { valid: errors.length === 0, errors }
}
