import { BusinessSearch } from '../business.search.js'

export class BusinessSearchManager {
  #context

  constructor(context) {
    this.#context = context
  }

  get #search() {
    return this.#context?.runtime?.search || null
  }

  get #sync() {
    return this.#context?.runtime?.sync || null
  }

  // ── Search Indexing ──

  async index(business) {
    const search = this.#search
    if (!search) return
    const payload = BusinessSearch.toPayload(business)
    await search.index('business', payload).catch((err) => {
      console.error('[BusinessSearchManager] Index failed:', err)
    })
  }

  async remove(business) {
    const search = this.#search
    if (!search) return
    await search.delete('business', business.id).catch((err) => {
      console.error('[BusinessSearchManager] Remove failed:', err)
    })
  }

  async syncPush(business) {
    const sync = this.#sync
    if (!sync) return
    const payload = BusinessSearch.toPayload(business)
    await sync.push('business', payload).catch((err) => {
      console.error('[BusinessSearchManager] Sync push failed:', err)
    })
  }

  async search(query, options, identity) {
    const repo = this.#context?.repositories?.business
    if (!repo) return []
    const results = await repo.search(query, options) || []
    return results.map((b) => BusinessSearch.toPayload(b))
  }

  // ── Future: Elastic / OpenSearch Integration ──

  // async reindexAll(tenantId) { /* TODO: P13.x */ }
  // async createIndex(name, mapping) { /* TODO: P13.x */ }
}
