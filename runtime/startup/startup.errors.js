import { RuntimeError } from '../runtime.errors.js'

export class StartupError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'StartupError'
    this.category = 'startup'
  }
}

export class RepositoryBootstrapError extends StartupError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RepositoryBootstrapError'
    this.category = 'repository'
  }
}

export class CapabilityBootstrapError extends StartupError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'CapabilityBootstrapError'
    this.category = 'capability'
  }
}

export class RuntimeBootstrapError extends StartupError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'RuntimeBootstrapError'
    this.category = 'runtime'
  }
}

export class ContextBootstrapError extends StartupError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'ContextBootstrapError'
    this.category = 'context'
  }
}

export class ValidationBootstrapError extends StartupError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'ValidationBootstrapError'
    this.category = 'validation'
  }
}

export default StartupError
