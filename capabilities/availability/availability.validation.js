import { validateAvailability, validateWindow, validateRule, validateSeason, validateBlock } from './availability.schema.js'
import { AvailabilityValidationError } from './availability.errors.js'
import { isEditableStatus } from './availability.status.js'

export function validateCreateData(data) {
  const result = validateAvailability(data)
  if (!result.valid) {
    throw new AvailabilityValidationError('Validation failed', { errors: result.errors })
  }
  return data
}

export function validateWindowData(data) {
  const result = validateWindow(data)
  if (!result.valid) {
    throw new AvailabilityValidationError('Window validation failed', { errors: result.errors })
  }
  if (new Date(data.endDate) < new Date(data.startDate)) {
    throw new AvailabilityValidationError('endDate must be after startDate')
  }
  return data
}

export function validateRuleData(data) {
  const result = validateRule(data)
  if (!result.valid) {
    throw new AvailabilityValidationError('Rule validation failed', { errors: result.errors })
  }
  return data
}

export function validateSeasonData(data) {
  const result = validateSeason(data)
  if (!result.valid) {
    throw new AvailabilityValidationError('Season validation failed', { errors: result.errors })
  }
  if (new Date(data.endDate) < new Date(data.startDate)) {
    throw new AvailabilityValidationError('Season endDate must be after startDate')
  }
  return data
}

export function validateBlockData(data) {
  const result = validateBlock(data)
  if (!result.valid) {
    throw new AvailabilityValidationError('Block validation failed', { errors: result.errors })
  }
  if (new Date(data.endDate) < new Date(data.startDate)) {
    throw new AvailabilityValidationError('Block endDate must be after startDate')
  }
  return data
}

export function validateDateRange(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AvailabilityValidationError('Invalid date format')
  }
  if (end < start) {
    throw new AvailabilityValidationError('End date must be after start date')
  }
  return { start, end }
}

export function validateTimeConsistency(timezone, dates) {
  if (!timezone) return
  for (const d of dates) {
    const date = new Date(d)
    if (isNaN(date.getTime())) {
      throw new AvailabilityValidationError(`Invalid date: ${d}`)
    }
  }
}

export function validateTenantIsolation(data, identity) {
  if (!identity?.tenantId) return
  if (data.tenantId && data.tenantId !== identity.tenantId) {
    throw new AvailabilityValidationError('Cross-tenant access is forbidden')
  }
}

export function validateUpdateData(data, currentStatus) {
  if (data.status && !isEditableStatus(currentStatus)) {
    throw new AvailabilityValidationError(`Cannot update availability in status: ${currentStatus}`)
  }
  const allowedFields = ['status', 'capacity', 'available', 'price', 'currency', 'notes', 'metadata']
  const updates = {}
  for (const field of allowedFields) {
    if (data[field] !== undefined) updates[field] = data[field]
  }
  return updates
}
