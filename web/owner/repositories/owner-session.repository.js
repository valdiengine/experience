/**
 * Owner Session Repository
 *
 * PostgreSQL repository for owner session management.
 * All methods accept optional transaction client for atomic operations.
 *
 * Session Validation Semantics:
 *   A session is VALID when:
 *     status = 'active' AND expires_at > NOW()
 *
 *   Expiration is NOT a stored status — it is a query condition.
 */

import { query } from '../../../database/connection/postgres.connection.js'

export async function createSession({
  userId,
  applicationId,
  tokenHash,
  expiresAt
}, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `INSERT INTO owner_sessions
     (user_id, application_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, applicationId, tokenHash, expiresAt]
  )
  return result.rows[0]
}

export async function findSessionByTokenHash(tokenHash, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `SELECT * FROM owner_sessions
     WHERE token_hash = $1
       AND status = 'active'
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  )
  return result.rows[0] || null
}

export async function revokeSession(tokenHash, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `UPDATE owner_sessions
     SET status = 'revoked', revoked_at = NOW()
     WHERE token_hash = $1
       AND status = 'active'
     RETURNING *`,
    [tokenHash]
  )
  return result.rows[0] || null
}

export async function revokeAllSessionsForUser(userId, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `UPDATE owner_sessions
     SET status = 'revoked', revoked_at = NOW()
     WHERE user_id = $1
       AND status = 'active'
     RETURNING *`,
    [userId]
  )
  return result.rows
}

export async function revokeSessionsForApplication(userId, applicationId, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `UPDATE owner_sessions
     SET status = 'revoked', revoked_at = NOW()
     WHERE user_id = $1
       AND application_id = $2
       AND status = 'active'
     RETURNING *`,
    [userId, applicationId]
  )
  return result.rows
}

export async function cleanupExpiredSessions(cutoffTimestamp, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `DELETE FROM owner_sessions
     WHERE expires_at < $1
       AND status = 'active'
     RETURNING id`,
    [cutoffTimestamp]
  )
  return result.rows.length
}

export async function extendSession(tokenHash, newExpiresAt, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `UPDATE owner_sessions
     SET expires_at = $2
     WHERE token_hash = $1
       AND status = 'active'
       AND expires_at > NOW()
     RETURNING *`,
    [tokenHash, newExpiresAt]
  )
  return result.rows[0] || null
}

export async function countActiveSessions(client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `SELECT COUNT(*) as count FROM owner_sessions WHERE status = 'active' AND expires_at > NOW()`
  )
  return parseInt(result.rows[0].count, 10)
}

export async function findActiveSessionsForUser(userId, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `SELECT id, application_id, created_at, expires_at, status
     FROM owner_sessions
     WHERE user_id = $1
       AND status = 'active'
       AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  )
  return result.rows
}

export async function revokeSessionByIdForUser(sessionId, userId, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `UPDATE owner_sessions
     SET status = 'revoked', revoked_at = NOW()
     WHERE id = $1
       AND user_id = $2
       AND status = 'active'
       AND expires_at > NOW()
     RETURNING id, application_id, revoked_at`,
    [sessionId, userId]
  )
  return result.rows[0] || null
}

export async function revokeAllOtherSessionsForUser(userId, currentSessionId, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `UPDATE owner_sessions
     SET status = 'revoked', revoked_at = NOW()
     WHERE user_id = $1
       AND id <> $2
       AND status = 'active'
       AND expires_at > NOW()
     RETURNING id, application_id, revoked_at`,
    [userId, currentSessionId]
  )
  return result.rows
}

export default {
  createSession,
  findSessionByTokenHash,
  revokeSession,
  revokeAllSessionsForUser,
  revokeSessionsForApplication,
  cleanupExpiredSessions,
  extendSession,
  countActiveSessions,
  findActiveSessionsForUser,
  revokeSessionByIdForUser,
  revokeAllOtherSessionsForUser
}
