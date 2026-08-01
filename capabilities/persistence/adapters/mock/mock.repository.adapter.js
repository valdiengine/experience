/**
 * MockRepositoryAdapter — Architectural placeholder provider adapter
 *
 * P13.5.5 (Runtime Entry & Wiring): satisfies the RepositoryAdapter contract so the
 * application can boot against the default 'mock' provider. It is NOT a production
 * adapter: every operation returns an empty/interface-conforming result with no
 * storage, CRUD implementation, or persistence logic.
 *
 * Production adapters (PostgreSQL/Drizzle) are registered at runtime in their own
 * provider modules. See docs/architecture/COMMERCIAL_RUNTIME_STARTUP.md.
 */
import { RepositoryAdapter } from '../repository.adapter.js'

export class MockRepositoryAdapter extends RepositoryAdapter {
  async ping() {
    return true
  }

  async health() {
    return { status: 'up', provider: 'mock', entityName: this.entityName }
  }

  async find() { return [] }
  async findOne() { return null }
  async findById() { return null }
  async findAll() { return [] }

  async create() { return null }
  async createMany() { return [] }
  async update() { return null }
  async updateMany() { return 0 }
  async delete() { return 0 }

  async count() { return 0 }
  async exists() { return false }
  async paginate() { return { items: [], total: 0, page: 1, size: 0 } }
  async search() { return [] }
  async aggregate() { return [] }
  async distinct() { return [] }
  async bulkCreate() { return [] }
  async bulkUpdate() { return 0 }
  async bulkDelete() { return 0 }

  async beginTransaction() { return { id: `mock_tx_${Date.now()}`, provider: 'mock' } }
  async commitTransaction() { return true }
  async rollbackTransaction() { return true }
}

export default MockRepositoryAdapter
