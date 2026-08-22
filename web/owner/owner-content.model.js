/**
 * Owner Content Model
 *
 * PUSH-3 pattern: Private fields, validation, safe serialization.
 * Structured content for business applications.
 */

export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published'
}

const VALID_CONTENT_FIELDS = [
  'businessName',
  'shortDescription',
  'description',
  'phone',
  'email',
  'website',
  'address',
  'openingHours',
  'socialLinks',
  'services',
  'features',
  'highlights',
  'ctaText',
  'ctaUrl'
]

const MAX_FIELD_LENGTHS = {
  businessName: 100,
  shortDescription: 200,
  description: 5000,
  phone: 20,
  email: 100,
  website: 200,
  address: 300,
  openingHours: 500,
  ctaText: 50,
  ctaUrl: 200
}

export class OwnerContent {
  #id
  #applicationId
  #createdBy
  #createdAt
  #updatedAt
  #status
  #baseRevision
  #fields
  #publishedRevision
  #publishedAt
  #publishedBy

  constructor(data = {}) {
    this.#id = data.id || null
    this.#applicationId = data.applicationId || null
    this.#createdBy = data.createdBy || null
    this.#createdAt = data.createdAt || new Date().toISOString()
    this.#updatedAt = data.updatedAt || new Date().toISOString()
    this.#status = data.status || CONTENT_STATUS.DRAFT
    this.#baseRevision = data.baseRevision || 0
    this.#fields = data.fields || {}
    this.#publishedRevision = data.publishedRevision || null
    this.#publishedAt = data.publishedAt || null
    this.#publishedBy = data.publishedBy || null

    if (data.fields) {
      for (const [key, value] of Object.entries(data.fields)) {
        this.#fields[key] = value
      }
    }
  }

  get id() { return this.#id }
  get applicationId() { return this.#applicationId }
  get createdBy() { return this.#createdBy }
  get createdAt() { return this.#createdAt }
  get updatedAt() { return this.#updatedAt }
  get status() { return this.#status }
  get baseRevision() { return this.#baseRevision }
  get publishedRevision() { return this.#publishedRevision }
  get publishedAt() { return this.#publishedAt }
  get publishedBy() { return this.#publishedBy }
  get fields() { return { ...this.#fields } }

  isPublished() {
    return this.#status === CONTENT_STATUS.PUBLISHED
  }

  isDraft() {
    return this.#status === CONTENT_STATUS.DRAFT
  }

  getField(name) {
    return this.#fields[name] || null
  }

  setField(name, value) {
    if (!VALID_CONTENT_FIELDS.includes(name)) {
      return { success: false, error: `Field '${name}' is not a valid content field` }
    }

    const maxLength = MAX_FIELD_LENGTHS[name]
    if (maxLength && typeof value === 'string' && value.length > maxLength) {
      return { success: false, error: `Field '${name}' exceeds maximum length of ${maxLength}` }
    }

    this.#fields[name] = value
    this.#updatedAt = new Date().toISOString()
    return { success: true }
  }

  updateFields(updates) {
    const errors = []
    const applied = {}

    for (const [key, value] of Object.entries(updates)) {
      if (!VALID_CONTENT_FIELDS.includes(key)) {
        errors.push(`Field '${key}' is not valid`)
        continue
      }

      const maxLength = MAX_FIELD_LENGTHS[key]
      if (maxLength && typeof value === 'string' && value.length > maxLength) {
        errors.push(`Field '${key}' exceeds maximum length of ${maxLength}`)
        continue
      }

      this.#fields[key] = value
      applied[key] = value
    }

    if (errors.length > 0) {
      return { success: false, errors }
    }

    this.#updatedAt = new Date().toISOString()
    return { success: true, applied }
  }

  markSaving(baseRevision) {
    this.#baseRevision = baseRevision
    this.#updatedAt = new Date().toISOString()
  }

  markPublished(revision, publishedBy) {
    this.#status = CONTENT_STATUS.PUBLISHED
    this.#publishedRevision = revision
    this.#publishedAt = new Date().toISOString()
    this.#publishedBy = publishedBy
    this.#baseRevision = revision
  }

  toSafeJSON() {
    return {
      id: this.#id,
      applicationId: this.#applicationId,
      createdBy: this.#createdBy,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
      status: this.#status,
      baseRevision: this.#baseRevision,
      publishedRevision: this.#publishedRevision,
      publishedAt: this.#publishedAt,
      publishedBy: this.#publishedBy,
      fields: { ...this.#fields }
    }
  }

  toPublicJSON() {
    return {
      applicationId: this.#applicationId,
      status: this.#status,
      fields: { ...this.#fields }
    }
  }
}

export function validateContentData(data) {
  const errors = []

  if (data.businessName && data.businessName.length > MAX_FIELD_LENGTHS.businessName) {
    errors.push(`businessName exceeds ${MAX_FIELD_LENGTHS.businessName} characters`)
  }

  if (data.shortDescription && data.shortDescription.length > MAX_FIELD_LENGTHS.shortDescription) {
    errors.push(`shortDescription exceeds ${MAX_FIELD_LENGTHS.shortDescription} characters`)
  }

  if (data.description && data.description.length > MAX_FIELD_LENGTHS.description) {
    errors.push(`description exceeds ${MAX_FIELD_LENGTHS.description} characters`)
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push('email format is invalid')
  }

  if (data.website && !isValidUrl(data.website)) {
    errors.push('website URL format is invalid')
  }

  if (data.ctaUrl && !isValidUrl(data.ctaUrl) && !isValidRelativeUrl(data.ctaUrl)) {
    errors.push('ctaUrl must be a valid URL')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function isValidRelativeUrl(url) {
  return url.startsWith('/') && !url.startsWith('//')
}

export function sanitizeText(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-=')
    .replace(/javascript:/gi, '')
    .trim()
}

export default {
  CONTENT_STATUS,
  OwnerContent,
  validateContentData,
  sanitizeText,
  VALID_CONTENT_FIELDS,
  MAX_FIELD_LENGTHS
}