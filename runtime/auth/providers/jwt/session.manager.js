import crypto from 'crypto'
import { JwtSessionExpiredError, JwtError } from './jwt.errors.js'

const SESSION_ID_LENGTH = 32
const DEFAULT_TIMEOUT = 1800
const DEFAULT_IDLE_TIMEOUT = 900
const REMEMBER_ME_TTL = 2592000

export class SessionManager {
  #sessions = new Map()
  #config = {}
  #eventBus = null

  constructor(config = {}) {
    this.#config = {
      sessionTimeout: config.sessionTimeout || DEFAULT_TIMEOUT,
      idleTimeout: config.idleTimeout || DEFAULT_IDLE_TIMEOUT,
      rememberMeTTL: config.rememberMeTTL || REMEMBER_ME_TTL,
      maxConcurrentSessions: config.maxConcurrentSessions || 10,
      allowMultipleDevices: config.allowMultipleDevices !== false,
      ...config,
    }
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  create(identityId, options = {}) {
    const now = Date.now()
    const ttl = options.rememberMe ? this.#config.rememberMeTTL : (options.ttl || this.#config.sessionTimeout)

    const session = {
      id: this.#generateSessionId(),
      identityId,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + (ttl * 1000),
      lastActivity: now,
      status: 'active',
      deviceId: options.deviceId || null,
      deviceName: options.deviceName || null,
      fingerprint: options.fingerprint || null,
      ip: options.ip || null,
      userAgent: options.userAgent || null,
      rememberMe: options.rememberMe || false,
      tenantId: options.tenantId || null,
      destinationId: options.destinationId || null,
      metadata: options.metadata || {},
    }

    this.#enforceConcurrentLimit(identityId)
    this.#sessions.set(session.id, session)

    return session
  }

  restore(sessionId) {
    const session = this.#sessions.get(sessionId)
    if (!session) return null

    if (session.status === 'revoked') {
      throw new JwtSessionExpiredError('Session has been revoked', { sessionId })
    }

    if (Date.now() > session.expiresAt) {
      session.status = 'expired'
      return null
    }

    session.updatedAt = Date.now()
    session.lastActivity = Date.now()
    return session
  }

  extend(sessionId, ttl) {
    const session = this.#sessions.get(sessionId)
    if (!session || session.status !== 'active') return false
    session.expiresAt = Date.now() + (ttl * 1000)
    session.updatedAt = Date.now()
    return true
  }

  touch(sessionId) {
    const session = this.#sessions.get(sessionId)
    if (!session || session.status !== 'active') return false
    const now = Date.now()
    if (now - session.lastActivity > (this.#config.idleTimeout * 1000)) {
      session.status = 'expired'
      return false
    }
    session.lastActivity = now
    session.updatedAt = now
    return true
  }

  revoke(sessionId) {
    const session = this.#sessions.get(sessionId)
    if (!session) return false
    session.status = 'revoked'
    session.updatedAt = Date.now()
    return true
  }

  revokeAll(identityId, excludeSessionId = null) {
    let count = 0
    for (const [, session] of this.#sessions) {
      if (session.identityId === identityId && session.id !== excludeSessionId && session.status === 'active') {
        session.status = 'revoked'
        session.updatedAt = Date.now()
        count++
      }
    }
    return count
  }

  revokeDevice(identityId, deviceId) {
    let count = 0
    for (const [, session] of this.#sessions) {
      if (session.identityId === identityId && session.deviceId === deviceId && session.status === 'active') {
        session.status = 'revoked'
        session.updatedAt = Date.now()
        count++
      }
    }
    return count
  }

  list(identityId) {
    return Array.from(this.#sessions.values())
      .filter(s => s.identityId === identityId && s.status === 'active')
      .map(s => ({
        id: s.id,
        deviceId: s.deviceId,
        deviceName: s.deviceName,
        createdAt: s.createdAt,
        lastActivity: s.lastActivity,
        expiresAt: s.expiresAt,
        rememberMe: s.rememberMe,
        ip: s.ip,
        userAgent: s.userAgent,
      }))
  }

  get(sessionId) {
    const session = this.#sessions.get(sessionId)
    if (!session || session.status !== 'active') return null
    return { ...session }
  }

  cleanup() {
    const now = Date.now()
    let expired = 0
    for (const [id, session] of this.#sessions) {
      if (now > session.expiresAt || session.status === 'expired' || session.status === 'revoked') {
        this.#sessions.delete(id)
        expired++
      }
    }
    return expired
  }

  health() {
    const now = Date.now()
    const active = Array.from(this.#sessions.values()).filter(s => s.status === 'active' && now < s.expiresAt).length
    return {
      status: 'healthy',
      activeSessions: active,
      totalSessions: this.#sessions.size,
      maxConcurrent: this.#config.maxConcurrentSessions,
      timestamp: Date.now(),
    }
  }

  available() {
    return true
  }

  supports(feature) {
    const features = ['create', 'restore', 'extend', 'revoke', 'revoke-all', 'revoke-device', 'list', 'touch', 'cleanup', 'remember-me', 'concurrent', 'idle-timeout', 'device-scoped']
    return features.includes(feature)
  }

  #generateSessionId() {
    return crypto.randomBytes(SESSION_ID_LENGTH).toString('hex')
  }

  #enforceConcurrentLimit(identityId) {
    const active = Array.from(this.#sessions.values())
      .filter(s => s.identityId === identityId && s.status === 'active' && Date.now() < s.expiresAt)

    if (active.length >= this.#config.maxConcurrentSessions) {
      active.sort((a, b) => a.lastActivity - b.lastActivity)
      const oldest = active[0]
      if (oldest) {
        oldest.status = 'revoked'
      }
    }
  }
}

export default SessionManager
