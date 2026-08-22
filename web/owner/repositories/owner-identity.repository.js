/**
 * Owner Identity Repository
 *
 * PostgreSQL repository for owner users and application grants.
 * All methods accept optional transaction client for atomic operations.
 */

import { query, transaction, getClient } from '../../../database/connection/postgres.connection.js'

export async function findUserByEmail(email, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  )
  return result.rows[0] || null
}

export async function findUserById(id, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    'SELECT * FROM users WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

export async function createUser({ id, email, passwordHash, name }, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [id, email.toLowerCase(), passwordHash, name]
  )
  return result.rows[0]
}

export async function findActiveGrant(userId, applicationId, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `SELECT * FROM owner_application_grants
     WHERE user_id = $1
       AND application_id = $2
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [userId, applicationId]
  )
  return result.rows[0] || null
}

export async function findLatestGrant(userId, applicationId, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `SELECT * FROM owner_application_grants
     WHERE user_id = $1 AND application_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, applicationId]
  )
  return result.rows[0] || null
}

export async function findActiveGrantsByUserId(userId, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `SELECT * FROM owner_application_grants
     WHERE user_id = $1
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY granted_at ASC`,
    [userId]
  )
  return result.rows
}

export async function findGrantsByUserId(userId, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    'SELECT * FROM owner_application_grants WHERE user_id = $1',
    [userId]
  )
  return result.rows
}

export async function createGrant({ userId, applicationId, role, permissions }, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `INSERT INTO owner_application_grants
     (user_id, application_id, role, permissions, granted_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
     RETURNING *`,
    [userId, applicationId, role, JSON.stringify(permissions)]
  )
  return result.rows[0]
}

export async function updateUserIdentity({ id, email, passwordHash, name }, client = null) {
  const q = client ? client.query.bind(client) : query
  const result = await q(
    `UPDATE users
     SET email = $1,
         password_hash = $2,
         name = $3,
         password_changed_at = NOW(),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, email, name, status, password_changed_at, updated_at`,
    [email.toLowerCase(), passwordHash, name, id]
  )
  return result.rows[0] || null
}

export { transaction, getClient }

export default {
  findUserByEmail,
  findUserById,
  createUser,
  findActiveGrant,
  findLatestGrant,
  findActiveGrantsByUserId,
  findGrantsByUserId,
  createGrant,
  updateUserIdentity,
  transaction,
  getClient
}
