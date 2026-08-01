export class JwtClaimsMapper {
  #config = {}

  constructor(config = {}) {
    this.#config = {
      issuer: config.issuer || 'valdi-engine',
      audience: config.audience || 'valdi-platform',
      subjectPrefix: config.subjectPrefix || 'identity:',
      ...config,
    }
  }

  toClaims(identity, options = {}) {
    const now = Math.floor(Date.now() / 1000)
    const claims = {
      sub: `${this.#config.subjectPrefix}${identity.id}`,
      iss: this.#config.issuer,
      aud: this.#config.audience,
      iat: now,
      jti: options.jti || this.#generateJti(),
    }

    if (options.expiresIn) {
      claims.exp = now + options.expiresIn
    }
    if (options.nbf) {
      claims.nbf = now + options.nbf
    }

    if (identity.email) claims.email = identity.email
    if (identity.name) claims.name = identity.name

    if (identity.tenant) {
      claims.tid = identity.tenant.id || identity.tenant
      claims.ten = identity.tenant.name || identity.tenant
    }
    if (identity.destination) {
      claims.dst = identity.destination.id || identity.destination
    }

    if (options.includeRoles !== false && identity.roles) {
      claims.roles = identity.roles
    }
    if (options.includePermissions !== false && identity.permissions) {
      claims.permissions = identity.permissions
    }
    if (options.includeScopes && identity.scopes) {
      claims.scopes = identity.scopes
    }
    if (options.includeLocale && identity.locale) {
      claims.locale = identity.locale
    }

    if (options.sessionId) {
      claims.sid = options.sessionId
    }
    if (options.deviceId) {
      claims.did = options.deviceId
    }
    if (identity.trustLevel !== undefined) {
      claims.trl = identity.trustLevel
    }
    if (identity.authMethod) {
      claims.amr = [identity.authMethod]
    }

    if (options.customClaims) {
      for (const [key, value] of Object.entries(options.customClaims)) {
        if (!(key in claims)) {
          claims[key] = value
        }
      }
    }

    return claims
  }

  toIdentity(claims) {
    if (!claims || !claims.sub) return null

    const identity = {
      id: claims.sub.replace(this.#config.subjectPrefix, ''),
      email: claims.email || null,
      name: claims.name || null,
      tenant: claims.tid ? { id: claims.tid, name: claims.ten || claims.tid } : null,
      destination: claims.dst ? { id: claims.dst } : null,
      roles: claims.roles || [],
      permissions: claims.permissions || [],
      scopes: claims.scopes || [],
      locale: claims.locale || null,
      trustLevel: claims.trl || null,
      authMethod: claims.amr ? claims.amr[0] : null,
    }

    return {
      identity,
      session: claims.sid ? { id: claims.sid } : null,
      device: claims.did ? { id: claims.did } : null,
      jti: claims.jti,
      issuedAt: claims.iat ? new Date(claims.iat * 1000).toISOString() : null,
      expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : null,
    }
  }

  #generateJti() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let jti = ''
    for (let i = 0; i < 24; i++) {
      jti += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return jti
  }

  supports(feature) {
    const features = ['roles', 'permissions', 'scopes', 'tenant', 'destination', 'device', 'session', 'locale', 'trust', 'custom-claims', 'amr', 'jti']
    return features.includes(feature)
  }
}

export default JwtClaimsMapper
