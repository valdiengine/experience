/**
 * Owner Password Module
 *
 * Password hashing using Node.js crypto.scrypt with versioned format.
 *
 * Format: scrypt$v=1$N=32768$r=8$p=1$<salt>$<hash>
 *
 * Parameters proven compatible with Node 22 / CloudLinux GLIBC 2.28:
 *   N = 32768
 *   r = 8
 *   p = 1
 *   keyLength = 64
 */

import { scrypt, randomBytes, timingSafeEqual } from 'crypto'

const SCRYPT_FORMAT_VERSION = '1'

const PROVEN_SCRYPT_PARAMS = {
  N: 32768,
  r: 8,
  p: 1,
  dkLen: 64,
  maxmem: 128 * 1024 * 1024
}

function buildPrefix(params) {
  return `scrypt$v=${SCRYPT_FORMAT_VERSION}$N=${params.N}$r=${params.r}$p=${params.p}$`
}

function buildFullPrefix() {
  return buildPrefix(PROVEN_SCRYPT_PARAMS)
}

function parseStoredHash(storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return null
  }

  const expectedPrefix = buildFullPrefix()
  if (!storedHash.startsWith(expectedPrefix)) {
    return null
  }

  const remainder = storedHash.slice(expectedPrefix.length)
  const parts = remainder.split('$')

  if (parts.length !== 2) {
    return null
  }

  const [saltHex, hashHex] = parts

  if (!saltHex || !hashHex) {
    return null
  }

  try {
    const salt = Buffer.from(saltHex, 'hex')
    const hash = Buffer.from(hashHex, 'hex')

    if (salt.length === 0 || hash.length !== PROVEN_SCRYPT_PARAMS.dkLen) {
      return null
    }

    return {
      salt,
      hash,
      params: PROVEN_SCRYPT_PARAMS
    }
  } catch {
    return null
  }
}

export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16)

    scrypt(
      password,
      salt,
      PROVEN_SCRYPT_PARAMS.dkLen,
      PROVEN_SCRYPT_PARAMS,
      (err, derivedKey) => {
        if (err) {
          reject(err)
          return
        }

        const prefix = buildFullPrefix()
        const saltHex = salt.toString('hex')
        const hashHex = derivedKey.toString('hex')

        resolve(`${prefix}${saltHex}$${hashHex}`)
      }
    )
  })
}

export function verifyPassword(password, storedHash) {
  const parsed = parseStoredHash(storedHash)

  if (!parsed) {
    return Promise.resolve(false)
  }

  const { salt, hash: stored, params } = parsed

  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      params.dkLen,
      params,
      (err, derivedKey) => {
        if (err) {
          reject(err)
          return
        }

        try {
          resolve(timingSafeEqual(stored, derivedKey))
        } catch {
          resolve(false)
        }
      }
    )
  })
}

export function isValidHashFormat(storedHash) {
  return parseStoredHash(storedHash) !== null
}

export default {
  hashPassword,
  verifyPassword,
  isValidHashFormat
}
