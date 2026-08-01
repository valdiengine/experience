import { RuntimeError } from '../../runtime.errors.js'

export class CmsRuntimeError extends RuntimeError {
  constructor(message, context = {}) {
    super(message)
    this.name = 'CmsRuntimeError'
    this.context = context
    this.timestamp = Date.now()
  }
}

export class CmsProviderUnavailableError extends CmsRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsProviderUnavailableError'
    this.category = 'provider'
  }
}

export class CmsRuntimeUnavailableError extends CmsRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsRuntimeUnavailableError'
    this.category = 'availability'
  }
}

export class CmsInitializationError extends CmsRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsInitializationError'
    this.category = 'initialization'
  }
}

export class CmsConfigurationError extends CmsRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CmsConfigurationError'
    this.category = 'configuration'
  }
}

export default CmsRuntimeError
