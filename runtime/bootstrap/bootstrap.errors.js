import { RuntimeError } from '../runtime.errors.js'

export class BootstrapError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'BootstrapError'
    this.category = 'bootstrap'
  }
}

export class BootstrapConfigurationError extends BootstrapError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'BootstrapConfigurationError'
    this.category = 'configuration'
  }
}

export class ProviderRegistrationError extends BootstrapError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'ProviderRegistrationError'
    this.category = 'provider'
  }
}

export class BootstrapInitializationError extends BootstrapError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'BootstrapInitializationError'
    this.category = 'initialization'
  }
}

export class StartupOrderError extends BootstrapError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'StartupOrderError'
    this.category = 'startup'
  }
}

export class DependencyResolutionError extends BootstrapError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'DependencyResolutionError'
    this.category = 'dependency'
  }
}

export class CircularDependencyError extends BootstrapError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CircularDependencyError'
    this.category = 'dependency'
  }
}

export class DuplicateProviderError extends BootstrapError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'DuplicateProviderError'
    this.category = 'provider'
  }
}

export class UnregisteredProviderError extends BootstrapError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'UnregisteredProviderError'
    this.category = 'provider'
  }
}

export class PendingMigrationsError extends BootstrapError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PendingMigrationsError'
    this.category = 'migration'
  }
}

export default BootstrapError
