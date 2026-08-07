/**
 * Media Capability
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Platform-level media capability.
 * Provides unified media interface for all products.
 *
 * Architecture:
 * BusinessService → Media Capability → Media Manager → Media Engine → Storage Platform
 */

import { BaseCapability } from '../core/base.capability.js'
import { MediaManager } from './media.manager.js'
import { MEDIA_EVENTS } from '../../media/media.events.js'

export class MediaCapability extends BaseCapability {
  static id = 'media'
  static name = 'Media'
  static version = '1.0.0'
  static dependencies = ['storage']

  #manager

  async init(context, config) {
    await super.init(context, config)

    this.#manager = new MediaManager(context)

    this.context.media = {
      upload: this.upload.bind(this),
      uploadAsync: this.uploadAsync.bind(this),
      get: this.get.bind(this),
      list: this.list.bind(this),
      delete: this.delete.bind(this),
      getUrl: this.getUrl.bind(this),
      getSignedUrl: this.getSignedUrl.bind(this),
      getMetadata: this.getMetadata.bind(this),
      updateMetadata: this.updateMetadata.bind(this),
      processVariants: this.processVariants.bind(this),
      getJob: this.getJob.bind(this),
      cancelJob: this.cancelJob.bind(this),
      healthCheck: this.healthCheck.bind(this),
    }

    await this.#manager.initialize()
  }

  async activate() {
    await super.activate()
    this.setState('active')
  }

  async deactivate() {
    await super.deactivate()
    this.setState('registered')
  }

  async destroy() {
    this.#manager = null
    await super.destroy()
  }

  get manager() {
    return this.#manager
  }

  async upload(assetData, options = {}) {
    return this.#manager.upload(assetData, options)
  }

  async uploadAsync(assetData, options = {}) {
    return this.#manager.uploadAsync(assetData, options)
  }

  async get(mediaId, options = {}) {
    return this.#manager.get(mediaId, options)
  }

  async list(filter = {}, options = {}) {
    return this.#manager.list(filter, options)
  }

  async delete(mediaId, options = {}) {
    return this.#manager.delete(mediaId, options)
  }

  async getUrl(mediaId, options = {}) {
    return this.#manager.getUrl(mediaId, options)
  }

  async getSignedUrl(mediaId, options = {}) {
    return this.#manager.getSignedUrl(mediaId, options)
  }

  async getMetadata(mediaId, options = {}) {
    return this.#manager.getMetadata(mediaId, options)
  }

  async updateMetadata(mediaId, metadata, options = {}) {
    return this.#manager.updateMetadata(mediaId, metadata, options)
  }

  async processVariants(mediaId, options = {}) {
    return this.#manager.processVariants(mediaId, options)
  }

  async getJob(jobId, options = {}) {
    return this.#manager.getJob(jobId, options)
  }

  async cancelJob(jobId, options = {}) {
    return this.#manager.cancelJob(jobId, options)
  }

  async healthCheck() {
    return this.#manager.healthCheck()
  }

  static getEvents() {
    return Object.values(MEDIA_EVENTS)
  }
}

export default MediaCapability
