export const NOTIFICATION_PERMISSIONS = Object.freeze({
  CREATE: 'notification:create',
  READ: 'notification:read',
  UPDATE: 'notification:update',
  SEND: 'notification:send',
  CANCEL: 'notification:cancel',
  RETRY: 'notification:retry',
  ARCHIVE: 'notification:archive',
  RESTORE: 'notification:restore',
  DELETE: 'notification:delete',
  MANAGE_PREFERENCES: 'notification:manage_preferences',
})

export const NOTIFICATION_PERMISSION_LIST = Object.values(NOTIFICATION_PERMISSIONS)

export const NOTIFICATION_PERMISSION_LABELS = Object.freeze({
  [NOTIFICATION_PERMISSIONS.CREATE]: 'Create notifications',
  [NOTIFICATION_PERMISSIONS.READ]: 'Read notifications',
  [NOTIFICATION_PERMISSIONS.UPDATE]: 'Update notifications',
  [NOTIFICATION_PERMISSIONS.SEND]: 'Send notifications',
  [NOTIFICATION_PERMISSIONS.CANCEL]: 'Cancel notifications',
  [NOTIFICATION_PERMISSIONS.RETRY]: 'Retry failed notifications',
  [NOTIFICATION_PERMISSIONS.ARCHIVE]: 'Archive notifications',
  [NOTIFICATION_PERMISSIONS.RESTORE]: 'Restore notifications',
  [NOTIFICATION_PERMISSIONS.DELETE]: 'Delete notifications',
  [NOTIFICATION_PERMISSIONS.MANAGE_PREFERENCES]: 'Manage notification preferences',
})

export function hasPermission(rolePermissions, requiredPermission) {
  if (!rolePermissions || !Array.isArray(rolePermissions)) {
    return false
  }
  if (rolePermissions.includes('*')) {
    return true
  }
  return rolePermissions.includes(requiredPermission)
}

export function filterByPermission(permissions, filterPermissions) {
  if (!filterPermissions || filterPermissions.length === 0) {
    return permissions
  }
  return permissions.filter((p) => filterPermissions.includes(p))
}
