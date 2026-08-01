import { BUSINESS_ACCOMMODATION_EVENTS } from '../business.events.js'
import { BusinessOrchestrationError } from '../business.errors.js'
import { BUSINESS_PERMISSIONS } from '../business.permissions.js'
import { BUSINESS_STATUS } from '../business.status.js'

const BRAND_DEFAULTS = [
  'defaultLogo', 'defaultCover', 'defaultBrandColors',
  'defaultCurrency', 'defaultLanguage', 'defaultTimezone',
  'defaultPolicies',
]

export class BusinessAccommodationManager {
  #context

  constructor(context) {
    this.#context = context
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  get #accommodationRepo() {
    return this.#context?.repositories?.accommodation || null
  }

  get #businessRepo() {
    return this.#context?.repositories?.business || null
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'business')
    } catch {
      throw new Error(`Missing permission: ${permission}`)
    }
  }

  async #assertBusinessCanOwn(businessId) {
    const business = await this.#businessRepo?.findById(businessId)
    if (!business) throw new BusinessOrchestrationError(`Business not found: ${businessId}`)
    if (business.status === BUSINESS_STATUS.ARCHIVED) {
      throw new BusinessOrchestrationError('Archived businesses cannot own accommodations')
    }
    if (business.status === BUSINESS_STATUS.DELETED) {
      throw new BusinessOrchestrationError('Deleted businesses cannot own accommodations')
    }
    return business
  }

  #applyBrandDefaults(business) {
    const defaults = {}
    for (const key of BRAND_DEFAULTS) {
      if (business[key] !== undefined) {
        defaults[key.replace('default', '').charAt(0).toLowerCase() + key.replace('default', '').slice(1)] = business[key]
      }
    }
    return defaults
  }

  async #getRepo() {
    if (!this.#accommodationRepo) {
      throw new BusinessOrchestrationError('Accommodation repository not available')
    }
    return this.#accommodationRepo
  }

  async #syncCounts(businessId) {
    try {
      const repo = await this.#getRepo()
      const [published, draft] = await Promise.all([
        repo.count({ businessId, status: 'published' }),
        repo.count({ businessId, status: 'draft' }),
      ])
      await this.#businessRepo?.update({ id: businessId }, {
        publishedAccommodationCount: published,
        draftAccommodationCount: draft,
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_ERROR, {
        message: 'Failed to sync accommodation counts',
        businessId,
        error: err.message,
      })
    }
  }

  cascadeArchive(businessId, identity) {
    return this.#cascadeArchive(businessId, identity)
  }

  cascadeRestore(businessId, identity) {
    return this.#cascadeRestore(businessId, identity)
  }

  async #cascadeArchive(businessId, identity) {
    try {
      const repo = await this.#getRepo()
      const accommodations = await repo.findMany({ businessId }) || []
      const now = new Date().toISOString()
      for (const acc of accommodations) {
        if (acc.status !== 'archived' && acc.status !== 'deleted') {
          await repo.update({ id: acc.id }, {
            status: 'hidden',
            previousStatus: acc.status,
            updatedAt: now,
            updatedBy: identity?.id || null,
          })
        }
      }
      await this.#syncCounts(businessId)
    } catch (err) {
      this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_ERROR, {
        message: 'Cascade archive failed',
        businessId,
        error: err.message,
      })
    }
  }

  async #cascadeRestore(businessId, identity) {
    try {
      const repo = await this.#getRepo()
      const accommodations = await repo.findMany({ businessId }) || []
      const now = new Date().toISOString()
      for (const acc of accommodations) {
        const targetStatus = acc.previousStatus || 'draft'
        await repo.update({ id: acc.id }, {
          status: targetStatus,
          previousStatus: null,
          updatedAt: now,
          updatedBy: identity?.id || null,
        })
      }
      await this.#syncCounts(businessId)
    } catch (err) {
      this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_ERROR, {
        message: 'Cascade restore failed',
        businessId,
        error: err.message,
      })
    }
  }

  async createAccommodation(businessId, data, identity) {
    const business = await this.#assertBusinessCanOwn(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, business)

    const defaults = this.#applyBrandDefaults(business)
    const now = new Date().toISOString()
    const repo = await this.#getRepo()

    const accommodation = {
      ...data,
      ...defaults,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      businessId,
      tenantId: business.tenantId,
      destinationId: business.destinationId,
      ownerId: identity?.id || null,
      createdBy: identity?.id || null,
      updatedBy: identity?.id || null,
      status: data.status || 'draft',
      createdAt: now,
      updatedAt: now,
    }

    const saved = await repo.create(accommodation)
    if (!saved) return { success: false, errors: ['Failed to create accommodation'] }

    await this.#syncCounts(businessId)

    this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_CREATED, {
      businessId,
      accommodation: saved,
      identity,
    })

    return { success: true, data: saved }
  }

  async attachAccommodation(businessId, accommodationId, identity) {
    const business = await this.#assertBusinessCanOwn(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, business)

    const repo = await this.#getRepo()
    const accommodation = await repo.findById(accommodationId)
    if (!accommodation) {
      throw new BusinessOrchestrationError(`Accommodation not found: ${accommodationId}`)
    }
    if (accommodation.businessId) {
      throw new BusinessOrchestrationError('Accommodation already belongs to a business')
    }
    if (accommodation.tenantId !== business.tenantId) {
      throw new BusinessOrchestrationError('Cross-tenant attachment is forbidden')
    }

    const now = new Date().toISOString()
    await repo.update({ id: accommodationId }, {
      businessId,
      updatedAt: now,
      updatedBy: identity?.id || null,
    })

    await this.#syncCounts(businessId)

    this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_ATTACHED, {
      businessId,
      accommodationId,
      identity,
    })

    return { success: true, data: { ...accommodation, businessId } }
  }

  async detachAccommodation(businessId, accommodationId, identity) {
    const business = await this.#assertBusinessCanOwn(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, business)

    const repo = await this.#getRepo()
    const accommodation = await repo.findById(accommodationId)
    if (!accommodation) {
      throw new BusinessOrchestrationError(`Accommodation not found: ${accommodationId}`)
    }
    if (accommodation.businessId !== businessId) {
      throw new BusinessOrchestrationError('Accommodation does not belong to this business')
    }

    const now = new Date().toISOString()
    await repo.update({ id: accommodationId }, {
      businessId: null,
      updatedAt: now,
      updatedBy: identity?.id || null,
    })

    await this.#syncCounts(businessId)

    this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_DETACHED, {
      businessId,
      accommodationId,
      identity,
    })

    return { success: true }
  }

  async archiveAccommodation(businessId, accommodationId, identity) {
    const business = await this.#assertBusinessCanOwn(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, business)

    const repo = await this.#getRepo()
    const accommodation = await repo.findById(accommodationId)
    if (!accommodation) {
      throw new BusinessOrchestrationError(`Accommodation not found: ${accommodationId}`)
    }
    if (accommodation.businessId !== businessId) {
      throw new BusinessOrchestrationError('Accommodation does not belong to this business')
    }

    const now = new Date().toISOString()
    await repo.update({ id: accommodationId }, {
      status: 'archived',
      previousStatus: accommodation.status,
      updatedAt: now,
      updatedBy: identity?.id || null,
    })

    await this.#syncCounts(businessId)

    this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_ARCHIVED, {
      businessId,
      accommodationId,
      identity,
    })

    return { success: true, data: { ...accommodation, status: 'archived', previousStatus: accommodation.status } }
  }

  async publishAccommodation(businessId, accommodationId, identity) {
    const business = await this.#assertBusinessCanOwn(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, business)

    const repo = await this.#getRepo()
    const accommodation = await repo.findById(accommodationId)
    if (!accommodation) {
      throw new BusinessOrchestrationError(`Accommodation not found: ${accommodationId}`)
    }
    if (accommodation.businessId !== businessId) {
      throw new BusinessOrchestrationError('Accommodation does not belong to this business')
    }

    const now = new Date().toISOString()
    await repo.update({ id: accommodationId }, {
      status: 'published',
      publishedAt: now,
      updatedAt: now,
      updatedBy: identity?.id || null,
    })

    await this.#syncCounts(businessId)

    this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_PUBLISHED, {
      businessId,
      accommodationId,
      identity,
    })

    return { success: true, data: { ...accommodation, status: 'published', publishedAt: now } }
  }

  async hideAccommodation(businessId, accommodationId, identity) {
    const business = await this.#assertBusinessCanOwn(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, business)

    const repo = await this.#getRepo()
    const accommodation = await repo.findById(accommodationId)
    if (!accommodation) {
      throw new BusinessOrchestrationError(`Accommodation not found: ${accommodationId}`)
    }
    if (accommodation.businessId !== businessId) {
      throw new BusinessOrchestrationError('Accommodation does not belong to this business')
    }

    const now = new Date().toISOString()
    await repo.update({ id: accommodationId }, {
      status: 'hidden',
      previousStatus: accommodation.status,
      updatedAt: now,
      updatedBy: identity?.id || null,
    })

    await this.#syncCounts(businessId)

    this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_HIDDEN, {
      businessId,
      accommodationId,
      identity,
    })

    return { success: true, data: { ...accommodation, status: 'hidden', previousStatus: accommodation.status } }
  }

  async restoreAccommodation(businessId, accommodationId, identity) {
    const business = await this.#assertBusinessCanOwn(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, business)

    const repo = await this.#getRepo()
    const accommodation = await repo.findById(accommodationId)
    if (!accommodation) {
      throw new BusinessOrchestrationError(`Accommodation not found: ${accommodationId}`)
    }
    if (accommodation.businessId !== businessId) {
      throw new BusinessOrchestrationError('Accommodation does not belong to this business')
    }

    const targetStatus = accommodation.previousStatus || 'draft'
    const now = new Date().toISOString()
    await repo.update({ id: accommodationId }, {
      status: targetStatus,
      previousStatus: null,
      updatedAt: now,
      updatedBy: identity?.id || null,
    })

    await this.#syncCounts(businessId)

    return { success: true, data: { ...accommodation, status: targetStatus } }
  }

  async deleteAccommodation(businessId, accommodationId, identity) {
    const business = await this.#assertBusinessCanOwn(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, business)

    const repo = await this.#getRepo()
    const accommodation = await repo.findById(accommodationId)
    if (!accommodation) {
      throw new BusinessOrchestrationError(`Accommodation not found: ${accommodationId}`)
    }
    if (accommodation.businessId !== businessId) {
      throw new BusinessOrchestrationError('Accommodation does not belong to this business')
    }

    const now = new Date().toISOString()
    await repo.update({ id: accommodationId }, {
      status: 'deleted',
      updatedAt: now,
      updatedBy: identity?.id || null,
    })

    await this.#syncCounts(businessId)

    this.#emit(BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_DELETED, {
      businessId,
      accommodationId,
      identity,
    })

    return { success: true }
  }

  async duplicateAccommodation(businessId, accommodationId, identity) {
    const business = await this.#assertBusinessCanOwn(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, business)

    const repo = await this.#getRepo()
    const existing = await repo.findById(accommodationId)
    if (!existing) {
      throw new BusinessOrchestrationError(`Accommodation not found: ${accommodationId}`)
    }
    if (existing.businessId !== businessId) {
      throw new BusinessOrchestrationError('Accommodation does not belong to this business')
    }

    const now = new Date().toISOString()
    const duplicate = {
      ...existing,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: `${existing.title} (copy)`,
      slug: `${existing.slug}-copy`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      createdBy: identity?.id || null,
      updatedBy: identity?.id || null,
    }

    const saved = await repo.create(duplicate)
    if (!saved) return { success: false, errors: ['Failed to duplicate accommodation'] }

    await this.#syncCounts(businessId)

    return { success: true, data: saved }
  }

  async countAccommodations(businessId) {
    const repo = await this.#getRepo()
    return repo.count({ businessId })
  }

  async countPublished(businessId) {
    const repo = await this.#getRepo()
    return repo.count({ businessId, status: 'published' })
  }

  async countDraft(businessId) {
    const repo = await this.#getRepo()
    return repo.count({ businessId, status: 'draft' })
  }

  async countArchived(businessId) {
    const repo = await this.#getRepo()
    return repo.count({ businessId, status: 'archived' })
  }

  async listAccommodations(businessId, options = {}) {
    const repo = await this.#getRepo()
    return repo.findMany({ businessId, ...options }) || []
  }

  async listPublished(businessId) {
    const repo = await this.#getRepo()
    return repo.findMany({ businessId, status: 'published' }) || []
  }

  async listHidden(businessId) {
    const repo = await this.#getRepo()
    return repo.findMany({ businessId, status: 'hidden' }) || []
  }

  async getStatistics(businessId) {
    const repo = await this.#getRepo()
    const [total, published, draft, hidden, archived] = await Promise.all([
      repo.count({ businessId }),
      repo.count({ businessId, status: 'published' }),
      repo.count({ businessId, status: 'draft' }),
      repo.count({ businessId, status: 'hidden' }),
      repo.count({ businessId, status: 'archived' }),
    ])

    return { totalAccommodations: total, published, draft, hidden, archived }
  }
}
