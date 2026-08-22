/**
 * Owner Media Model
 *
 * PUSH-3 pattern: Private fields, validation, safe serialization.
 * Media assets for business applications.
 */

export const MEDIA_TYPE = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document'
}

export const MEDIA_ACCESS = {
  PUBLIC: 'public',
  PRIVATE: 'private'
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_DIMENSIONS = 4096

export class OwnerMedia {
  #id
  #applicationId
  #type
  #originalName
  #mimeType
  #size
  #width
  #height
  #storagePath
  #url
  #checksum
  #isFeatured
  #galleryOrder
  #createdAt
  #createdBy
  #metadata

  constructor(data = {}) {
    this.#id = data.id || null
    this.#applicationId = data.applicationId || null
    this.#type = data.type || MEDIA_TYPE.IMAGE
    this.#originalName = data.originalName || null
    this.#mimeType = data.mimeType || null
    this.#size = data.size || 0
    this.#width = data.width || null
    this.#height = data.height || null
    this.#storagePath = data.storagePath || null
    this.#url = data.url || null
    this.#checksum = data.checksum || null
    this.#isFeatured = data.isFeatured || false
    this.#galleryOrder = data.galleryOrder || null
    this.#createdAt = data.createdAt || new Date().toISOString()
    this.#createdBy = data.createdBy || null
    this.#metadata = data.metadata || {}
  }

  get id() { return this.#id }
  get applicationId() { return this.#applicationId }
  get type() { return this.#type }
  get originalName() { return this.#originalName }
  get mimeType() { return this.#mimeType }
  get size() { return this.#size }
  get width() { return this.#width }
  get height() { return this.#height }
  get storagePath() { return this.#storagePath }
  get url() { return this.#url }
  get checksum() { return this.#checksum }
  get isFeatured() { return this.#isFeatured }
  get galleryOrder() { return this.#galleryOrder }
  get createdAt() { return this.#createdAt }
  get createdBy() { return this.#createdBy }
  get metadata() { return { ...this.#metadata } }

  setAsFeatured() {
    this.#isFeatured = true
  }

  removeAsFeatured() {
    this.#isFeatured = false
  }

  setGalleryOrder(order) {
    this.#galleryOrder = order
  }

  isImage() {
    return this.#type === MEDIA_TYPE.IMAGE
  }

  toSafeJSON() {
    return {
      id: this.#id,
      applicationId: this.#applicationId,
      type: this.#type,
      originalName: this.#originalName,
      mimeType: this.#mimeType,
      size: this.#size,
      width: this.#width,
      height: this.#height,
      url: this.#url,
      isFeatured: this.#isFeatured,
      galleryOrder: this.#galleryOrder,
      createdAt: this.#createdAt,
      createdBy: this.#createdBy
    }
  }

  toPublicJSON() {
    return {
      id: this.#id,
      applicationId: this.#applicationId,
      type: this.#type,
      originalName: this.#originalName,
      mimeType: this.#mimeType,
      size: this.#size,
      width: this.#width,
      height: this.#height,
      url: this.#url,
      isFeatured: this.#isFeatured,
      galleryOrder: this.#galleryOrder,
      createdAt: this.#createdAt
    }
  }
}

export function validateMediaFile(file) {
  const errors = []

  if (!file || !file.buffer || !file.originalname) {
    errors.push('File buffer and original name are required')
    return { valid: false, errors }
  }

  const ext = file.originalname.split('.').pop()?.toLowerCase()
  const mimeType = file.mimetype || getMimeFromExt(ext)

  if (!ACCEPTED_IMAGE_TYPES.includes(mimeType)) {
    errors.push(`File type ${mimeType} is not accepted. Allowed: JPEG, PNG, WebP`)
  }

  if (file.buffer.length > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  return {
    valid: errors.length === 0,
    errors,
    mimeType,
    size: file.buffer.length
  }
}

function getMimeFromExt(ext) {
  const mimeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  }
  return mimeMap[ext] || 'application/octet-stream'
}

export function generateMediaId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `media_${timestamp}_${random}`
}

export function createApplicationMediaPath(applicationId) {
  return applicationId.replace(/\//g, '_').replace(/\./g, '_')
}

export const MEDIA_CONFIG = {
  ACCEPTED_TYPES: ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_DIMENSIONS,
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp']
}

export default {
  MEDIA_TYPE,
  MEDIA_ACCESS,
  OwnerMedia,
  validateMediaFile,
  generateMediaId,
  createApplicationMediaPath,
  MEDIA_CONFIG
}