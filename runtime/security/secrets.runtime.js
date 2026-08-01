import { RuntimeError } from '../runtime.errors.js'

export class SecretsRuntimeError extends RuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SecretsRuntimeError'
  }
}

export class SecretsUnavailableError extends SecretsRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SecretsUnavailableError'
    this.category = 'availability'
  }
}

export class SecretNotFoundError extends SecretsRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SecretNotFoundError'
    this.category = 'not_found'
  }
}

export class SecretsConfigurationError extends SecretsRuntimeError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'SecretsConfigurationError'
    this.category = 'configuration'
  }
}

export class SecretsRuntime {
  #initialized = false
  #config = {}

  constructor(config = {}) {
    this.#config = config
    this.name = 'secrets'
  }

  get initialized() { return this.#initialized }

  async initialize() {
    if (this.#initialized) return
    this.#initialized = true
  }

  async get(key) {
    throw new SecretsUnavailableError('SecretsRuntime.get() not implemented — use a provider: Vault, AWS, GCP, or local env', { key })
  }

  async set(key, value) {
    throw new SecretsUnavailableError('SecretsRuntime.set() not implemented — use a provider: Vault, AWS, GCP, or local env', { key })
  }

  async delete(key) {
    throw new SecretsUnavailableError('SecretsRuntime.delete() not implemented — use a provider: Vault, AWS, GCP, or local env', { key })
  }

  async list(prefix = '') {
    throw new SecretsUnavailableError('SecretsRuntime.list() not implemented — use a provider: Vault, AWS, GCP, or local env', { prefix })
  }

  async rotate(key) {
    throw new SecretsUnavailableError('SecretsRuntime.rotate() not implemented — use a provider: Vault, AWS, GCP, or local env', { key })
  }

  supports(feature) {
    const features = ['get', 'set', 'delete', 'list', 'rotate', 'auto-rotate', 'versioning', 'audit']
    return features.includes(feature)
  }
}

export default SecretsRuntime
