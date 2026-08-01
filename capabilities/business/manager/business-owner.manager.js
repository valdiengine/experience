export class BusinessOwnerManager {
  #context

  constructor(context) {
    this.#context = context
  }

  // ── Ownership ──

  async getOwner(businessId) {
    const business = await this.#context?.repositories?.business?.findById(businessId)
    if (!business) return null
    return { ownerId: business.ownerId || null }
  }

  async transferOwner(businessId, newOwnerId, identity) {
    const now = new Date().toISOString()
    await this.#context?.repositories?.business?.update({ id: businessId }, {
      ownerId: newOwnerId,
      updatedAt: now,
    })
    return { success: true }
  }

  // ── Future: Staff / Managers / Invitations ──

  // async listStaff(businessId) { /* TODO: P13.x */ }
  // async inviteManager(businessId, email, role) { /* TODO: P13.x */ }
  // async removeStaff(businessId, userId) { /* TODO: P13.x */ }
}
