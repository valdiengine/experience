/**
 * Business Services — User Service
 *
 * Thin orchestration layer between onboarding/admin capabilities and UI/workflows
 * Business-agnostic: manages user lifecycle across the platform
 */
export class UserService {
  #capabilities = null

  constructor(capabilities) {
    this.#capabilities = capabilities
  }

  async register(data) {
    const onboarding = this.#capabilities.get('onboarding')
    return onboarding?.register({
      tenantId: data.tenantId,
      business: data.business,
      owner: data.owner,
      plan: data.plan,
    })
  }

  getTenant(tenantId) {
    const onboarding = this.#capabilities.get('onboarding')
    return onboarding?.getTenant(tenantId) || null
  }

  getUsers(tenantId) {
    const admin = this.#capabilities.get('admin')
    return admin?.getUsers(tenantId) || []
  }

  getUser(tenantId, userId) {
    const admin = this.#capabilities.get('admin')
    return admin?.getUser(tenantId, userId) || null
  }

  updateUser(tenantId, userId, data) {
    const admin = this.#capabilities.get('admin')
    return admin?.updateUser(tenantId, userId, data)
  }

  getSubscription(tenantId) {
    const saas = this.#capabilities.get('saas')
    return saas?.getSubscription(tenantId) || null
  }

  getPlan(tenantId) {
    const saas = this.#capabilities.get('saas')
    return saas?.getPlan(tenantId) || null
  }
}
