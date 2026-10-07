import { JwtKeyManager } from './jwt.key.manager.js'
import { JwtClaimsMapper } from './jwt.claims.mapper.js'
import { JwtAccessService } from './jwt.access.service.js'
import { JwtRefreshService } from './jwt.refresh.service.js'
import { SessionManager } from './session.manager.js'
import { JwtCookieService } from './jwt.cookie.service.js'
import { JwtHeaderService } from './jwt.header.service.js'
import { DeviceManager } from './device.manager.js'
import { IdentityCache } from './identity.cache.js'
import { JWT_EVENTS, createJwtEvent } from './jwt.events.js'
import { JwtError, JwtExpiredError, JwtConfigurationError, JwtPermissionError, JwtSessionExpiredError, JwtInvalidSignatureError, JwtMalformedError, JwtRevokedError } from './jwt.errors.js'

/**
 * CANCEL-TIMEOUT-REMEDIATION-2: closed vocabulary for a refused bearer token.
 *
 * Kept local to this module on purpose — `runtime/auth` must not depend on the
 * its own frozen enum, so an unrecognised member degrades to `reasonClass: null`
 * rather than leaking anything.
 */
export const AUTH_REJECTION_REASONS = Object.freeze([
  'EXPIRED',
  'INVALID_SIGNATURE',
  'MALFORMED',
  'REVOKED',
  'NOT_CONFIGURED',
  'OTHER_REJECTED',
])

/**
 * Map a verification failure to a bounded reason class using only the error's
 * TYPE. The message is never read: `jsonwebtoken` messages can quote expected
 * issuer/audience values, and this runs on the request auth path.
 *
 * Note that `jwt.access.service.js` already folds every `JsonWebTokenError` into
 * `JwtInvalidSignatureError`, so an issuer or audience mismatch is reported as
 * `INVALID_SIGNATURE`. Separating those would require a new error type in
 * `jwt.access.service.js`, which is out of scope for this slice; the class is
 * still sufficient to separate the two live candidates, because an expired token
 * and a wrong secret raise different types here.
 *
 * @param {unknown} error
 * @returns {string} one of `AUTH_REJECTION_REASONS`
 */
function classifyJwtRejection(error) {
  switch (error?.name) {
    case 'JwtExpiredError':
      return 'EXPIRED'
    case 'JwtInvalidSignatureError':
      return 'INVALID_SIGNATURE'
    case 'JwtRevokedError':
      return 'REVOKED'
    case 'JwtConfigurationError':
      return 'NOT_CONFIGURED'
    case 'JwtMalformedError':
      return 'MALFORMED'
    default:
      return 'OTHER_REJECTED'
  }
}

export class JwtProvider {
  #keyManager = null
  #claimsMapper = null
  #accessService = null
  #refreshService = null
  #sessionManager = null
  #cookieService = null
  #headerService = null
  #deviceManager = null
  #identityCache = null
  #eventBus = null
  #config = {}
  #initialized = false

