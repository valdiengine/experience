import { validateAccommodation } from './accommodation.schema.js'
import { AccommodationValidationError, AccommodationOrphanError } from './accommodation.errors.js'
import { isEditableStatus } from './accommodation.status.js'

export function validateCreateData(data) {
  const result = validateAccommodation(data)
  if (!result.valid) {
    throw new AccommodationValidationError('Validation failed', { errors: result.errors })
  }
  return data
}

export function validateUpdateData(data, currentStatus) {
  if (data.status && !isEditableStatus(currentStatus)) {
    throw new AccommodationValidationError(
      `Cannot update accommodation in status: ${currentStatus}`
    )
  }
  const allowedFields = ['title', 'description', 'capacity', 'location', 'coordinates', 'checkInTime', 'checkOutTime', 'cancellationPolicy', 'metadata', 'seo', 'featured']
  const updates = {}
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field]
    }
  }
  return updates
}

export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new AccommodationValidationError('Slug is required and must be a string')
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new AccommodationValidationError('Slug must contain only lowercase letters, numbers, and hyphens')
  }
  return slug
}

export function validateCoordinates(coordinates) {
  if (!coordinates) return
  const { lat, lng } = coordinates
  if (lat !== undefined && (lat < -90 || lat > 90)) {
    throw new AccommodationValidationError('Latitude must be between -90 and 90')
  }
  if (lng !== undefined && (lng < -180 || lng > 180)) {
    throw new AccommodationValidationError('Longitude must be between -180 and 180')
  }
}

export function validateBusinessRules(data) {
  const errors = []
  if (data.capacity && data.capacity < 1) {
    errors.push('Capacity must be at least 1')
  }
  if (data.coordinates) {
    const { lat, lng } = data.coordinates
    if (lat !== undefined && (lat < -90 || lat > 90)) {
      errors.push('Latitude must be between -90 and 90')
    }
    if (lng !== undefined && (lng < -180 || lng > 180)) {
      errors.push('Longitude must be between -180 and 180')
    }
  }
  return errors
}

export async function validateBusinessOwnership(accommodation, context) {
  if (!accommodation.businessId) {
    throw new AccommodationOrphanError('Accommodation must belong to a Business')
  }
  const businessRepo = context?.repositories?.business
  if (!businessRepo) return null
  const business = await businessRepo.findById(accommodation.businessId)
  if (!business) {
    throw new AccommodationOrphanError(`Business not found: ${accommodation.businessId}`)
  }
  if (business.tenantId !== accommodation.tenantId) {
    throw new AccommodationOrphanError('Cross-tenant ownership is forbidden')
  }
  if (business.destinationId !== accommodation.destinationId) {
    throw new AccommodationOrphanError('Cross-destination ownership is forbidden')
  }
  return business
}
