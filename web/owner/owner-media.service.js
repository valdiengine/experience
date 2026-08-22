/**
 * Owner Media Service
 *
 * PUSH-3 campaign service pattern.
 * Business logic for owner media management.
 */

import {
  OwnerMedia,
  MEDIA_TYPE,
  validateMediaFile,
  generateMediaId,
  createApplicationMediaPath
} from './owner-media.model.js'

export class OwnerMediaService {
  #persistence
  #storageProvider
  #auditLog

  constructor(options = {}) {
    this.#persistence = options.persistence
    this.#storageProvider = options.storageProvider
    this.#auditLog = options.auditLog || { log: () => {} }
  }

  async list(applicationId, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const mediaList = this.#persistence.getByApplication(applicationId)

    return {
      success: true,
      media: mediaList.map(m => m.toPublicJSON()),
      featured: mediaList.find(m => m.isFeatured)?.toPublicJSON() || null,
      total: mediaList.length
    }
  }

  async upload(file, applicationId, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const validation = validateMediaFile(file)

    if (!validation.valid) {
      return { success: false, error: validation.errors.join('; '), status: 400 }
    }

    const mediaId = generateMediaId()
    const appPath = createApplicationMediaPath(applicationId)
    const storagePath = `${appPath}/${mediaId}`

    let uploadResult
    if (this.#storageProvider) {
      try {
        uploadResult = await this.#storageProvider.upload({
          buffer: file.buffer,
          fileName: file.originalname,
          mimeType: validation.mimeType
        }, { path: appPath })
      } catch (error) {
        return { success: false, error: `Upload failed: ${error.message}`, status: 500 }
      }
    } else {
      uploadResult = {
        path: storagePath,
        url: `/media/${storagePath}`,
        size: validation.size,
        mimeType: validation.mimeType
      }
    }

    const media = new OwnerMedia({
      id: mediaId,
      applicationId,
      type: MEDIA_TYPE.IMAGE,
      originalName: file.originalname,
      mimeType: validation.mimeType,
      size: validation.size,
      storagePath: uploadResult.path,
      url: uploadResult.url,
      checksum: uploadResult.checksum || null,
      createdBy: ownerEmail
    })

    this.#persistence.save(media)

    this.#auditLog.log({
      action: 'media_uploaded',
      applicationId,
      owner: ownerEmail,
      mediaId,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      media: media.toPublicJSON()
    }
  }

  async get(mediaId, applicationId, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const media = this.#persistence.get(mediaId)

    if (!media) {
      return { success: false, error: 'Media not found', status: 404 }
    }

    if (media.applicationId !== applicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    return {
      success: true,
      media: media.toPublicJSON()
    }
  }

  async setFeatured(mediaId, applicationId, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const media = this.#persistence.get(mediaId)

    if (!media) {
      return { success: false, error: 'Media not found', status: 404 }
    }

    if (media.applicationId !== applicationId) {
      return { success: false, error: 'Cannot set foreign media as featured', status: 403 }
    }

    this.#persistence.setFeatured(mediaId, applicationId)

    this.#auditLog.log({
      action: 'featured_image_changed',
      applicationId,
      owner: ownerEmail,
      mediaId,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      mediaId,
      isFeatured: true
    }
  }

  async removeFeatured(applicationId, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    this.#persistence.removeFeatured(applicationId)

    this.#auditLog.log({
      action: 'featured_image_removed',
      applicationId,
      owner: ownerEmail,
      timestamp: new Date().toISOString()
    })

    return { success: true }
  }

  async addToGallery(mediaId, applicationId, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const media = this.#persistence.get(mediaId)

    if (!media) {
      return { success: false, error: 'Media not found', status: 404 }
    }

    if (media.applicationId !== applicationId) {
      return { success: false, error: 'Cannot add foreign media to gallery', status: 403 }
    }

    const mediaList = this.#persistence.getByApplication(applicationId)
    const maxOrder = Math.max(...mediaList.filter(m => m.galleryOrder !== null).map(m => m.galleryOrder), -1)
    media.setGalleryOrder(maxOrder + 1)
    this.#persistence.save(media)

    return {
      success: true,
      mediaId,
      galleryOrder: media.galleryOrder
    }
  }

  async removeFromGallery(mediaId, applicationId, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const media = this.#persistence.get(mediaId)

    if (!media) {
      return { success: false, error: 'Media not found', status: 404 }
    }

    if (media.applicationId !== applicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    media.setGalleryOrder(null)
    this.#persistence.save(media)

    return { success: true }
  }

  async reorderGallery(applicationId, mediaIds, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const result = this.#persistence.updateGalleryOrder(applicationId, mediaIds)

    if (!result.success) {
      return { success: false, error: result.error, status: 400 }
    }

    this.#auditLog.log({
      action: 'gallery_reordered',
      applicationId,
      owner: ownerEmail,
      mediaIds,
      timestamp: new Date().toISOString()
    })

    return { success: true }
  }

  async delete(mediaId, applicationId, ownerEmail, authorizedApplicationId) {
    if (applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Forbidden', status: 403 }
    }

    const media = this.#persistence.get(mediaId)

    if (!media) {
      return { success: false, error: 'Media not found', status: 404 }
    }

    if (media.applicationId !== applicationId) {
      return { success: false, error: 'Cannot delete foreign media', status: 403 }
    }

    if (this.#persistence.isReferenced(mediaId)) {
      return {
        success: false,
        error: 'Cannot delete media that is in use as featured image or gallery',
        status: 409
      }
    }

    if (this.#storageProvider && media.storagePath) {
      try {
        await this.#storageProvider.delete(media.storagePath)
      } catch {}
    }

    this.#persistence.delete(mediaId)

    this.#auditLog.log({
      action: 'media_deleted',
      applicationId,
      owner: ownerEmail,
      mediaId,
      timestamp: new Date().toISOString()
    })

    return { success: true }
  }
}

export function createOwnerMediaService(options = {}) {
  return new OwnerMediaService(options)
}

export default {
  OwnerMediaService,
  createOwnerMediaService
}