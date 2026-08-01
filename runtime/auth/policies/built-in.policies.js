export const BUILT_IN_POLICIES = [
  {
    name: 'deny-by-default',
    description: 'Default deny all actions',
    type: 'rbac',
    effect: 'deny',
    priority: 0,
    actions: ['*'],
    reason: 'default_deny',
  },
  {
    name: 'allow-own-profile',
    description: 'Identities can always read their own profile',
    type: 'abac',
    effect: 'allow',
    priority: 100,
    actions: ['profile:read'],
    conditions: [
      { field: 'identity.id', operator: 'eq', value: '{resource.ownerId}' },
    ],
    reason: 'own_profile',
  },
  {
    name: 'trusted-device-access',
    description: 'Allow basic actions from trusted devices even offline',
    type: 'abac',
    effect: 'allow',
    priority: 90,
    actions: ['profile:read', 'content:read'],
    conditions: [
      { field: 'device.trusted', operator: 'eq', value: true },
    ],
    reason: 'trusted_device',
  },
  {
    name: 'offline-read-access',
    description: 'Allow read actions when offline if trust is sufficient',
    type: 'abac',
    effect: 'allow',
    priority: 80,
    actions: ['*:read'],
    conditions: [
      { field: 'offline', operator: 'eq', value: true },
      { field: 'trustLevel', operator: 'gte', value: 50 },
    ],
    reason: 'offline_read',
  },
  {
    name: 'time-restricted-write',
    description: 'Writes are only allowed during business hours by default',
    type: 'abac',
    effect: 'deny',
    priority: 50,
    actions: ['*:write', '*:update', '*:delete'],
    conditions: [
      { field: 'time_between', operator: 'between', value: [800, 2000] },
      { field: 'day_of_week', operator: 'nin', value: ['saturday', 'sunday'] },
    ],
    reason: 'outside_business_hours',
  },
  {
    name: 'admin-full-access',
    description: 'Platform Admin role has full access',
    type: 'rbac',
    effect: 'allow',
    priority: 200,
    actions: ['*'],
    roles: ['platform:admin'],
    reason: 'admin_full_access',
  },
]

export function registerBuiltInPolicies(policyRegistry) {
  for (const policy of BUILT_IN_POLICIES) {
    policyRegistry.register(policy)
  }
  return BUILT_IN_POLICIES.length
}

export default BUILT_IN_POLICIES
