/**
 * User Manager — User CRUD and management
 *
 * Business-agnostic: manages users within tenant scope
 * All operations are tenant-scoped
 */
import { ADMIN_ROLES, ADMIN_PERMISSIONS, ROLE_PERMISSIONS, validateAdminUser } from '../admin.schema.js'
import { ADMIN_EVENTS } from '../admin.events.js'

export class UserManager {
  #context = null
  #users = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Create a new user
   * @param {object} userData - { tenantId, email, name, role }
   * @returns {object}
   */
  create(userData) {
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: userData.tenantId,
      email: userData.email,
      name: userData.name,
      role: userData.role || ADMIN_ROLES.STAFF,
      permissions: ROLE_PERMISSIONS[userData.role] || ROLE_PERMISSIONS[ADMIN_ROLES.STAFF],
      createdAt: new Date().toISOString(),
      lastLogin: null,
      active: true,
    }

    const validation = validateAdminUser(user)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#users.set(user.id, user)
    this.#context?.eventBus?.emit(ADMIN_EVENTS.USER_CREATED, { user })
    return { success: true, user }
  }

  /**
   * Get user by ID
   * @param {string} userId
   * @returns {object|null}
   */
  getById(userId) {
    return this.#users.get(userId) || null
  }

  /**
   * Get all users for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getByTenant(tenantId) {
    return Array.from(this.#users.values()).filter(u => u.tenantId === tenantId)
  }

  /**
   * Get users by role
   * @param {string} tenantId
   * @param {string} role
   * @returns {object[]}
   */
  getByRole(tenantId, role) {
    return this.getByTenant(tenantId).filter(u => u.role === role)
  }

  /**
   * Update user
   * @param {string} userId
   * @param {object} updates - { name?, role?, active? }
   * @returns {object}
   */
  update(userId, updates) {
    const user = this.#users.get(userId)
    if (!user) return { success: false, error: 'User not found' }

    if (updates.name) user.name = updates.name
    if (updates.role) {
      user.role = updates.role
      user.permissions = ROLE_PERMISSIONS[updates.role] || []
    }
    if (updates.active !== undefined) user.active = updates.active

    this.#context?.eventBus?.emit(ADMIN_EVENTS.USER_UPDATED, { user })
    return { success: true, user }
  }

  /**
   * Delete user
   * @param {string} userId
   * @returns {object}
   */
  delete(userId) {
    const user = this.#users.get(userId)
    if (!user) return { success: false, error: 'User not found' }

    this.#users.delete(userId)
    this.#context?.eventBus?.emit(ADMIN_EVENTS.USER_DELETED, { userId, tenantId: user.tenantId })
    return { success: true }
  }

  /**
   * Check if user has permission
   * @param {string} userId
   * @param {string} permission
   * @returns {boolean}
   */
  hasPermission(userId, permission) {
    const user = this.#users.get(userId)
    if (!user || !user.active) return false
    return user.permissions.includes(permission)
  }

  /**
   * Authenticate user (simplified)
   * @param {string} email
   * @param {string} tenantId
   * @returns {object|null}
   */
  authenticate(email, tenantId) {
    const user = Array.from(this.#users.values()).find(
      u => u.email === email && u.tenantId === tenantId && u.active
    )
    if (user) {
      user.lastLogin = new Date().toISOString()
      this.#context?.eventBus?.emit(ADMIN_EVENTS.USER_LOGIN, { userId: user.id, tenantId })
    }
    return user || null
  }

  /**
   * Get user count for tenant
   * @param {string} tenantId
   * @returns {number}
   */
  count(tenantId) {
    return this.getByTenant(tenantId).length
  }
}
