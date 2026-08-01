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
import { JwtError, JwtExpiredError, JwtConfigurationError, JwtPermissionError, JwtSessionExpiredError } from './jwt.errors.js'

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
    this.#checkInitialized()
    const result = this.#accessService.verify(tokenString)
    return {
      authenticated: true,
      identity: result.identity,
      session: result.session,
      device: result.device,
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
      return { status: 'unhealthy', provider: 'jwt', error: err.message, timestamp: Date.now() }
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
