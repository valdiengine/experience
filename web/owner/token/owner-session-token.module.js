/**
 * Owner Session Token Module
 *
 * Secure session token generation and hashing for OWNER-SESSION-2.
 *
 * Token Format:
 *   sess_<43 base64url characters>
 *   32 bytes of crypto.randomBytes → 43 base64url chars
 *
 * Hash Storage:
 *   SHA256(raw_token) → 64 hex characters
 *   Only the hash is stored in the database.
 *
 * Security Properties:
 *   - 256-bit entropy from crypto.randomBytes
 *   - Raw token never stored at rest
 *   - Raw token never logged
 *   - Constant-time comparison not needed for DB-backed sessions
 *     (PostgreSQL performs the equality comparison)
 */

import { randomBytes, createHash } from 'crypto'

const TOKEN_PREFIX = 'sess_'
const TOKEN_BYTES = 32

function base64urlEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function generateSecureSessionId() {
  const bytes = randomBytes(TOKEN_BYTES)
  return TOKEN_PREFIX + base64urlEncode(bytes)
}

export function hashSessionToken(rawToken) {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function isValidTokenFormat(token) {
  if (typeof token !== 'string') {
    return false
  }

  if (!token.startsWith(TOKEN_PREFIX)) {
    return false
  }

  const body = token.slice(TOKEN_PREFIX.length)

  if (body.length !== 43) {
    return false
  }

  return /^[A-Za-z0-9_-]+$/.test(body)
}

export function extractTokenBody(token) {
  if (!isValidTokenFormat(token)) {
    return null
  }
  return token.slice(TOKEN_PREFIX.length)
}

export default {
  generateSecureSessionId,
  hashSessionToken,
  isValidTokenFormat,
  extractTokenBody
}
