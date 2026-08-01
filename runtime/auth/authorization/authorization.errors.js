import { RuntimeError } from '../../runtime.errors.js'

export class AuthorizationError extends RuntimeError {
  constructor(message, context = {}) {
    super(message)
    this.name = 'AuthorizationError'
    this.context = context
    this.timestamp = Date.now()
  }
}

export class PermissionDeniedError extends AuthorizationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PermissionDeniedError'
    this.category = 'denied'
  }
}

export class PolicyNotFoundError extends AuthorizationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PolicyNotFoundError'
    this.category = 'policy'
  }
}

export class RoleNotFoundError extends AuthorizationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RoleNotFoundError'
    this.category = 'role'
  }
}

export class ScopeNotFoundError extends AuthorizationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'ScopeNotFoundError'
    this.category = 'scope'
  }
}

export class PolicyCompileError extends AuthorizationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PolicyCompileError'
    this.category = 'compile'
  }
}

export class PolicyEvaluationError extends AuthorizationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PolicyEvaluationError'
    this.category = 'evaluation'
  }
}

export class AuthorizationConfigurationError extends AuthorizationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthorizationConfigurationError'
    this.category = 'configuration'
  }
}

export default AuthorizationError
