import { RuntimeError } from '../../runtime.errors.js'

export class AuthenticationRuntimeError extends RuntimeError {
  constructor(message, context = {}) {
    super(message)
    this.name = 'AuthenticationRuntimeError'
    this.context = context
    this.timestamp = Date.now()
  }
}

export class ProviderUnavailableError extends AuthenticationRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'ProviderUnavailableError'
    this.category = 'provider'
  }
}

export class AuthenticationUnavailableError extends AuthenticationRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthenticationUnavailableError'
    this.category = 'availability'
  }
}

export class AuthenticationInitializationError extends AuthenticationRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthenticationInitializationError'
    this.category = 'initialization'
  }
}

export class AuthenticationConfigurationError extends AuthenticationRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthenticationConfigurationError'
    this.category = 'configuration'
  }
}

export default AuthenticationRuntimeError
