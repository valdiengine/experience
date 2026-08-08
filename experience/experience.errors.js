/**
 * Experience Engine Errors
 * 
 * Clear error hierarchy for Experience Engine operations.
 */

export class ExperienceEngineError extends Error {
  constructor(message, code = 'EXPERIENCE_ENGINE_ERROR', context = {}) {
    super(message)
    this.name = 'ExperienceEngineError'
    this.code = code
    this.context = context
    this.timestamp = new Date().toISOString()
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp
    }
  }
}

export class ExperienceResolutionError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'EXPERIENCE_RESOLUTION_ERROR', context)
    this.name = 'ExperienceResolutionError'
  }
}

export class ProductResolutionError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'PRODUCT_RESOLUTION_ERROR', context)
    this.name = 'ProductResolutionError'
  }
}

export class EcosystemLoadError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'ECOSYSTEM_LOAD_ERROR', context)
    this.name = 'EcosystemLoadError'
  }
}

export class ConfigurationResolutionError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'CONFIGURATION_RESOLUTION_ERROR', context)
    this.name = 'ConfigurationResolutionError'
  }
}

export class ExperienceNotFoundError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'EXPERIENCE_NOT_FOUND', context)
    this.name = 'ExperienceNotFoundError'
  }
}

export class ModuleResolutionError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'MODULE_RESOLUTION_ERROR', context)
    this.name = 'ModuleResolutionError'
  }
}

export class CapabilityResolutionError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'CAPABILITY_RESOLUTION_ERROR', context)
    this.name = 'CapabilityResolutionError'
  }
}

export class ExperienceCompositionError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'EXPERIENCE_COMPOSITION_ERROR', context)
    this.name = 'ExperienceCompositionError'
  }
}

export class ExperienceLifecycleError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'EXPERIENCE_LIFECYCLE_ERROR', context)
    this.name = 'ExperienceLifecycleError'
  }
}

export class TenantIsolationError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'TENANT_ISOLATION_ERROR', context)
    this.name = 'TenantIsolationError'
  }
}

export class ConfigurationValidationError extends ExperienceEngineError {
  constructor(message, context = {}) {
    super(message, 'CONFIGURATION_VALIDATION_ERROR', context)
    this.name = 'ConfigurationValidationError'
  }
}

export default {
  ExperienceEngineError,
  ExperienceResolutionError,
  ProductResolutionError,
  EcosystemLoadError,
  ConfigurationResolutionError,
  ExperienceNotFoundError,
  ModuleResolutionError,
  CapabilityResolutionError,
  ExperienceCompositionError,
  ExperienceLifecycleError,
  TenantIsolationError,
  ConfigurationValidationError
}
