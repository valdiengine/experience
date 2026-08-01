import { validateBusiness } from './business.schema.js'
import { BusinessValidationError, BusinessConflictError } from './business.errors.js'
import { isEditableStatus, isActiveStatus } from './business.status.js'

export function validateCreateData(data) {
  const result = validateBusiness(data)
  if (!result.valid) {
    throw new BusinessValidationError('Validation failed', { errors: result.errors })
  }
  if (!data.name || data.name.trim().length === 0) {
    throw new BusinessValidationError('Business name is required')
  }
  if (!data.category) {
    throw new BusinessValidationError('Business category is required')
  }
  if (!data.contactEmail) {
    throw new BusinessValidationError('Contact email is required')
  }
  return data
}

export function validateUpdateData(data, currentStatus) {
  if (!isEditableStatus(currentStatus) && currentStatus !== 'published') {
    throw new BusinessValidationError(
      `Cannot update business in status: ${currentStatus}`
    )
  }
  const allowedFields = [
    'name', 'legalName', 'description', 'category', 'subcategory',
    'contactEmail', 'contactPhone', 'website', 'socialNetworks',
    'logo', 'coverImage', 'address', 'coordinates', 'city',
    'timezone', 'language', 'currency', 'openingHours',
    'visibility', 'metadata', 'seo',
  ]
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
    throw new BusinessValidationError('Slug is required and must be a string')
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new BusinessValidationError('Slug must contain only lowercase letters, numbers, and hyphens')
  }
  return slug
}

export function validateCoordinates(coordinates) {
  if (!coordinates) return
  const { lat, lng } = coordinates
  if (lat !== undefined && (lat < -90 || lat > 90)) {
    throw new BusinessValidationError('Latitude must be between -90 and 90')
  }
  if (lng !== undefined && (lng < -180 || lng > 180)) {
    throw new BusinessValidationError('Longitude must be between -180 and 180')
  }
}

export function validateBusinessRules(data) {
  const errors = []
  if (data.name && data.name.trim().length < 2) {
    errors.push('Business name must be at least 2 characters')
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
  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
    errors.push('Contact email must be a valid email address')
  }
  if (data.website && !/^https?:\/\/.+/.test(data.website)) {
    errors.push('Website must start with http:// or https://')
  }
  return errors
}
