export const RESERVATION_PERMISSIONS = {
  READ: 'reservation:read',
  CREATE: 'reservation:create',
  UPDATE: 'reservation:update',
  CANCEL: 'reservation:cancel',
  CONFIRM: 'reservation:confirm',
  REJECT: 'reservation:reject',
  ARCHIVE: 'reservation:archive',
  RESTORE: 'reservation:restore',
  DELETE: 'reservation:delete',
  OVERRIDE: 'reservation:override',
  MANAGE: 'reservation:manage',
}

export const PERMISSION_DESCRIPTIONS = {
  [RESERVATION_PERMISSIONS.READ]: 'Read reservation data',
  [RESERVATION_PERMISSIONS.CREATE]: 'Create new reservations',
  [RESERVATION_PERMISSIONS.UPDATE]: 'Update existing reservations',
  [RESERVATION_PERMISSIONS.CANCEL]: 'Cancel reservations',
  [RESERVATION_PERMISSIONS.CONFIRM]: 'Confirm reservations',
  [RESERVATION_PERMISSIONS.REJECT]: 'Reject reservations',
  [RESERVATION_PERMISSIONS.ARCHIVE]: 'Archive or restore reservations',
  [RESERVATION_PERMISSIONS.RESTORE]: 'Restore archived reservations',
  [RESERVATION_PERMISSIONS.DELETE]: 'Delete reservations',
  [RESERVATION_PERMISSIONS.OVERRIDE]: 'Override reservation rules',
  [RESERVATION_PERMISSIONS.MANAGE]: 'Full management of reservations',
}

export function requirePermission(identity, permission) {
  return async (context) => {
    const auth = context?.runtime?.auth
    if (!auth) return false
    return auth.can(identity, permission, 'reservation')
  }
}
