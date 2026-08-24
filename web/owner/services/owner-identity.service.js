/**
 * Owner Identity Service
 *
 * Business logic for owner users and application grants.
 * Handles authentication, user creation, and grant management.
 */

import * as repo from '../repositories/owner-identity.repository.js'
import * as sessionRepo from '../repositories/owner-session.repository.js'
import { hashPassword, verifyPassword } from '../password/owner-password.module.js'
import { transaction } from '../../../database/connection/postgres.connection.js'

const DEFAULT_PERMISSIONS = [
  'application:read',
  'business:edit_info',
  'inbox:read',
  'inbox:manage',
  'quotes:view',
  'pwa:view',
  'notifications:edit_settings'
]

function generateId() {
  return 'owner_' + Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

export async function createOwnerUser({ email, password, name }) {
  const id = generateId()
  const passwordHash = await hashPassword(password)

  const user = await repo.createUser({
    id,
    email: email.toLowerCase(),
    passwordHash,
    name: name || email.split('@')[0]
  })

  return user
}

export async function authenticateOwnerUser(email, password) {
  const user = await repo.findUserByEmail(email)

  if (!user) {
    return { success: false, error: 'Invalid credentials' }
  }

  if (user.status !== 'active') {
    return { success: false, error: 'Account ' + user.status }
  }

  const valid = await verifyPassword(password, user.password_hash)

  if (!valid) {
    return { success: false, error: 'Invalid credentials' }
  }

  return { success: true, user }
}

export async function getActiveGrant(userId, applicationId) {
  return repo.findActiveGrant(userId, applicationId)
}

export async function getActiveGrantsForUser(userId) {
  return repo.findActiveGrantsByUserId(userId)
}

export async function createOwnerGrant({ userId, applicationId, role, permissions }) {
  return repo.createGrant({
    userId,
    applicationId,
    role: role || 'business_owner',
    permissions: permissions || DEFAULT_PERMISSIONS
  })
}

export async function bootstrapStagingOwner({ email, password, name, applicationId }) {
  return transaction(async (client) => {
    let user = await repo.findUserByEmail(email, client)

    if (!user) {
      const id = generateId()
      const passwordHash = await hashPassword(password)
      user = await repo.createUser({
        id,
        email: email.toLowerCase(),
        passwordHash,
        name: name || email.split('@')[0]
      }, client)
    }

    const latestGrant = await repo.findLatestGrant(user.id, applicationId, client)

    if (latestGrant) {
      switch (latestGrant.status) {
        case 'active':
          return { user, grant: latestGrant, action: 'existing_active' }
        case 'revoked':
          throw new Error('REVOKED_GRANT_EXISTS_MANUAL_REVIEW_REQUIRED')
        default:
          throw new Error('UNKNOWN_GRANT_STATUS')
      }
    }

    const grant = await repo.createGrant({
      userId: user.id,
      applicationId,
      role: 'business_owner',
      permissions: DEFAULT_PERMISSIONS
    }, client)

    return { user, grant, action: 'created' }
  })
}

export async function getUserById(userId) {
  return repo.findUserById(userId)
}

export async function getGrantsByUserId(userId) {
  return repo.findGrantsByUserId(userId)
}

export async function updateStagingOwnerIdentity({ userId, applicationId, email, password, name }) {
  return transaction(async (client) => {
    const normalizedEmail = email.trim().toLowerCase()

    const user = await repo.findUserById(userId, client)
    if (!user) {
      throw new Error('TARGET_USER_NOT_FOUND')
    }

    const latestGrant = await repo.findLatestGrant(userId, applicationId, client)
    if (!latestGrant) {
      throw new Error('TARGET_GRANT_NOT_FOUND')
    }
    if (latestGrant.status !== 'active') {
      throw new Error('TARGET_GRANT_REVOKED')
    }

    const existingWithEmail = await repo.findUserByEmail(normalizedEmail, client)
    if (existingWithEmail && existingWithEmail.id !== userId) {
      throw new Error('DUPLICATE_EMAIL')
    }

    const passwordHash = await hashPassword(password)

    const updatedUser = await repo.updateUserIdentity({
      id: userId,
      email: normalizedEmail,
      passwordHash,
      name
    }, client)

    await sessionRepo.revokeAllSessionsForUser(userId, client)

    return {
      user: updatedUser,
      grant: latestGrant,
      action: 'updated'
    }
  })
}

export default {
  createOwnerUser,
  authenticateOwnerUser,
  getActiveGrant,
  getActiveGrantsForUser,
  createOwnerGrant,
  bootstrapStagingOwner,
  getUserById,
  getGrantsByUserId,
  updateStagingOwnerIdentity
}
