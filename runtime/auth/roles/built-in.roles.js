export const BUILT_IN_ROLES = [
  {
    name: 'anonymous',
    description: 'Unauthenticated visitor with minimal access',
    type: 'system',
    permissions: ['content:read', 'destination:read'],
    inherits: [],
    scopes: ['public'],
    priority: 0,
  },
  {
    name: 'visitor',
    description: 'Authenticated visitor',
    type: 'system',
    permissions: ['content:read', 'profile:read', 'profile:write', 'reservation:create', 'reservation:read', 'review:create', 'review:read', 'community:read'],
    inherits: ['anonymous'],
    scopes: ['public', 'private'],
    priority: 10,
  },
  {
    name: 'visitor:verified',
    description: 'Verified visitor with email/phone confirmation',
    type: 'system',
    permissions: ['review:write', 'community:write', 'experience:book', 'message:send'],
    inherits: ['visitor'],
    scopes: ['public', 'private', 'verified'],
    priority: 20,
  },
  {
    name: 'visitor:premium',
    description: 'Premium subscriber visitor',
    type: 'system',
    permissions: ['content:exclusive', 'analytics:personal', 'support:priority'],
    inherits: ['visitor:verified'],
    scopes: ['public', 'private', 'verified', 'premium'],
    priority: 30,
  },
  {
    name: 'business:owner',
    description: 'Business owner managing their own business',
    type: 'tenant',
    permissions: ['business:manage', 'reservation:manage', 'availability:write', 'inventory:manage', 'analytics:business', 'content:manage', 'accommodation:*', 'visitor:*'],
    inherits: ['visitor:verified'],
    scopes: ['public', 'private', 'verified', 'business'],
    priority: 40,
  },
  {
    name: 'guide',
    description: 'Tour guide with experience management permissions',
    type: 'destination',
    permissions: ['experience:create', 'experience:manage', 'route:create', 'route:manage', 'content:create', 'media:upload'],
    inherits: ['visitor:verified'],
    scopes: ['public', 'private', 'verified', 'destination'],
    priority: 35,
  },
  {
    name: 'moderator',
    description: 'Content moderator for community and reviews',
    type: 'destination',
    permissions: ['community:moderate', 'review:moderate', 'content:moderate', 'report:manage', 'user:warn'],
    inherits: ['visitor:verified'],
    scopes: ['public', 'private', 'verified', 'moderation'],
    priority: 50,
  },
  {
    name: 'scientist',
    description: 'Citizen scientist with ecology permissions',
    type: 'destination',
    permissions: ['species:record', 'species:verify', 'observation:create', 'observation:manage', 'ecology:read', 'ecology:write', 'data:export'],
    inherits: ['visitor:verified'],
    scopes: ['public', 'private', 'verified', 'science'],
    priority: 35,
  },
  {
    name: 'municipality',
    description: 'Municipal administrator for destination governance',
    type: 'destination',
    permissions: ['destination:manage', 'governance:manage', 'governance:vote', 'analytics:destination', 'campaign:create', 'report:generate'],
    inherits: [] ,
    scopes: ['public', 'private', 'verified', 'governance', 'destination'],
    priority: 70,
  },
  {
    name: 'platform:admin',
    description: 'Platform administrator with full system access',
    type: 'system',
    permissions: ['*'],
    inherits: [],
    scopes: ['*'],
    priority: 100,
  },
  {
    name: 'system',
    description: 'Internal system operations (background jobs, integrations)',
    type: 'system',
    permissions: ['*'],
    inherits: [],
    scopes: ['*'],
    priority: 200,
  },
  {
    name: 'developer',
    description: 'API developer with sandboxed access for integration testing',
    type: 'system',
    permissions: ['*:read', 'profile:*', 'sandbox:*'],
    inherits: ['visitor'],
    scopes: ['public', 'sandbox'],
    priority: 50,
  },
]

export function registerBuiltInRoles(roleRegistry) {
  for (const role of BUILT_IN_ROLES) {
    roleRegistry.define(role.name, role)
  }
  return BUILT_IN_ROLES.length
}

export default BUILT_IN_ROLES
