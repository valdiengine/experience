export class PermissionRegistry {
  #grants = new Map()
  #initialized = false

  grant(identityId, permission, options = {}) {
    if (!this.#grants.has(identityId)) {
      this.#grants.set(identityId, new Map())
    }
    const identityPermissions = this.#grants.get(identityId)
    identityPermissions.set(permission, {
      permission,
      grantedAt: Date.now(),
      expiresAt: options.ttl ? Date.now() + (options.ttl * 1000) : null,
      grantedBy: options.grantedBy || null,
      scope: options.scope || null,
    })
  }

  revoke(identityId, permission) {
    const identityPermissions = this.#grants.get(identityId)
    if (identityPermissions) {
      identityPermissions.delete(permission)
    }
  }

  revokeAll(identityId) {
    this.#grants.delete(identityId)
  }

  list(identityId) {
    const identityPermissions = this.#grants.get(identityId)
    if (!identityPermissions) return []
    return Array.from(identityPermissions.values())
      .filter(p => !p.expiresAt || Date.now() < p.expiresAt)
      .map(p => p.permission)
  }

  has(identityId, permission) {
    const identityPermissions = this.#grants.get(identityId)
    if (!identityPermissions) return false
    const entry = identityPermissions.get(permission)
    if (!entry) return false
    if (entry.expiresAt && Date.now() >= entry.expiresAt) {
      identityPermissions.delete(permission)
      return false
    }
    return true
  }

  count() {
    let total = 0
    for (const [, permissions] of this.#grants) {
      total += permissions.size
    }
    return total
  }

  initialize() { this.#initialized = true }
  get initialized() { return this.#initialized }
}

export default PermissionRegistry
