export const BUILT_IN_SCOPES = [
  { name: 'public', type: 'system', description: 'Public content accessible without authentication' },
  { name: 'private', type: 'system', description: 'Private content for authenticated users' },
  { name: 'verified', type: 'system', description: 'Content for verified identities only' },
  { name: 'premium', type: 'system', description: 'Exclusive content for premium subscribers' },
  { name: 'business', type: 'tenant', description: 'Business administration scope' },
  { name: 'destination', type: 'destination', description: 'Destination management scope' },
  { name: 'moderation', type: 'destination', description: 'Content moderation scope' },
  { name: 'science', type: 'destination', description: 'Scientific data and ecology scope' },
  { name: 'governance', type: 'destination', description: 'Destination governance and voting' },
  { name: 'sandbox', type: 'system', description: 'Sandbox scope for developer testing' },
  { name: 'support', type: 'system', description: 'Customer support access scope' },
  { name: 'admin', type: 'system', description: 'Full administrative access scope' },
]

export function registerBuiltInScopes(scopeRegistry) {
  for (const scope of BUILT_IN_SCOPES) {
    scopeRegistry.define(scope.name, scope)
  }
  return BUILT_IN_SCOPES.length
}

export default BUILT_IN_SCOPES
