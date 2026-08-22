/**
 * Dependency Resolver
 *
 * P15.8.2 - Capability Registry & Composition Architecture
 *
 * Resolves dependencies for capabilities and validates dependency graphs.
 * Framework-free implementation.
 */

export class DependencyResolver {
  #registry
  #validator

  constructor(registry, validator) {
    this.#registry = registry
    this.#validator = validator
  }

  resolve(capabilityNames, options = {}) {
    const {
      includeOptional = true,
      failOnMissing = true,
      failOnCircular = true
    } = options

    const resolved = new Map()
    const missing = []
    const circular = []

    const resolve = (name, path = new Set()) => {
      if (resolved.has(name)) {
        return
      }

      if (path.has(name)) {
        circular.push([...path, name].join(' -> '))
        if (failOnCircular) {
          return
        }
      }

      const capability = this.#registry.get(name)
      if (!capability) {
        missing.push(name)
        if (failOnMissing) {
          return
        }
      }

      if (capability) {
        path.add(name)

        for (const dep of capability.dependencies) {
          resolve(dep, path)
        }

        if (includeOptional) {
          for (const dep of capability.optionalDependencies) {
            if (!resolved.has(dep) && this.#registry.has(dep)) {
              resolve(dep, path)
            }
          }
        }

        path.delete(name)
        resolved.set(name, { ...capability })
      }
    }

    for (const name of capabilityNames) {
      resolve(name)
    }

    return {
      resolved: Array.from(resolved.values()),
      missing: [...new Set(missing)],
      circular: [...new Set(circular)],
      isValid: missing.length === 0 && circular.length === 0
    }
  }

  resolveForApplicationType(applicationType, capabilityNames) {
    const graphValidation = this.#validator.validateDependencyGraph(capabilityNames)
    if (!graphValidation.valid) {
      return {
        resolved: [],
        missing: [],
        circular: graphValidation.errors,
        isValid: false
      }
    }

    const filtered = capabilityNames.filter(name => {
      const capability = this.#registry.get(name)
      if (!capability) return false
      return capability.compatibleApplicationTypes.includes(applicationType)
    })

    return this.resolve(filtered, { includeOptional: true, failOnMissing: true, failOnCircular: true })
  }

  getDependencyTree(capabilityName) {
    const capability = this.#registry.get(capabilityName)
    if (!capability) {
      return null
    }

    const buildTree = (name, visited = new Set()) => {
      if (visited.has(name)) {
        return { name, circular: true }
      }

      visited.add(name)
      const cap = this.#registry.get(name)
      if (!cap) {
        return { name, missing: true }
      }

      return {
        name,
        version: cap.version,
        dependencies: cap.dependencies.map(dep => buildTree(dep, new Set(visited))),
        optionalDependencies: cap.optionalDependencies
          .filter(optName => this.#registry.has(optName))
          .map(optName => buildTree(optName, new Set(visited)))
      }
    }

    return buildTree(capabilityName)
  }
}

export function createDependencyResolver(registry, validator) {
  return new DependencyResolver(registry, validator)
}

export default {
  DependencyResolver,
  createDependencyResolver
}