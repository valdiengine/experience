import { PolicyCompileError } from '../authorization/authorization.errors.js'

export class PolicyCompiler {
  #config = {}

  constructor(config = {}) {
    this.#config = {
      strictMode: config.strictMode !== false,
      defaultEffect: config.defaultEffect || 'allow',
      ...config,
    }
  }

  compile(policyDefinition) {
    if (!policyDefinition) throw new PolicyCompileError('Policy definition is required', {})

    if (typeof policyDefinition === 'string') {
      return this.#compileString(policyDefinition)
    }

    if (typeof policyDefinition === 'object') {
      return this.#compileObject(policyDefinition)
    }

    throw new PolicyCompileError('Policy definition must be a string or object', { type: typeof policyDefinition })
  }

  compileMany(definitions) {
    if (!Array.isArray(definitions)) throw new PolicyCompileError('Policy definitions must be an array', {})
    return definitions.map(def => this.compile(def))
  }

  #compileString(source) {
    try {
      const parsed = JSON.parse(source)
      return this.#compileObject(parsed)
    } catch {
      return this.#compileDSL(source)
    }
  }

  #compileDSL(source) {
    const policy = {
      name: '',
      description: '',
      type: 'rbac',
      effect: this.#config.defaultEffect,
      priority: 0,
      actions: [],
      resources: [],
      conditions: [],
      roles: [],
      scopes: [],
      reason: null,
    }

    const lines = source.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('#'))
    for (const line of lines) {
      if (line.startsWith('policy ')) policy.name = line.slice(7).trim()
      else if (line.startsWith('description ')) policy.description = line.slice(12).trim()
      else if (line.startsWith('effect ')) policy.effect = line.slice(7).trim()
      else if (line.startsWith('priority ')) policy.priority = parseInt(line.slice(9).trim(), 10) || 0
      else if (line.startsWith('allow ')) { policy.effect = 'allow'; policy.reason = line.slice(6).trim() || null }
      else if (line.startsWith('deny ')) { policy.effect = 'deny'; policy.reason = line.slice(5).trim() || null }
      else if (line.startsWith('action ')) policy.actions.push(line.slice(7).trim())
      else if (line.startsWith('resource ')) policy.resources.push(line.slice(9).trim())
      else if (line.startsWith('role ')) policy.roles.push(line.slice(5).trim())
      else if (line.startsWith('scope ')) policy.scopes.push(line.slice(6).trim())
    }

    if (!policy.name) throw new PolicyCompileError('Policy must have a name', { source: source.substring(0, 100) })
    return policy
  }

  #compileObject(obj) {
    const policy = {
      name: obj.name || '',
      description: obj.description || '',
      type: obj.type || 'rbac',
      effect: obj.effect || this.#config.defaultEffect,
      priority: obj.priority || 0,
      actions: Array.isArray(obj.actions) ? obj.actions : (obj.actions ? [obj.actions] : []),
      resources: Array.isArray(obj.resources) ? obj.resources : (obj.resources ? [obj.resources] : []),
      conditions: Array.isArray(obj.conditions) ? obj.conditions : [],
      roles: Array.isArray(obj.roles) ? obj.roles : (obj.roles ? [obj.roles] : []),
      scopes: Array.isArray(obj.scopes) ? obj.scopes : (obj.scopes ? [obj.scopes] : []),
      reason: obj.reason || null,
    }

    if (this.#config.strictMode && !policy.name) {
      throw new PolicyCompileError('Policy must have a name in strict mode', {})
    }

    if (policy.effect !== 'allow' && policy.effect !== 'deny') {
      throw new PolicyCompileError(`Policy effect must be "allow" or "deny", got "${policy.effect}"`, { name: policy.name })
    }

    return policy
  }

  validate(policy) {
    const errors = []
    if (!policy.name) errors.push('Policy name is required')
    if (policy.effect && !['allow', 'deny'].includes(policy.effect)) errors.push(`Invalid effect: "${policy.effect}"`)
    if (policy.priority && typeof policy.priority !== 'number') errors.push('Priority must be a number')
    if (policy.actions && !Array.isArray(policy.actions)) errors.push('Actions must be an array')
    if (policy.conditions && !Array.isArray(policy.conditions)) errors.push('Conditions must be an array')
    if (policy.roles && !Array.isArray(policy.roles)) errors.push('Roles must be an array')
    return { valid: errors.length === 0, errors }
  }

  supports(feature) {
    const features = ['json', 'dsl', 'validation', 'compile', 'compile-many']
    return features.includes(feature)
  }
}

export default PolicyCompiler
