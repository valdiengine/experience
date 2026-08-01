import jwt from 'jsonwebtoken'
import { JwtKeyManager } from './jwt.key.manager.js'
import { JwtClaimsMapper } from './jwt.claims.mapper.js'
import { JwtExpiredError, JwtInvalidSignatureError, JwtMalformedError, JwtRevokedError } from './jwt.errors.js'

const DEFAULT_ACCESS_TTL = 900

export class JwtAccessService {
  #keyManager = null
  #claimsMapper = null
  #revokedTokens = new Set()
  #config = {}
  #eventBus = null

  constructor(keyManager, claimsMapper, config = {}) {
    this.#keyManager = keyManager
    this.#claimsMapper = claimsMapper
    this.#config = {
      accessTokenTTL: config.accessTokenTTL || DEFAULT_ACCESS_TTL,
      issuer: config.issuer || 'valdi-engine',
      audience: config.audience || 'valdi-platform',
      includePermissionsInAccess: config.includePermissionsInAccess !== false,
      includeRolesInAccess: config.includeRolesInAccess !== false,
      ...config,
    }
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  issue(identity, options = {}) {
    const expiresIn = options.expiresIn || this.#config.accessTokenTTL
    const { key, algorithm } = this.#getSigningInfo(options.keyId)
    const kid = options.keyId || this.#keyManager.activeKeyId

    const claims = this.#claimsMapper.toClaims(identity, {
      expiresIn,
      sessionId: options.sessionId,
      deviceId: options.deviceId,
      includeRoles: this.#config.includeRolesInAccess,
      includePermissions: this.#config.includePermissionsInAccess,
      includeScopes: options.includeScopes,
      includeLocale: options.includeLocale,
      customClaims: options.customClaims,
      jti: options.jti,
    })

    const token = jwt.sign(claims, key, {
      algorithm: this.#keyManager.algorithm,
      keyid: kid,
      issuer: this.#config.issuer,
      audience: this.#config.audience,
      expiresIn,
    })

    return {
      token,
      claims,
      expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : null,
      keyId: kid,
    }
  }

  verify(tokenString, options = {}) {
    if (this.#revokedTokens.has(tokenString)) {
      throw new JwtRevokedError('Access token has been revoked', { token: tokenString.substring(0, 20) })
    }

    let decoded
    try {
      const verificationKey = this.#keyManager.getVerificationKey(options.keyId)
      decoded = jwt.verify(tokenString, verificationKey, {
        algorithms: [this.#keyManager.algorithm],
        issuer: this.#config.issuer,
        audience: this.#config.audience,
        ignoreExpiration: options.ignoreExpiration || false,
      })
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new JwtExpiredError('Access token has expired', { token: tokenString.substring(0, 20) })
      }
      if (err.name === 'JsonWebTokenError') {
        throw new JwtInvalidSignatureError('Access token signature is invalid', { token: tokenString.substring(0, 20) })
      }
      throw new JwtMalformedError(`Access token verification failed: ${err.message}`, { token: tokenString.substring(0, 20) })
    }

    const result = this.#claimsMapper.toIdentity(decoded)
    return { ...result, decoded }
  }

  decode(tokenString) {
    try {
      const decoded = jwt.decode(tokenString, { complete: true })
      if (!decoded) throw new JwtMalformedError('Unable to decode access token', { token: tokenString.substring(0, 20) })
      return decoded
    } catch (err) {
      if (err instanceof JwtMalformedError) throw err
      throw new JwtMalformedError(`Access token decode failed: ${err.message}`, { token: tokenString.substring(0, 20) })
    }
  }

  revoke(tokenString) {
    this.#revokedTokens.add(tokenString)
    this.#revokedTokens = new Set(Array.from(this.#revokedTokens).slice(-10000))
  }

  rotate(identity, options = {}) {
    const currentJti = options.jti
    const newJti = this.#claimsMapper.toClaims(identity, {}).jti
    return this.issue(identity, { ...options, jti: newJti, keyId: options.keyId })
  }

  health() {
    try {
      const kid = this.#keyManager.activeKeyId
      const { key } = this.#keyManager.getSigningKey(kid)
      return { status: key ? 'healthy' : 'degraded', activeKeys: this.#keyManager.getActiveKeys().length, revokedCount: this.#revokedTokens.size, timestamp: Date.now() }
    } catch {
      return { status: 'degraded', revokedCount: this.#revokedTokens.size, timestamp: Date.now() }
    }
  }

  available() {
    try {
      const kid = this.#keyManager.activeKeyId
      return !!this.#keyManager.getSigningKey(kid)
    } catch {
      return false
    }
  }

  supports(feature) {
    const features = ['issue', 'verify', 'decode', 'revoke', 'rotate', 'hs256', 'hs512', 'rs256', 'jti', 'kid', 'short-ttl', 'permissions', 'roles']
    return features.includes(feature)
  }

  #getSigningInfo(keyId) {
    const { key } = this.#keyManager.getSigningKey(keyId)
    return { key, algorithm: this.#keyManager.algorithm }
  }
}

export default JwtAccessService
