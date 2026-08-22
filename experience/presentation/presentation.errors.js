/**
 * Presentation Errors
 * 
 * Error types specific to the Presentation Layer.
 * Does not duplicate Experience Engine error types.
 */

export class PresentationError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'PresentationError'
    this.context = context
  }
}

export class PresentationContextError extends PresentationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PresentationContextError'
  }
}

export class UnknownComponentError extends PresentationError {
  constructor(componentId, type = 'component') {
    super(`Unknown ${type}: ${componentId}`, { componentId, type })
    this.name = 'UnknownComponentError'
    this.componentId = componentId
  }
}

export class UnsupportedModuleError extends PresentationError {
  constructor(moduleId) {
    super(`Unsupported module: ${moduleId}`, { moduleId })
    this.name = 'UnsupportedModuleError'
    this.moduleId = moduleId
  }
}

export class InvalidViewModelError extends PresentationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'InvalidViewModelError'
  }
}

export class PresentationRenderError extends PresentationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PresentationRenderError'
  }
}

export class SecurityError extends PresentationError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SecurityError'
  }
}

export default {
  PresentationError,
  PresentationContextError,
  UnknownComponentError,
  UnsupportedModuleError,
  InvalidViewModelError,
  PresentationRenderError,
  SecurityError
}
