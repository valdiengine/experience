export const BUSINESS_PERMISSIONS = {
  CREATE: 'business:create',
  UPDATE: 'business:update',
  DELETE: 'business:delete',
  PUBLISH: 'business:publish',
  ARCHIVE: 'business:archive',
  TRANSFER: 'business:transfer',
  VERIFY: 'business:verify',
  READ: 'business:read',
  MANAGE: 'business:manage',
}

export const PERMISSION_DESCRIPTIONS = {
  [BUSINESS_PERMISSIONS.CREATE]: 'Create new businesses',
  [BUSINESS_PERMISSIONS.UPDATE]: 'Update existing businesses',
  [BUSINESS_PERMISSIONS.DELETE]: 'Delete businesses',
  [BUSINESS_PERMISSIONS.PUBLISH]: 'Publish or unpublish businesses',
  [BUSINESS_PERMISSIONS.ARCHIVE]: 'Archive or restore businesses',
  [BUSINESS_PERMISSIONS.TRANSFER]: 'Transfer business ownership',
  [BUSINESS_PERMISSIONS.VERIFY]: 'Verify business information',
  [BUSINESS_PERMISSIONS.READ]: 'Read business details',
  [BUSINESS_PERMISSIONS.MANAGE]: 'Full management of businesses',
}

export function requirePermission(identity, permission) {
  return async (context) => {
    const auth = context?.runtime?.auth
    if (!auth) return false
    return auth.can(identity, permission, 'business')
  }
}
