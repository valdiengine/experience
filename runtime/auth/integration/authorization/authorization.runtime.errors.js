import { RuntimeError } from '../../../runtime.errors.js'

export class AuthorizationRuntimeError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthorizationRuntimeError'
  }
}

export class AuthorizationRuntimeUnavailableError extends AuthorizationRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthorizationRuntimeUnavailableError'
    this.category = 'availability'
  }
}

export class AuthorizationRuntimeConfigurationError extends AuthorizationRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthorizationRuntimeConfigurationError'
    this.category = 'configuration'
  }
}

export class AuthorizationRuntimeInitializationError extends AuthorizationRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthorizationRuntimeInitializationError'
    this.category = 'initialization'
  }
}

export class AuthorizationRuntimeProviderError extends AuthorizationRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthorizationRuntimeProviderError'
    this.category = 'provider'
  }
}

export default AuthorizationRuntimeError
