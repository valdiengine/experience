/**
 * Owner Content Service
 *
 * PUSH-3 campaign service pattern.
 * Business logic for owner content management.
 */

import {
  OwnerContent,
  CONTENT_STATUS,
  validateContentData,
  sanitizeText
} from './owner-content.model.js'

export class OwnerContentService {
  #persistence
  #auditLog

  constructor(options = {}) {
    this.#persistence = options.persistence
    this.#auditLog = options.auditLog || { log: () => {} }
  }

  async get(applicationId, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const content = this.#persistence.get(applicationId)

    if (!content) {
      return {
        success: true,
        content: null,
        status: CONTENT_STATUS.DRAFT,
        message: 'No content exists yet'
      }
    }

    return {
      success: true,
      content: content.toSafeJSON(),
      status: content.status,
      isPublished: content.isPublished()
    }
  }

  async getDraft(applicationId, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const content = this.#persistence.get(applicationId)

    if (!content) {
      return { success: false, error: 'No draft exists', status: 404 }
    }

    if (content.isPublished()) {
      return {
        success: true,
        content: content.toSafeJSON(),
        status: CONTENT_STATUS.PUBLISHED,
        message: 'Published content has no draft'
      }
    }

    return {
      success: true,
      content: content.toSafeJSON(),
      status: CONTENT_STATUS.DRAFT
    }
  }

  async getPublished(applicationId, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const content = this.#persistence.get(applicationId)

    if (!content || !content.isPublished()) {
      return { success: false, error: 'No published content exists', status: 404 }
    }

    return {
      success: true,
      content: content.toSafeJSON(),
      status: CONTENT_STATUS.PUBLISHED
    }
  }

  async saveDraft(applicationId, data, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const currentRevision = this.#persistence.getRevision(applicationId)

    let content = this.#persistence.get(applicationId)

    if (!content) {
      content = new OwnerContent({
        applicationId,
        createdBy: ownerEmail
      })
    }

    const sanitizedData = this.#sanitizeInput(data)
    const updateResult = content.updateFields(sanitizedData)

    if (!updateResult.success) {
      return { success: false, error: updateResult.errors.join('; '), status: 400 }
    }

    content.markSaving(currentRevision)

    this.#persistence.save(content)

    this.#auditLog.log({
      action: 'content_draft_saved',
      applicationId,
      owner: ownerEmail,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      content: content.toSafeJSON(),
      status: CONTENT_STATUS.DRAFT
    }
  }

  async discardDraft(applicationId, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const content = this.#persistence.get(applicationId)

    if (!content) {
      return { success: false, error: 'No content to discard', status: 404 }
    }

    this.#persistence.delete(applicationId)

    this.#auditLog.log({
      action: 'content_draft_discarded',
      applicationId,
      owner: ownerEmail,
      timestamp: new Date().toISOString()
    })

    return { success: true, message: 'Draft discarded' }
  }

  async publish(applicationId, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const content = this.#persistence.get(applicationId)

    if (!content) {
      return { success: false, error: 'No content to publish', status: 404 }
    }

    const currentRevision = this.#persistence.getRevision(applicationId)
    const newRevision = currentRevision + 1

    if (content.baseRevision !== currentRevision) {
      return {
        success: false,
        error: 'Conflict: content has been modified since your last edit',
        status: 409
      }
    }

    content.markPublished(newRevision, ownerEmail)

    this.#persistence.save(content)

    this.#auditLog.log({
      action: 'content_published',
      applicationId,
      owner: ownerEmail,
      revision: newRevision,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      content: content.toSafeJSON(),
      revision: newRevision
    }
  }

  async preview(applicationId, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const content = this.#persistence.get(applicationId)

    if (!content) {
      return { success: false, error: 'No content to preview', status: 404 }
    }

    return {
      success: true,
      content: content.toPublicJSON(),
      status: content.status,
      isDraft: content.isDraft()
    }
  }

  #sanitizeInput(data) {
    const sanitized = {}

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeText(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  validateContent(data) {
    return validateContentData(data)
  }
}

export function createOwnerContentService(options = {}) {
  return new OwnerContentService(options)
}

export default {
  OwnerContentService,
  createOwnerContentService
}