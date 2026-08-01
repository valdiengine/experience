import crypto from 'crypto'
import { JwtConfigurationError } from './jwt.errors.js'

export class JwtKeyManager {
  #keys = new Map()
  #activeKeyId = null
  #algorithm = null
  #config = {}

  constructor(config = {}) {
    this.#config = {
      algorithm: config.algorithm || 'HS256',
      secret: config.secret || null,
      privateKey: config.privateKey || null,
      publicKey: config.publicKey || null,
      keyRotationEnabled: config.keyRotationEnabled !== false,
      maxActiveKeys: config.maxActiveKeys || 3,
      ...config,
    }
    this.#algorithm = this.#config.algorithm
    this.#initializeKeys()
  }

  get algorithm() { return this.#algorithm }
  get activeKeyId() { return this.#activeKeyId }

  #initializeKeys() {
    if (this.#config.secret) {
      this.#addKey({
        id: 'key-1',
        algorithm: this.#algorithm,
        secret: this.#config.secret,
        type: 'symmetric',
        createdAt: Date.now(),
        active: true,
      })
      return
    }

    if (this.#config.privateKey && this.#config.publicKey) {
      this.#addKey({
        id: 'key-1',
        algorithm: this.#algorithm,
        privateKey: this.#config.privateKey,
        publicKey: this.#config.publicKey,
        type: 'asymmetric',
        createdAt: Date.now(),
        active: true,
      })
      return
    }

    const generated = this.#generateKey('key-1')
    this.#addKey(generated)
  }

  #generateKey(id) {
    const isAsymmetric = this.#algorithm.startsWith('RS') || this.#algorithm.startsWith('ES')
    if (isAsymmetric) {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      })
      return { id, algorithm: this.#algorithm, privateKey, publicKey, type: 'asymmetric', createdAt: Date.now(), active: true }
    }
    const secret = crypto.randomBytes(64).toString('hex')
    return { id, algorithm: this.#algorithm, secret, type: 'symmetric', createdAt: Date.now(), active: true }
  }

  #addKey(key) {
    if (this.#keys.size >= this.#config.maxActiveKeys) {
      const oldest = Array.from(this.#keys.values()).sort((a, b) => a.createdAt - b.createdAt)[0]
      if (oldest) {
        oldest.active = false
      }
    }
    this.#keys.set(key.id, key)
    this.#activeKeyId = key.id
  }

  getSigningKey(keyId) {
    const key = this.#keys.get(keyId || this.#activeKeyId)
    if (!key) throw new JwtConfigurationError(`No key found for id "${keyId || this.#activeKeyId}"`, { keyId })
    if (key.type === 'asymmetric') {
      return { key: key.privateKey, passphrase: this.#config.passphrase || '' }
    }
    return { key: key.secret }
  }

  getVerificationKey(keyId) {
    const key = this.#keys.get(keyId || this.#activeKeyId)
    if (!key) throw new JwtConfigurationError(`No key found for id "${keyId || this.#activeKeyId}"`, { keyId })
    if (key.type === 'asymmetric') {
      return key.publicKey
    }
    return key.secret
  }

  rotate() {
    const newId = `key-${this.#keys.size + 1}`
    const newKey = this.#generateKey(newId)
    this.#addKey(newKey)
    return { keyId: newId, algorithm: this.#algorithm }
  }

  listKeys() {
    return Array.from(this.#keys.entries()).map(([id, key]) => ({
      id,
      algorithm: key.algorithm,
      type: key.type,
      active: key.active,
      createdAt: key.createdAt,
    }))
  }

  getKey(id) {
    return this.#keys.get(id) || null
  }

  getActiveKeys() {
    return Array.from(this.#keys.values()).filter(k => k.active)
  }

  jwks() {
    return this.getActiveKeys().map(key => {
      if (key.type === 'asymmetric') {
        const publicKeyObj = crypto.createPublicKey(key.publicKey)
        const jwk = publicKeyObj.export({ format: 'jwk' })
        return { kid: key.id, alg: this.#joseAlgorithm(key.algorithm), kty: jwk.kty, n: jwk.n, e: jwk.e, use: 'sig' }
      }
      return { kid: key.id, alg: this.#joseAlgorithm(key.algorithm), kty: 'oct', use: 'sig' }
    })
  }

  #joseAlgorithm(alg) {
    const map = { 'HS256': 'HS256', 'HS512': 'HS512', 'RS256': 'RS256', 'RS512': 'RS512', 'ES256': 'ES256', 'ES512': 'ES512' }
    return map[alg] || 'HS256'
  }

  health() {
    return {
      status: this.#keys.size > 0 ? 'healthy' : 'degraded',
      activeKeys: this.getActiveKeys().length,
      totalKeys: this.#keys.size,
      algorithm: this.#algorithm,
      timestamp: Date.now(),
    }
  }

  available() {
    return this.#keys.size > 0
  }

  supports(feature) {
    const features = ['hs256', 'hs512', 'rs256', 'rotation', 'jwks', 'kid', 'multiple-keys', 'key-version']
    return features.includes(feature)
  }
}

export default JwtKeyManager
