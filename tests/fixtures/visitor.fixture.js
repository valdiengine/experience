/**
 * Visitor fixtures (P13.5.7) — deterministic inputs for
 * VisitorManager.createVisitor(data, identity).
 */

export function createVisitorData(overrides = {}) {
  return {
    tenantId: 'commercial',
    profile: {
      fullName: 'Ana Test',
      email: 'ana@test.example',
      phone: '+5492615555555',
      country: 'AR',
      language: 'es',
      currency: 'ARS',
      timezone: 'America/Argentina/Mendoza',
    },
    preferences: {
      language: 'es',
      currency: 'ARS',
      marketingConsent: false,
    },
    ...overrides,
  }
}

export default createVisitorData
