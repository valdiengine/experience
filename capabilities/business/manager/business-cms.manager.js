export class BusinessCmsManager {
  #context

  constructor(context) {
    this.#context = context
  }

  get #cms() {
    return this.#context?.runtime?.cms || null
  }

  // ── CMS Sync ──

  async syncContent(businessId) {
    const cms = this.#cms
    if (!cms) return { success: false, message: 'CMS runtime not available' }
    const business = await this.#context?.repositories?.business?.findById(businessId)
    if (!business) return { success: false, message: 'Business not found' }
    await cms.push('business', business).catch((err) => {
      console.error('[BusinessCmsManager] Sync failed:', err)
    })
    return { success: true }
  }

  async previewRefresh(businessId) {
    const cms = this.#cms
    if (!cms) return
    await cms.preview?.refresh?.(businessId).catch(() => {})
  }

  // ── Future: WordPress Sync / Publishing / SEO Sync ──

  // async syncToWordPress(businessId) { /* TODO: P13.x */ }
  // async publishToLive(businessId) { /* TODO: P13.x */ }
  // async syncSEO(businessId) { /* TODO: P13.x */ }
}
