export const PAYMENT_PERMISSIONS = Object.freeze({
  CREATE: 'payment:create',
  READ: 'payment:read',
  UPDATE: 'payment:update',
  CANCEL: 'payment:cancel',
  REFUND: 'payment:refund',
  ARCHIVE: 'payment:archive',
  RESTORE: 'payment:restore',
  DELETE: 'payment:delete',
  MANAGE: 'payment:manage',
})

export const PERMISSION_DESCRIPTIONS = Object.freeze({
  [PAYMENT_PERMISSIONS.CREATE]: 'Create new payments',
  [PAYMENT_PERMISSIONS.READ]: 'Read payment details',
  [PAYMENT_PERMISSIONS.UPDATE]: 'Update existing payments',
  [PAYMENT_PERMISSIONS.CANCEL]: 'Cancel pending payments',
  [PAYMENT_PERMISSIONS.REFUND]: 'Issue refunds for payments',
  [PAYMENT_PERMISSIONS.ARCHIVE]: 'Archive or restore payments',
  [PAYMENT_PERMISSIONS.RESTORE]: 'Restore archived payments',
  [PAYMENT_PERMISSIONS.DELETE]: 'Delete payments permanently',
  [PAYMENT_PERMISSIONS.MANAGE]: 'Full management of payments',
})

export function requirePermission(identity, permission) {
  return async (context) => {
    const auth = context?.runtime?.auth
    if (!auth) return false
    return auth.can(identity, permission, 'payment')
  }
}
