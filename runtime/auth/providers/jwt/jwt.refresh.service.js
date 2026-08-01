import crypto from 'crypto'
import { JwtKeyManager } from './jwt.key.manager.js'
import { JwtExpiredError, JwtRevokedError, JwtReuseDetectedError } from './jwt.errors.js'

const DEFAULT_REFRESH_TTL = 604800
const TOKEN_LENGTH = 48
const MAX_FAMILY_SIZE = 5

export class JwtRefreshService {
  #keyManager = null
  #families = new Map()
  #revokedTokens = new Set()
  #config = {}
  #eventBus = null

  constructor(keyManager, config = {}) {
    this.#keyManager = keyManager
    this.#config = {
      refreshTokenTTL: config.refreshTokenTTL || DEFAULT_REFRESH_TTL,
      tokenLength: config.tokenLength || TOKEN_LENGTH,
      maxFamilySize: config.maxFamilySize || MAX_FAMILY_SIZE,
      reuseDetection: config.reuseDetection !== false,
      rotationEnabled: config.rotationEnabled !== false,
      ...config,
    }
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  issue(identityId, options = {}) {
    const familyId = options.familyId || this.#generateFamilyId(identityId)
    const token = this.#generateToken()
    const expiresAt = Math.floor(Date.now() / 1000) + (options.ttl || this.#config.refreshTokenTTL)

    const family = this.#families.get(familyId) || this.#createFamily(identityId, familyId, options)

    const entry = {
      token: this.#hashToken(token),
      familyId,
      identityId,
      issuedAt: Date.now(),
      expiresAt: expiresAt * 1000,
      deviceId: options.deviceId || null,
      sessionId: options.sessionId || null,
      rotated: false,
      revoked: false,
    }

    family.tokens.push(entry)
    family.updatedAt = Date.now()
    this.#families.set(familyId, family)

    return { token, familyId, expiresAt: new Date(expiresAt * 1000).toISOString() }
  }

  verify(tokenString, options = {}) {
    const hash = this.#hashToken(tokenString)

    for (const [familyId, family] of this.#families) {
      for (const entry of family.tokens) {
        if (entry.token === hash) {
          if (entry.revoked) {
            throw new JwtRevokedError('Refresh token has been revoked', { familyId })
          }
          if (entry.rotated) {
            if (this.#config.reuseDetection) {
              this.#revokeFamily(familyId, 'reuse_detected')
              throw new JwtReuseDetectedError('Refresh token reuse detected — family revoked', { familyId })
            }
            throw new JwtRevokedError('Refresh token has been rotated', { familyId })
          }
          if (Date.now() > entry.expiresAt) {
            throw new JwtExpiredError('Refresh token has expired', { familyId })
          }
          return { valid: true, familyId, identityId: entry.identityId, sessionId: entry.sessionId, deviceId: entry.deviceId }
        }
      }
    }

    throw new JwtRevokedError('Refresh token not found', {})
  }

  rotate(tokenString, options = {}) {
    const verified = this.verify(tokenString)
    const hash = this.#hashToken(tokenString)

    const family = this.#families.get(verified.familyId)
    if (!family) throw new JwtRevokedError('Refresh token family not found', {})

    for (const entry of family.tokens) {
      if (entry.token === hash) {
        entry.rotated = true
        break
      }
    }

    return this.issue(verified.identityId, {
      familyId: verified.familyId,
      deviceId: options.deviceId || verified.deviceId,
      sessionId: options.sessionId || verified.sessionId,
    })
  }

  revoke(tokenString) {
    const hash = this.#hashToken(tokenString)
    for (const [, family] of this.#families) {
      for (const entry of family.tokens) {
        if (entry.token === hash) {
          entry.revoked = true
          this.#revokedTokens.add(hash)
          this.#revokedTokens = new Set(Array.from(this.#revokedTokens).slice(-50000))
          return true
        }
      }
    }
    return false
  }

  revokeAll(identityId) {
    let count = 0
    for (const [, family] of this.#families) {
      if (family.identityId === identityId) {
        for (const entry of family.tokens) {
          entry.revoked = true
          this.#revokedTokens.add(entry.token)
          count++
        }
      }
    }
    this.#revokedTokens = new Set(Array.from(this.#revokedTokens).slice(-50000))
    return count
  }

  revokeDevice(identityId, deviceId) {
    let count = 0
    for (const [, family] of this.#families) {
      if (family.identityId === identityId) {
        for (const entry of family.tokens) {
          if (entry.deviceId === deviceId && !entry.revoked) {
            entry.revoked = true
            this.#revokedTokens.add(entry.token)
            count++
          }
        }
      }
    }
    this.#revokedTokens = new Set(Array.from(this.#revokedTokens).slice(-50000))
    return count
  }

  listFamilies(identityId) {
    const result = []
    for (const [familyId, family] of this.#families) {
      if (family.identityId === identityId) {
        result.push({
          familyId,
          identityId: family.identityId,
          tokenCount: family.tokens.length,
          activeCount: family.tokens.filter(t => !t.revoked && !t.rotated).length,
          createdAt: family.createdAt,
          updatedAt: family.updatedAt,
          deviceId: family.deviceId,
        })
      }
    }
    return result
  }

  health() {
    return {
      status: 'healthy',
      activeFamilies: this.#families.size,
      totalTokens: Array.from(this.#families.values()).reduce((sum, f) => sum + f.tokens.length, 0),
      revokedTokens: this.#revokedTokens.size,
      timestamp: Date.now(),
    }
  }

  available() {
    return true
  }

  supports(feature) {
    const features = ['issue', 'verify', 'rotate', 'revoke', 'family', 'reuse-detection', 'rotation', 'expiration', 'device-scoped', 'list-families']
    return features.includes(feature)
  }

  #generateToken() {
    return crypto.randomBytes(this.#config.tokenLength).toString('base64url')
  }

  #hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  #generateFamilyId(identityId) {
    const raw = `${identityId}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32)
  }

  #createFamily(identityId, familyId, options) {
    return {
      familyId,
      identityId,
      tokens: [],
      deviceId: options.deviceId || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  #revokeFamily(familyId, reason) {
    const family = this.#families.get(familyId)
    if (!family) return
    for (const entry of family.tokens) {
      entry.revoked = true
      this.#revokedTokens.add(entry.token)
    }
  }
}

export default JwtRefreshService
