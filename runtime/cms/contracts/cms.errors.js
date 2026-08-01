import { RuntimeError } from '../../runtime.errors.js'

export class CmsError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsError'
  }
}

export class CmsContentError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsContentError'
    this.category = 'content'
  }
}

export class CmsMediaError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsMediaError'
    this.category = 'media'
  }
}

export class CmsSeoError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsSeoError'
    this.category = 'seo'
  }
}

export class CmsSyncError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsSyncError'
    this.category = 'sync'
  }
}

export class CmsWebhookError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsWebhookError'
    this.category = 'webhook'
  }
}

export class CmsPreviewError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsPreviewError'
    this.category = 'preview'
  }
}

export class CmsTemplateError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsTemplateError'
    this.category = 'template'
  }
}

export class CmsProviderError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsProviderError'
    this.category = 'provider'
  }
}

export class CmsProviderUnavailableError extends CmsProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsProviderUnavailableError'
    this.category = 'provider_unavailable'
  }
}

export class CmsSyncConflictError extends CmsSyncError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsSyncConflictError'
    this.category = 'sync_conflict'
  }
}

export class CmsTenantIsolationError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsTenantIsolationError'
    this.category = 'tenant'
  }
}

export default CmsError
