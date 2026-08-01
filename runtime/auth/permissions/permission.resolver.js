import { PermissionRegistry } from './permission.registry.js'
import { PermissionDeniedError } from '../authorization/authorization.errors.js'
import { AUTHORIZATION_EVENTS, createAuthorizationEvent } from '../authorization/authorization.events.js'

export class PermissionResolver {
  #registry = null
  #roleManager = null
  #scopeManager = null
  #eventBus = null
  #config = {}

  constructor(roleManager, scopeManager, config = {}) {
    this.#registry = new PermissionRegistry(config)
    this.#roleManager = roleManager
    this.#scopeManager = scopeManager
    this.#config = {
      wildcardEnabled: config.wildcardEnabled !== false,
      prefixMatching: config.prefixMatching !== false,
      denyOverride: config.denyOverride !== false,
      ...config,
    }
  }

  get registry() { return this.#registry }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async resolve(identity, action, resource, context) {
    const roles = identity?.roles || context?.roles || []
    const identityPermissions = identity?.permissions || context?.permissions || []

    const rolePermissions = this.#resolveRolePermissions(roles, action, resource)
    const directPermissions = this.#matchPermissions(identityPermissions, action, resource)

    const effectivePermissions = this.#mergePermissions([...rolePermissions, ...directPermissions])

    const explicitDeny = effectivePermissions.find(p => p.effect === 'deny')
    if (explicitDeny) {
      return { denied: true, reason: explicitDeny.reason || 'denied_by_permission', permission: explicitDeny.name }
    }

    const explicitAllow = effectivePermissions.find(p => p.effect === 'allow')
    if (explicitAllow) {
      return { denied: false, permission: explicitAllow.name }
    }

    if (this.#config.denyOverride) {
      return { denied: true, reason: 'no_explicit_permission' }
    }

    return { denied: false, permission: null }
  }

  async explain(identity, action, resource, context) {
    const roles = identity?.roles || context?.roles || []
    const identityPermissions = identity?.permissions || context?.permissions || []

    const rolePermissions = this.#resolveRolePermissions(roles, action, resource)
    const directPermissions = this.#matchPermissions(identityPermissions, action, resource)
    const effectivePermissions = this.#mergePermissions([...rolePermissions, ...directPermissions])

    return {
      roles,
      rolePermissions: rolePermissions.map(p => ({ name: p.name, effect: p.effect })),
      directPermissions: directPermissions.map(p => ({ name: p.name, effect: p.effect })),
      effectivePermissions: effectivePermissions.map(p => ({ name: p.name, effect: p.effect })),
      resolution: effectivePermissions.length > 0 ? effectivePermissions[0].effect : 'none',
    }
  }

  grant(identityId, permission, options = {}) {
    this.#registry.grant(identityId, permission, options)
    this.#emit(AUTHORIZATION_EVENTS.PERMISSION_GRANTED, { identityId, permission, ...options })
  }

  revoke(identityId, permission) {
    this.#registry.revoke(identityId, permission)
    this.#emit(AUTHORIZATION_EVENTS.PERMISSION_REVOKED, { identityId, permission })
  }

  list(identityId) {
    return this.#registry.list(identityId)
  }

  has(identityId, permission) {
    return this.#registry.has(identityId, permission)
  }

  async health() {
    return {
      status: 'healthy',
      registeredPermissions: this.#registry.count(),
      timestamp: Date.now(),
    }
  }

  available() { return true }

  supports(feature) {
    const features = ['resolve', 'explain', 'grant', 'revoke', 'list', 'has', 'wildcard', 'prefix-matching', 'deny-override', 'role-permissions', 'direct-permissions', 'inheritance']
    return features.includes(feature)
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuthorizationEvent(event, data))
    }
  }

  #resolveRolePermissions(roles, action, resource) {
    const permissions = []
    for (const roleName of roles) {
      const role = this.#roleManager?.resolve(roleName)
      if (!role) continue
      for (const perm of (role.permissions || [])) {
        if (this.#matchPermission(perm, action, resource)) {
          permissions.push({ name: perm, effect: 'allow', source: `role:${roleName}` })
        }
      }
      const inherited = this.#roleManager?.getInheritedPermissions(roleName) || []
      for (const perm of inherited) {
        if (this.#matchPermission(perm, action, resource)) {
          permissions.push({ name: perm, effect: 'allow', source: `inherited:${roleName}` })
        }
      }
    }
    return permissions
  }

  #matchPermissions(permissions, action, resource) {
    return permissions
      .filter(p => this.#matchPermission(p, action, resource))
      .map(p => ({ name: p, effect: 'allow', source: 'direct' }))
  }

  #matchPermission(permission, action, resource) {
    if (permission === '*') return true
    if (permission === action) return true
    if (this.#config.wildcardEnabled && permission.endsWith(':*')) {
      const prefix = permission.slice(0, -2)
      return action.startsWith(prefix)
    }
    if (this.#config.prefixMatching && permission.includes(':')) {
      const [permAction] = permission.split(':')
      const [reqAction] = action.split(':')
      return permAction === reqAction
    }
    return false
  }

  #mergePermissions(permissions) {
    if (this.#config.denyOverride) {
      const denies = permissions.filter(p => p.effect === 'deny')
      if (denies.length > 0) return denies
    }
    return permissions
  }
}

export default PermissionResolver
