import { RuntimeError } from '../../runtime.errors.js'

export class SecurityError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SecurityError'
  }
}

export class RateLimitExceededError extends SecurityError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RateLimitExceededError'
    this.category = 'rate_limit'
  }
}

export class BruteForceLockoutError extends SecurityError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'BruteForceLockoutError'
    this.category = 'brute_force'
  }
}

export class SuspiciousActivityError extends SecurityError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SuspiciousActivityError'
    this.category = 'suspicious'
  }
}

export class SecurityConfigurationError extends SecurityError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SecurityConfigurationError'
    this.category = 'configuration'
  }
}

export default SecurityError
