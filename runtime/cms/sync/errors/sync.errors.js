import { CmsError } from '../../contracts/cms.errors.js'

export class SyncEngineError extends CmsError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncEngineError'
  }
}

export class SyncJobError extends SyncEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncJobError'
    this.category = 'job'
  }
}

export class SyncQueueError extends SyncEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncQueueError'
    this.category = 'queue'
  }
}

export class SyncConflictError extends SyncEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncConflictError'
    this.category = 'conflict'
  }
}

export class SyncStrategyError extends SyncEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncStrategyError'
    this.category = 'strategy'
  }
}

export class SyncMappingError extends SyncEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncMappingError'
    this.category = 'mapping'
  }
}

export class SyncStateError extends SyncEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncStateError'
    this.category = 'state'
  }
}

export class SyncProviderError extends SyncEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncProviderError'
    this.category = 'provider'
  }
}

export class SyncRetryExhaustedError extends SyncEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncRetryExhaustedError'
    this.category = 'retry'
  }
}

export class SyncTenantError extends SyncEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SyncTenantError'
    this.category = 'tenant'
  }
}

export default SyncEngineError
