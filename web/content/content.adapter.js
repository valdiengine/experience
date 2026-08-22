/**
 * Content Adapter Interface
 *
 * Abstract interface for content providers.
 * Allows WordPress or other CMS to provide editorial content.
 * Framework-free implementation.
 */

export const CONTENT_TYPES = {
  POST: 'post',
  PAGE: 'page',
  CATEGORY: 'category',
  TAG: 'tag',
  MEDIA: 'media'
}

export const CONTENT_STATUS = {
  PUBLISH: 'publish',
  DRAFT: 'draft',
  PRIVATE: 'private'
}

export class ContentAdapterError extends Error {
  constructor(message, code = 'CONTENT_ERROR') {
    super(message)
    this.name = 'ContentAdapterError'
    this.code = code
  }
}

export class NotFoundError extends ContentAdapterError {
  constructor(message = 'Content not found') {
    super(message, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConfigurationError extends ContentAdapterError {
  constructor(message = 'Configuration error') {
    super(message, 'CONFIG_ERROR')
    this.name = 'ConfigurationError'
  }
}

export class NetworkError extends ContentAdapterError {
  constructor(message = 'Network error') {
    super(message, 'NETWORK_ERROR')
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends ContentAdapterError {
  constructor(message = 'Request timeout') {
    super(message, 'TIMEOUT')
    this.name = 'TimeoutError'
  }
}

export class ContentAdapter {
  constructor(config = {}) {
    this.config = config
    this.enabled = config.enabled !== false
  }

  get isEnabled() {
    return this.enabled
  }

  async getPost(slug, destination) {
    throw new Error('Not implemented')
  }

  async getPosts(options = {}, destination) {
    throw new Error('Not implemented')
  }

  async getPage(slug, destination) {
    throw new Error('Not implemented')
  }

  async getPages(options = {}, destination) {
    throw new Error('Not implemented')
  }

  async getCategory(slug, destination) {
    throw new Error('Not implemented')
  }

  async getCategories(options = {}, destination) {
    throw new Error('Not implemented')
  }

  async getTag(slug, destination) {
    throw new Error('Not implemented')
  }

  async getTags(options = {}, destination) {
    throw new Error('Not implemented')
  }

  async getFeaturedMedia(mediaId) {
    throw new Error('Not implemented')
  }

  async search(query, options = {}, destination) {
    throw new Error('Not implemented')
  }

  async getSeoMetadata(contentId, contentType, destination) {
    throw new Error('Not implemented')
  }

  async health() {
    throw new Error('Not implemented')
  }
}

export function createContentAdapter(config = {}) {
  return new ContentAdapter(config)
}

export default ContentAdapter
