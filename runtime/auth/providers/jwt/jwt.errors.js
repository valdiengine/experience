import { AuthenticationEngineError } from '../../engine/auth.engine.errors.js'

export class JwtError extends AuthenticationEngineError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtError'
  }
}

export class JwtExpiredError extends JwtError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtExpiredError'
    this.category = 'expired'
  }
}

export class JwtInvalidSignatureError extends JwtError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtInvalidSignatureError'
    this.category = 'signature'
  }
}

export class JwtMalformedError extends JwtError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtMalformedError'
    this.category = 'malformed'
  }
}

export class JwtRevokedError extends JwtError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtRevokedError'
    this.category = 'revoked'
  }
}

export class JwtReuseDetectedError extends JwtError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtReuseDetectedError'
    this.category = 'reuse'
  }
}

export class JwtSessionExpiredError extends JwtError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtSessionExpiredError'
    this.category = 'session'
  }
}

export class JwtPermissionError extends JwtError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtPermissionError'
    this.category = 'permission'
  }
}

export class JwtDeviceMismatchError extends JwtError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtDeviceMismatchError'
    this.category = 'device'
  }
}

export class JwtConfigurationError extends JwtError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'JwtConfigurationError'
    this.category = 'configuration'
  }
}

export default JwtError
