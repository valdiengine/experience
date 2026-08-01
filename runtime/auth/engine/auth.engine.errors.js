import { RuntimeError } from '../../runtime.errors.js'

export class AuthenticationEngineError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuthenticationEngineError'
  }
}

export class EngineAuthorizationError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'EngineAuthorizationError'
    this.category = 'authorization'
  }
}

export class EnginePermissionDeniedError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'EnginePermissionDeniedError'
    this.category = 'permission'
  }
}

export class RoleError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RoleError'
    this.category = 'role'
  }
}

export class SessionError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SessionError'
    this.category = 'session'
  }
}

export class TokenError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'TokenError'
    this.category = 'token'
  }
}

export class TrustError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'TrustError'
    this.category = 'trust'
  }
}

export class DeviceError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'DeviceError'
    this.category = 'device'
  }
}

export class MFAError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'MFAError'
    this.category = 'mfa'
  }
}

export class AnonymousError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AnonymousError'
    this.category = 'anonymous'
  }
}

export class AuditError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'AuditError'
    this.category = 'audit'
  }
}

export class EngineProviderUnavailableError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'EngineProviderUnavailableError'
    this.category = 'provider'
  }
}

export default AuthenticationEngineError
