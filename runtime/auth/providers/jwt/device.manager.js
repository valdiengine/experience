import crypto from 'crypto'
import { JwtDeviceMismatchError } from './jwt.errors.js'

const DEFAULT_TRUST_EXPIRY = 2592000000
const FINGERPRINT_ENTROPY = 16

export class DeviceManager {
  #devices = new Map()
  #config = {}
  #eventBus = null

  constructor(config = {}) {
    this.#config = {
      trustExpiry: config.trustExpiry || DEFAULT_TRUST_EXPIRY,
      requireFingerprint: config.requireFingerprint !== false,
      maxDevicesPerIdentity: config.maxDevicesPerIdentity || 10,
      offlineTrustEnabled: config.offlineTrustEnabled !== false,
      offlineTrustMaxAge: config.offlineTrustMaxAge || 2592000000,
      ...config,
    }
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  register(identityId, fingerprint, options = {}) {
    const deviceId = this.#generateDeviceId()
    const now = Date.now()

    const device = {
      id: deviceId,
      identityId,
      fingerprint: this.#hashFingerprint(fingerprint),
      name: options.name || null,
      type: options.type || 'unknown',
      os: options.os || null,
      browser: options.browser || null,
      ip: options.ip || null,
      userAgent: options.userAgent || null,
      trustScore: options.initialTrust || 0,
      trusted: options.trusted || false,
      trustExpiresAt: options.trusted ? now + this.#config.trustExpiry : null,
      firstSeenAt: now,
      lastSeenAt: now,
      known: false,
      offlineTrusted: false,
      metadata: options.metadata || {},
    }

    const existing = this.#findByIdentityAndFingerprint(identityId, fingerprint)
    if (existing) {
      existing.lastSeenAt = now
      existing.known = true
      return { device: { ...existing }, known: true }
    }

    this.#enforceDeviceLimit(identityId)
    this.#devices.set(deviceId, device)

    return { device: { ...device }, known: false }
  }

  trust(deviceId, level) {
    const device = this.#devices.get(deviceId)
    if (!device) return false

    device.trustScore = Math.max(0, Math.min(100, level))
    device.trusted = level >= 70
    device.trustExpiresAt = device.trusted ? Date.now() + this.#config.trustExpiry : null
    device.lastSeenAt = Date.now()

    return true
  }

  verify(deviceId, challenge) {
    const device = this.#devices.get(deviceId)
    if (!device) return false
    device.lastSeenAt = Date.now()
    return device.trusted && (!device.trustExpiresAt || Date.now() < device.trustExpiresAt)
  }

  revoke(deviceId) {
    const device = this.#devices.get(deviceId)
    if (!device) return false
    device.trusted = false
    device.trustScore = 0
    device.lastSeenAt = Date.now()
    return true
  }

  list(identityId) {
    return Array.from(this.#devices.values())
      .filter(d => d.identityId === identityId)
      .map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        os: d.os,
        browser: d.browser,
        trustScore: d.trustScore,
        trusted: d.trusted,
        known: d.known,
        firstSeenAt: d.firstSeenAt,
        lastSeenAt: d.lastSeenAt,
      }))
  }

  get(deviceId) {
    const device = this.#devices.get(deviceId)
    return device ? { ...device } : null
  }

  evaluateFingerprint(identityId, fingerprint) {
    const hash = this.#hashFingerprint(fingerprint)
    const existing = Array.from(this.#devices.values())
      .filter(d => d.identityId === identityId && d.fingerprint === hash)

    if (existing.length === 0) {
      return { known: false, trustScore: 0, message: 'unknown_device' }
    }

    const device = existing[0]
    if (device.trusted && (!device.trustExpiresAt || Date.now() < device.trustExpiresAt)) {
      return { known: true, trustScore: device.trustScore, message: 'trusted_device' }
    }
    if (device.trusted && device.trustExpiresAt && Date.now() >= device.trustExpiresAt) {
      return { known: true, trustScore: device.trustScore, message: 'trust_expired' }
    }
    return { known: true, trustScore: device.trustScore, message: 'known_device' }
  }

  enableOfflineTrust(deviceId) {
    const device = this.#devices.get(deviceId)
    if (!device) return false
    device.offlineTrusted = true
    return true
  }

  verifyOfflineTrust(deviceId, offlineSince) {
    if (!this.#config.offlineTrustEnabled) return false
    const device = this.#devices.get(deviceId)
    if (!device || !device.offlineTrusted) return false
    if (Date.now() - offlineSince > this.#config.offlineTrustMaxAge) return false
    return device.trusted
  }

  health() {
    const total = this.#devices.size
    const trusted = Array.from(this.#devices.values()).filter(d => d.trusted).length
    return {
      status: 'healthy',
      totalDevices: total,
      trustedDevices: trusted,
      timestamp: Date.now(),
    }
  }

  available() {
    return true
  }

  supports(feature) {
    const features = ['register', 'trust', 'verify', 'revoke', 'list', 'fingerprint', 'fingerprint-hash', 'known-device', 'unknown-device', 'trust-score', 'trust-expiry', 'offline-trust', 'device-limit', 'trust-expiration']
    return features.includes(feature)
  }

  #generateDeviceId() {
    return crypto.randomBytes(16).toString('hex')
  }

  #hashFingerprint(fingerprint) {
    if (!fingerprint) return null
    return crypto.createHash('sha256').update(fingerprint).digest('hex')
  }

  #findByIdentityAndFingerprint(identityId, fingerprint) {
    const hash = this.#hashFingerprint(fingerprint)
    if (!hash) return null
    return Array.from(this.#devices.values()).find(d => d.identityId === identityId && d.fingerprint === hash) || null
  }

  #enforceDeviceLimit(identityId) {
    const devices = Array.from(this.#devices.values()).filter(d => d.identityId === identityId)
    if (devices.length >= this.#config.maxDevicesPerIdentity) {
      devices.sort((a, b) => a.lastSeenAt - b.lastSeenAt)
      const oldest = devices[0]
      if (oldest) {
        this.#devices.delete(oldest.id)
      }
    }
  }
}

export default DeviceManager
