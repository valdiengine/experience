export const AVAILABILITY_PERMISSIONS = {
  READ: 'availability:read',
  WRITE: 'availability:write',
  PUBLISH: 'availability:publish',
  ARCHIVE: 'availability:archive',
  OVERRIDE: 'availability:override',
  MANAGE: 'availability:manage',
  SYNC: 'availability:sync',
}

export const PERMISSION_DESCRIPTIONS = {
  [AVAILABILITY_PERMISSIONS.READ]: 'Read availability data',
  [AVAILABILITY_PERMISSIONS.WRITE]: 'Create or update availability',
  [AVAILABILITY_PERMISSIONS.PUBLISH]: 'Publish or unpublish availability',
  [AVAILABILITY_PERMISSIONS.ARCHIVE]: 'Archive or restore availability',
  [AVAILABILITY_PERMISSIONS.OVERRIDE]: 'Override availability rules',
  [AVAILABILITY_PERMISSIONS.MANAGE]: 'Full management of availability',
  [AVAILABILITY_PERMISSIONS.SYNC]: 'Sync availability with external systems',
}

export function requirePermission(identity, permission) {
  return async (context) => {
    const auth = context?.runtime?.auth
    if (!auth) return false
    return auth.can(identity, permission, 'availability')
  }
}
