export class RuntimeError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'RuntimeError'
    this.context = context
    this.timestamp = Date.now()
  }
}

export class RuntimeUnavailableError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RuntimeUnavailableError'
    this.category = 'availability'
  }
}

export class RuntimeProviderError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RuntimeProviderError'
    this.category = 'provider'
  }
}

export class RuntimeConfigurationError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RuntimeConfigurationError'
    this.category = 'configuration'
  }
}

export class RuntimeFeatureUnavailableError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RuntimeFeatureUnavailableError'
    this.category = 'feature'
  }
}

export class RuntimeInitializationError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RuntimeInitializationError'
    this.category = 'initialization'
  }
}

// Bootstrap errors
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

export default RuntimeError
