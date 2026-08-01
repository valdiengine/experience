/**
 * MockRuntime — provider mocks for capability tests (P13.5.7)
 *
 * Provides the exact module surface capabilities expect on
 * `context.runtime` — auth, authorization, search, sync, cms — each backed by
 * an in-memory recorder so suites can assert authorization decisions and
 * outbound search/sync payloads. All promises resolve successfully.
 */

function createAuthMock() {
  const calls = []
  return {
    calls,
    async authorize(identity, permission, resource) {
      calls.push({ op: 'authorize', identity, permission, resource })
      return true
    },
    async can(identity, permission, resource) {
      calls.push({ op: 'can', identity, permission, resource })
      return true
    },
    async cannot() { return false },
    async hasPermission() { return true },
    async hasRole() { return true },
    async hasScope() { return true },
    async explain() { return { allowed: true, reason: 'mock-auth: allowed' } },
    async permissions() { return ['*'] },
    async roles() { return [] },
    async trust() { return { score: 100 } },
    async device() { return null },
    async mfa() { return { required: false } },
    async anonymous() { return true },
    async audit() { return null },
    currentIdentity() { return null },
    currentSession() { return null },
    currentTenant() { return null },
    async getTenantContext() { return { id: 'commercial' } },
    async getDestinationContext() { return null },
    async login() { return { success: true } },
    async logout() { return { success: true } },
    async authenticate() { return { success: true } },
    async refresh() { return { success: true } },
    async validate() { return { valid: true } },
    async available() { return true },
    async supports() { return true },
    async health() { return { status: 'healthy', provider: 'mock' } },
  }
}

function createAuthorizationMock() {
  const calls = []
  return {
    calls,
    async authorize(identity, permission, resource) {
      calls.push({ op: 'authorize', identity, permission, resource })
      return true
    },
    async can() { return true },
    async explain() { return { allowed: true } },
    async available() { return true },
    async supports() { return true },
    async health() { return { status: 'healthy', provider: 'mock' } },
  }
}

function createSearchMock() {
  const indexed = []
  const deleted = []
  return {
    indexed,
    deleted,
    async index(type, payload) {
      indexed.push({ type, payload })
      return { success: true, type }
    },
    async delete(type, id) {
      deleted.push({ type, id })
      return { success: true, type, id }
    },
    async search() { return { success: true, hits: [] } },
    async health() { return { status: 'healthy', provider: 'mock' } },
  }
}

function createSyncMock() {
  const pushed = []
  return {
    pushed,
    async push(type, payload) {
      pushed.push({ type, payload })
      return { success: true, type }
    },
    async health() { return { status: 'healthy', provider: 'mock' } },
  }
}

function createCmsMock() {
  return {
    async health() { return { status: 'healthy', provider: 'mock' } },
    async available() { return true },
    async supports() { return true },
  }
}

/**
 * Build the full mock runtime surface for `context.runtime`.
 */
export function createMockRuntime() {
  const auth = createAuthMock()
  const authorization = createAuthorizationMock()
  const search = createSearchMock()
  const sync = createSyncMock()
  const cms = createCmsMock()

  return {
    auth,
    authorization,
    search,
    sync,
    cms,
    getModule: (name) => {
      const modules = { auth, authorization, search, sync, cms, database: null, storage: null }
      return modules[name] ?? null
    },
    listModules: () => ['auth', 'authorization', 'search', 'sync', 'cms'],
    healthCheck: async () => ({ status: 'healthy', modules: { auth: 'healthy', authorization: 'healthy' } }),
    getContext: () => ({ auth, authorization, search, sync, cms }),
  }
}

export default createMockRuntime
