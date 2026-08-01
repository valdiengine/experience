import { ACCOMMODATION_STATUS } from './accommodation.status.js'
import { ACCOMMODATION_EVENTS } from './accommodation.events.js'
import {
  AccommodationNotFoundError,
  AccommodationPermissionError,
  AccommodationConflictError,
} from './accommodation.errors.js'
import { AccommodationWorkflow } from './accommodation.workflow.js'
import { validateCreateData, validateUpdateData, validateSlug, validateBusinessRules, validateBusinessOwnership } from './accommodation.validation.js'
import { ACCOMMODATION_PERMISSIONS } from './accommodation.permissions.js'
import { AccommodationPricing } from './accommodation.pricing.js'
import { AccommodationMedia } from './accommodation.media.js'
import { AccommodationSearch } from './accommodation.search.js'

export class AccommodationManager {
  #context

  constructor(context) {
    this.#context = context
  }

  get #repo() {
    return this.#context?.repositories?.accommodation || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  get #search() {
    return this.#context?.runtime?.search || null
  }

  get #sync() {
    return this.#context?.runtime?.sync || null
  }

  get #media() {
    return this.#context?.runtime?.media || null
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'accommodation')
    } catch {
      throw new AccommodationPermissionError(`Missing permission: ${permission}`)
    }
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  #generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  async #ensureUniqueSlug(slug, tenantId, excludeId) {
    if (!this.#repo) return slug
    const filter = { tenantId, slug }
    if (excludeId) filter.id = { ne: excludeId }
    const existing = await this.#repo.findOne(filter)
    if (existing) {
      throw new AccommodationConflictError(`Slug already exists: ${slug}`)
    }
    return slug
  }

  async createAccommodation(data, identity) {
    await this.#checkPermission(identity, ACCOMMODATION_PERMISSIONS.CREATE, data)

    validateCreateData(data)
    const businessErrors = validateBusinessRules(data)
    if (businessErrors.length > 0) {
      throw new AccommodationValidationError('Business rules validation failed', { errors: businessErrors })
    }

    await validateBusinessOwnership(data, this.#context)

    const now = new Date().toISOString()
    const slug = data.slug || this.#generateSlug(data.title)
    await this.#ensureUniqueSlug(slug, data.tenantId)

    const accommodation = {
      ...data,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      slug,
      status: ACCOMMODATION_STATUS.DRAFT,
      ownerId: data.ownerId || identity?.id || null,
      createdBy: identity?.id || null,
      updatedBy: identity?.id || null,
      featured: data.featured || false,
      pricing: data.pricing ? AccommodationPricing.create(data.pricing) : AccommodationPricing.create({}),
      media: data.media ? AccommodationMedia.create(data.media) : [],
      amenities: data.amenities || [],
      metadata: data.metadata || {},
      seo: data.seo || {},
      createdAt: now,
      updatedAt: now,
    }

    const saved = await this.#repo?.create(accommodation)
    if (!saved) return { success: false, errors: ['Failed to save accommodation'] }

    this.#emit(ACCOMMODATION_EVENTS.CREATED, { accommodation: saved, identity })

    return { success: true, data: saved }
  }

  async getById(id, identity) {
    const accommodation = await this.#repo?.findById(id)
    if (!accommodation) {
      throw new AccommodationNotFoundError(id)
    }
    await this.#checkPermission(identity, ACCOMMODATION_PERMISSIONS.READ, accommodation)
    return accommodation
  }

  async getMany(filter, identity) {
    await this.#checkPermission(identity, ACCOMMODATION_PERMISSIONS.READ)
    return this.#repo?.findMany(filter) || []
  }

  async updateAccommodation(id, data, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new AccommodationNotFoundError(id)
    }

    await this.#checkPermission(identity, ACCOMMODATION_PERMISSIONS.UPDATE, existing)

    const updates = validateUpdateData(data, existing.status)

    if (data.slug) {
      validateSlug(data.slug)
      await this.#ensureUniqueSlug(data.slug, existing.tenantId, id)
      updates.slug = data.slug
    }

    if (data.pricing) {
      updates.pricing = AccommodationPricing.create(data.pricing)
    }

    if (data.media) {
      updates.media = AccommodationMedia.create(data.media)
    }

    updates.updatedAt = new Date().toISOString()

    const saved = await this.#repo?.update({ id }, updates)
    if (!saved) {
      return { success: false, errors: ['Failed to update accommodation'] }
    }

    const updated = await this.#repo?.findById(id)

    this.#emit(ACCOMMODATION_EVENTS.UPDATED, { accommodation: updated, identity, changes: updates })

    return { success: true, data: updated }
  }

  async publishAccommodation(id, identity) {
    return this.#transitionStatus(id, ACCOMMODATION_STATUS.PUBLISHED, identity, ACCOMMODATION_PERMISSIONS.PUBLISH)
  }

  async unpublishAccommodation(id, identity) {
    return this.#transitionStatus(id, ACCOMMODATION_STATUS.HIDDEN, identity, ACCOMMODATION_PERMISSIONS.PUBLISH)
  }

  async archiveAccommodation(id, identity) {
    return this.#transitionStatus(id, ACCOMMODATION_STATUS.ARCHIVED, identity, ACCOMMODATION_PERMISSIONS.ARCHIVE)
  }

  async restoreAccommodation(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new AccommodationNotFoundError(id)
    }
    await this.#checkPermission(identity, ACCOMMODATION_PERMISSIONS.ARCHIVE, existing)
    const targetStatus = ACCOMMODATION_STATUS.DRAFT
    AccommodationWorkflow.transition(existing, targetStatus)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: targetStatus, updatedAt: now })
    this.#emit(ACCOMMODATION_EVENTS.RESTORED, { accommodation: { ...existing, status: targetStatus }, identity })
    return { success: true, data: { ...existing, status: targetStatus, updatedAt: now } }
  }

  async deleteAccommodation(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new AccommodationNotFoundError(id)
    }
    await this.#checkPermission(identity, ACCOMMODATION_PERMISSIONS.DELETE, existing)
    AccommodationWorkflow.transition(existing, ACCOMMODATION_STATUS.DELETED)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: ACCOMMODATION_STATUS.DELETED, updatedAt: now })
    this.#emit(ACCOMMODATION_EVENTS.DELETED, { accommodation: { ...existing, status: ACCOMMODATION_STATUS.DELETED }, identity })
    return { success: true }
  }

  async duplicateAccommodation(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new AccommodationNotFoundError(id)
    }
    await this.#checkPermission(identity, ACCOMMODATION_PERMISSIONS.CREATE, existing)

    const now = new Date().toISOString()
    const duplicate = {
      ...existing,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: `${existing.title} (copy)`,
      slug: await this.#ensureUniqueSlug(`${existing.slug}-copy`, existing.tenantId),
      status: ACCOMMODATION_STATUS.DRAFT,
      featured: false,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    }

    const saved = await this.#repo?.create(duplicate)
    if (!saved) {
      return { success: false, errors: ['Failed to duplicate accommodation'] }
    }

    this.#emit(ACCOMMODATION_EVENTS.CREATED, { accommodation: saved, identity, duplicatedFrom: id })

    return { success: true, data: saved }
  }

  async #transitionStatus(id, newStatus, identity, permission) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new AccommodationNotFoundError(id)
    }
    await this.#checkPermission(identity, permission, existing)
    AccommodationWorkflow.transition(existing, newStatus)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: newStatus, updatedAt: now })

    const eventMap = {
      [ACCOMMODATION_STATUS.PUBLISHED]: ACCOMMODATION_EVENTS.PUBLISHED,
      [ACCOMMODATION_STATUS.HIDDEN]: ACCOMMODATION_EVENTS.UNPUBLISHED,
      [ACCOMMODATION_STATUS.ARCHIVED]: ACCOMMODATION_EVENTS.ARCHIVED,
    }

    this.#emit(eventMap[newStatus] || ACCOMMODATION_EVENTS.UPDATED, {
      accommodation: { ...existing, status: newStatus },
      identity,
    })

    return { success: true, data: { ...existing, status: newStatus, updatedAt: now } }
  }
}
