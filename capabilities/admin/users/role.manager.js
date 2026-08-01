/**
 * Role Manager — Role and permission management
 *
 * Business-agnostic: manages roles and permissions within tenant scope
 */
import { ADMIN_ROLES, ADMIN_PERMISSIONS, ROLE_PERMISSIONS } from '../admin.schema.js'

export class AdminRoleManager {
  #context = null
  #customRoles = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Get all available roles
   * @returns {string[]}
   */
  getAllRoles() {
    return Object.values(ADMIN_ROLES)
  }

  /**
   * Get role permissions
   * @param {string} role
   * @returns {string[]}
   */
  getPermissions(role) {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Get all available permissions
   * @returns {string[]}
   */
  getAllPermissions() {
    return Object.values(ADMIN_PERMISSIONS)
  }

  /**
   * Check if role has permission
   * @param {string} role
   * @param {string} permission
   * @returns {boolean}
   */
  roleHasPermission(role, permission) {
    const permissions = ROLE_PERMISSIONS[role] || []
    return permissions.includes(permission)
  }

  /**
   * Create custom role
   * @param {string} name
   * @param {string[]} permissions
   * @returns {object}
   */
  createCustomRole(name, permissions) {
    if (ROLE_PERMISSIONS[name]) {
      return { success: false, error: 'Role already exists' }
    }

    this.#customRoles.set(name, permissions)
    ROLE_PERMISSIONS[name] = permissions
    return { success: true, role: name, permissions }
  }

  /**
   * Get custom roles
   * @returns {Map}
   */
  getCustomRoles() {
    return new Map(this.#customRoles)
  }

  /**
   * Get role hierarchy level (higher = more permissions)
   * @param {string} role
   * @returns {number}
   */
  getRoleLevel(role) {
    const levels = {
      [ADMIN_ROLES.CUSTOMER_SUPPORT]: 1,
      [ADMIN_ROLES.STAFF]: 2,
      [ADMIN_ROLES.MANAGER]: 3,
      [ADMIN_ROLES.TENANT_OWNER]: 4,
      [ADMIN_ROLES.SUPER_ADMIN]: 5,
    }
    return levels[role] || 0
  }

  /**
   * Check if role can manage another role
   * @param {string} managerRole
   * @param {string} targetRole
   * @returns {boolean}
   */
  canManage(managerRole, targetRole) {
    return this.getRoleLevel(managerRole) > this.getRoleLevel(targetRole)
  }

  /**
   * Get permissions grouped by category
   * @returns {object}
   */
  getPermissionsByCategory() {
    const categories = {}
    Object.entries(ADMIN_PERMISSIONS).forEach(([key, value]) => {
      const category = value.split('.')[0]
      if (!categories[category]) categories[category] = []
      categories[category].push({ key, value })
    })
    return categories
  }
}
