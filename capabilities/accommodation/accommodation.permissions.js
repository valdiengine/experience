export const ACCOMMODATION_PERMISSIONS = {
  CREATE: 'accommodation:create',
  UPDATE: 'accommodation:update',
  DELETE: 'accommodation:delete',
  PUBLISH: 'accommodation:publish',
  ARCHIVE: 'accommodation:archive',
  READ: 'accommodation:read',
  MANAGE: 'accommodation:manage',
}

export const PERMISSION_DESCRIPTIONS = {
  [ACCOMMODATION_PERMISSIONS.CREATE]: 'Create new accommodations',
  [ACCOMMODATION_PERMISSIONS.UPDATE]: 'Update existing accommodations',
  [ACCOMMODATION_PERMISSIONS.DELETE]: 'Delete accommodations',
  [ACCOMMODATION_PERMISSIONS.PUBLISH]: 'Publish or unpublish accommodations',
  [ACCOMMODATION_PERMISSIONS.ARCHIVE]: 'Archive or restore accommodations',
  [ACCOMMODATION_PERMISSIONS.READ]: 'Read accommodation details',
  [ACCOMMODATION_PERMISSIONS.MANAGE]: 'Full management of accommodations',
}

export function requirePermission(identity, permission) {
  return async (context) => {
    const auth = context?.runtime?.auth
    if (!auth) return false
    return auth.can(identity, permission, 'accommodation')
  }
}