  constructor(config = {}) {
    this.#config = {
      issuer: config.issuer || 'valdi-engine',
      audience: config.audience || 'valdi-platform',
      accessTokenTTL: config.accessTokenTTL || 900,
      refreshTokenTTL: config.refreshTokenTTL || 604800,
      sessionTimeout: config.sessionTimeout || 1800,
      idleTimeout: config.idleTimeout || 900,
      algorithm: config.algorithm || 'HS256',
      maxConcurrentSessions: config.maxConcurrentSessions || 10,
      cacheTTL: config.cacheTTL || 300000,
      ...config,
    }
  }

  get keyManager() { return this.#keyManager }
  get accessService() { return this.#accessService }
  get refreshService() { return this.#refreshService }
  get sessionManager() { return this.#sessionManager }
  get cookieService() { return this.#cookieService }
  get headerService() { return this.#headerService }
  get deviceManager() { return this.#deviceManager }
  get identityCache() { return this.#identityCache }
  get initialized() { return this.#initialized }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#accessService?.setEventBus(eventBus)
    this.#refreshService?.setEventBus(eventBus)
    this.#sessionManager?.setEventBus(eventBus)
    this.#deviceManager?.setEventBus(eventBus)
  }

  async initialize() {
    if (this.#initialized) return

    this.#keyManager = new JwtKeyManager(this.#config)
    this.#claimsMapper = new JwtClaimsMapper(this.#config)
    this.#accessService = new JwtAccessService(this.#keyManager, this.#claimsMapper, this.#config)
    this.#refreshService = new JwtRefreshService(this.#keyManager, this.#config)
    this.#sessionManager = new SessionManager(this.#config)
    this.#cookieService = new JwtCookieService(this.#config)
    this.#headerService = new JwtHeaderService(this.#config)
    this.#deviceManager = new DeviceManager(this.#config)
    this.#identityCache = new IdentityCache(this.#config)

    if (this.#eventBus) {
      this.#accessService.setEventBus(this.#eventBus)
      this.#refreshService.setEventBus(this.#eventBus)
      this.#sessionManager.setEventBus(this.#eventBus)
      this.#deviceManager.setEventBus(this.#eventBus)
    }

    this.#initialized = true
  }

  async shutdown() {
    this.#identityCache.invalidateAll()
    this.#sessionManager.cleanup()
    this.#initialized = false
  }

  async dispose() {
    this.#identityCache.invalidateAll()
    this.#initialized = false
  }

  async login(credentials) {
    this.#checkInitialized()

    const { identityId, identity, tenant, permissions, roles, trustLevel, deviceFingerprint, deviceInfo, ip, userAgent, rememberMe } = credentials
    if (!identityId && !identity) {
      throw new JwtPermissionError('Identity is required for login', {})
    }

    const id = identityId || identity.id
    const identityData = identity || { id: identityId, tenant, permissions, roles, trustLevel }
    const now = Date.now()

    let device = null
    let deviceResult = null
    if (deviceFingerprint) {
      deviceResult = this.#deviceManager.register(id, deviceFingerprint, { ...deviceInfo, ip, userAgent })
      device = deviceResult.device
      if (!deviceResult.known) {
        this.#emit(JWT_EVENTS.JWT_DEVICE_TRUSTED, { identityId: id, deviceId: device.id })
      }
    }

    const session = this.#sessionManager.create(id, { deviceId: device?.id || null, ip, userAgent, rememberMe, tenantId: tenant?.id || null })
    this.#emit(JWT_EVENTS.JWT_SESSION_CREATED, { sessionId: session.id, identityId: id })

    const refreshResult = this.#refreshService.issue(id, { deviceId: device?.id || null, sessionId: session.id })
    this.#emit(JWT_EVENTS.JWT_LOGIN, { identityId: id, sessionId: session.id })

    const accessResult = this.#accessService.issue(identityData, { sessionId: session.id, deviceId: device?.id || null })

    this.#identityCache.set(`identity:${id}`, identityData)
    this.#identityCache.set(`permissions:${id}`, permissions || [])
    this.#identityCache.set(`roles:${id}`, roles || [])
    if (trustLevel !== undefined) this.#identityCache.set(`trust:${id}`, trustLevel)

    return {
      identity: identityData,
      session: { id: session.id, type: rememberMe ? 'remember_me' : 'standard', status: 'active', createdAt: session.createdAt, expiresAt: session.expiresAt },
      device: device ? { id: device.id, trusted: device.trusted } : null,
      permissions: permissions || [],
      roles: roles || [],
      trust: trustLevel !== undefined ? { level: trustLevel } : null,
      tenant: tenant || null,
      tokens: {
        accessToken: accessResult.token,
        refreshToken: refreshResult.token,
        expiresIn: this.#config.accessTokenTTL,
      },
      cookies: {
        access: this.#cookieService.createAccessCookie(accessResult.token, { domain: tenant?.domain }),
        refresh: this.#cookieService.createRefreshCookie(refreshResult.token, { domain: tenant?.domain }),
      },
    }
  }

  async logout(session) {
    this.#checkInitialized()
    if (!session?.id) return

    this.#sessionManager.revoke(session.id)
    this.#emit(JWT_EVENTS.JWT_LOGOUT, { sessionId: session.id })

    return { revoked: true }
  }

  async refresh(refreshTokenString, options = {}) {
    this.#checkInitialized()

    const verified = this.#refreshService.verify(refreshTokenString)
    const rotation = this.#refreshService.rotate(refreshTokenString, { deviceId: options.deviceId, sessionId: verified.sessionId })
    this.#emit(JWT_EVENTS.JWT_TOKEN_ROTATED, { familyId: verified.familyId })

    const cachedIdentity = this.#identityCache.get(`identity:${verified.identityId}`)
    const identity = cachedIdentity || { id: verified.identityId }

    const session = verified.sessionId ? this.#sessionManager.restore(verified.sessionId) : null
    if (verified.sessionId && !session) {
      this.#refreshService.revokeAll(verified.identityId)
      throw new JwtSessionExpiredError('Session expired — all refresh tokens revoked', { identityId: verified.identityId })
    }

    if (session) {
      this.#sessionManager.extend(verified.sessionId, this.#config.sessionTimeout)
    }

    const accessResult = this.#accessService.issue(identity, { sessionId: verified.sessionId, deviceId: verified.deviceId })
    this.#emit(JWT_EVENTS.JWT_REFRESH, { identityId: verified.identityId })

    return {
      identity,
      session: session ? { id: session.id, status: session.status } : null,
      tokens: {
        accessToken: accessResult.token,
        refreshToken: rotation.token,
        expiresIn: this.#config.accessTokenTTL,
      },
      cookies: {
        access: this.#cookieService.createAccessCookie(accessResult.token),
        refresh: this.#cookieService.createRefreshCookie(rotation.token),
      },
    }
  }

  async authenticate(tokenString) {

    try {
      this.#checkInitialized()
      const result = this.#accessService.verify(tokenString)

      return {
        authenticated: true,
        identity: result.identity,
        session: result.session,
        device: result.device,
        reason: null,
      }
    } catch (error) {
      // CANCEL-TIMEOUT-REMEDIATION-2: classify by error TYPE, never by message.
      //
      // Before this slice every failure was flattened into `identity: null` with
      // nothing to tell the caller apart, so an expired token and a signature
      // mismatch were indistinguishable — and both were then silently downgraded
      // to an anonymous request by the API layer. `reason` is drawn from a closed
      // enum derived from the error classes `jwt.errors.js` already raises.
      //
      // `error.message` is deliberately NOT read, and no raw error is returned or
      // logged: a jsonwebtoken message can carry expected-claim values, and this
      // object is on the request path where a token must never travel.
      const reason = classifyJwtRejection(error)

      return {
        authenticated: false,
        identity: null,
        session: null,
        device: null,
        reason,
      }
    }
  }

  async userinfo(tokenString) {
    this.#checkInitialized()
    const result = this.#accessService.verify(tokenString)
    const identityId = result.identity?.id
    if (!identityId) return null

    const cached = this.#identityCache.get(`identity:${identityId}`)
    const permissions = this.#identityCache.get(`permissions:${identityId}`) || result.identity.permissions
    const roles = this.#identityCache.get(`roles:${identityId}`) || result.identity.roles
    const trustLevel = this.#identityCache.get(`trust:${identityId}`)

    return {
      ...result.identity,
      permissions,
      roles,
      trustLevel: trustLevel || result.identity.trustLevel,
      sub: result.identity.id,
    }
  }

  async jwks() {
    return { keys: this.#keyManager.jwks() }
  }

  async health() {
    try {
      const accessHealth = this.#accessService.health()
      const refreshHealth = this.#refreshService.health()
      const sessionHealth = this.#sessionManager.health()
      const deviceHealth = this.#deviceManager.health()
      const cacheStats = this.#identityCache.getStats()

      const statuses = [accessHealth.status, refreshHealth.status, sessionHealth.status, deviceHealth.status]
      const overall = statuses.every(s => s === 'healthy') ? 'healthy' : 'degraded'

      return {
        status: overall,
        provider: 'jwt',
        version: '1.0.0',
        components: {
          access: accessHealth,
          refresh: refreshHealth,
          session: sessionHealth,
          device: deviceHealth,
        },
        cache: cacheStats,
        timestamp: Date.now(),
      }
    } catch (err) {
      // `err.message` is never surfaced. A JWT failure message can echo claim
      // or token material, and this response is caller-visible.
      return {
        status: 'unhealthy',
        provider: 'jwt',
        errorClass: typeof err?.name === 'string' ? err.name : 'UNKNOWN',
        timestamp: Date.now(),
      }
    }
  }

  supports(feature) {
    const features = ['login', 'logout', 'refresh', 'userinfo', 'jwks', 'access-token', 'refresh-token', 'token-family', 'reuse-detection', 'token-rotation', 'session-management', 'remember-me', 'concurrent-sessions', 'device-trust', 'fingerprint', 'offline-trust', 'cookie', 'header', 'claims-mapping', 'identity-cache']
    return features.includes(feature)
  }

  #checkInitialized() {
    if (!this.#initialized) throw new JwtConfigurationError('JwtProvider is not initialized', {})
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createJwtEvent(event, data))
    }
  }
}

export default JwtProvider
