import { RepositoryTransactionError } from '../errors/repository.errors.js'
import { REPOSITORY_EVENTS, createRepositoryEvent } from '../events/repository.events.js'

export class UnitOfWork {
  static MAX_NESTING = 3

  #changes = { new: new Map(), dirty: new Map(), deleted: new Map() }
  #parent = null
  #children = []
  #disposed = false
  #depth = 0
  #eventBus = null
  #markedForRollback = false

  get changes() { return this.#changes }
  get depth() { return this.#depth }
  get disposed() { return this.#disposed }
  get markedForRollback() { return this.#markedForRollback }
  get hasChanges() {
    return this.#changes.new.size > 0 || this.#changes.dirty.size > 0 || this.#changes.deleted.size > 0
  }

  constructor(options = {}) {
    this.#parent = options.parent || null
    this.#depth = options.depth || 0
    this.#eventBus = options.eventBus || null
  }

  setEventBus(eventBus) { this.#eventBus = eventBus }

  begin() {
    this.#assertNotDisposed()
    const childDepth = this.#depth + 1
    if (childDepth > UnitOfWork.MAX_NESTING) {
      throw new RepositoryTransactionError(
        `Unit of Work nesting limit of ${UnitOfWork.MAX_NESTING} exceeded`,
        { operation: 'begin', detail: `attempted depth ${childDepth}` }
      )
    }
    const child = new UnitOfWork({ parent: this, depth: childDepth, eventBus: this.#eventBus })
    this.#children.push(child)
    return child
  }

  registerNew(entityName, entity) {
    this.#assertNotDisposed()
    const list = this.#changes.new.get(entityName) || []
    list.push(entity)
    this.#changes.new.set(entityName, list)
    if (this.#parent) this.#parent.registerNew(entityName, entity)
  }

  registerDirty(entityName, entity) {
    this.#assertNotDisposed()
    const newList = this.#changes.new.get(entityName)
    if (newList) {
      const idx = newList.findIndex(e => this.#matches(e, entity))
      if (idx !== -1) return
    }
    const list = this.#changes.dirty.get(entityName) || []
    const existing = list.findIndex(e => this.#matches(e, entity))
    if (existing !== -1) list[existing] = entity
    else list.push(entity)
    this.#changes.dirty.set(entityName, list)
    if (this.#parent) this.#parent.registerDirty(entityName, entity)
  }

  registerDeleted(entityName, entity) {
    this.#assertNotDisposed()
    const newList = this.#changes.new.get(entityName)
    if (newList) {
      const idx = newList.findIndex(e => this.#matches(e, entity))
      if (idx !== -1) { newList.splice(idx, 1); if (newList.length === 0) this.#changes.new.delete(entityName); return }
    }
    const dirtyList = this.#changes.dirty.get(entityName)
    if (dirtyList) {
      const idx = dirtyList.findIndex(e => this.#matches(e, entity))
      if (idx !== -1) dirtyList.splice(idx, 1)
    }
    const list = this.#changes.deleted.get(entityName) || []
    list.push(entity)
    this.#changes.deleted.set(entityName, list)
    if (this.#parent) this.#parent.registerDeleted(entityName, entity)
  }

  #matches(a, b) {
    return a && b && a.id !== undefined && a.id === b.id
  }

  async commit() {
    this.#assertNotDisposed()
    if (this.#parent) {
      this.#mergeIntoParent()
      this.#dispose()
      return
    }
    if (this.#markedForRollback) {
      await this.rollback(new Error('Child unit of work was rolled back'))
      return
    }
    if (!this.hasChanges) { this.#dispose(); return }
    try {
      this.#emit(REPOSITORY_EVENTS.TRANSACTION_STARTED, { changes: this.#countChanges() })
      await this.#validate()
      const ordered = this.#topologicalSort()
      await this.#execute(ordered)
      this.#emit(REPOSITORY_EVENTS.TRANSACTION_COMMITTED, { changes: this.#countChanges() })
      this.#dispose()
    } catch (err) {
      this.#emit(REPOSITORY_EVENTS.TRANSACTION_ROLLED_BACK, { error: err.message })
      await this.#reverse(err)
      this.#dispose()
      throw err
    }
  }

  async rollback(reason) {
    this.#assertNotDisposed()
    if (this.#parent) {
      this.#parent.#markedForRollback = true
      this.#dispose()
      return
    }
    this.#emit(REPOSITORY_EVENTS.TRANSACTION_ROLLED_BACK, { reason: reason?.message || 'explicit rollback' })
    await this.#reverse(reason)
    this.#dispose()
  }

  async flush() {
    this.#assertNotDisposed()
    if (this.#parent) return
    if (!this.hasChanges) return
    const ordered = this.#topologicalSort()
    await this.#execute(ordered)
    this.#changes = { new: new Map(), dirty: new Map(), deleted: new Map() }
  }

  clear() {
    this.#assertNotDisposed()
    this.#changes = { new: new Map(), dirty: new Map(), deleted: new Map() }
  }

  dispose() { this.#dispose() }

  #dispose() {
    this.#disposed = true
    this.#changes = { new: new Map(), dirty: new Map(), deleted: new Map() }
    for (const child of this.#children) child.#dispose()
    this.#children = []
    if (this.#parent) this.#parent.#removeChild(this)
  }

  #removeChild(child) {
    const idx = this.#children.indexOf(child)
    if (idx !== -1) this.#children.splice(idx, 1)
  }

  #mergeIntoParent() {
    this.#assertNotDisposed()
    if (this.#markedForRollback) { this.#parent.#markedForRollback = true; return }
    for (const [entityName, entities] of this.#changes.new) {
      for (const entity of entities) this.#parent.registerNew(entityName, entity)
    }
    for (const [entityName, entities] of this.#changes.dirty) {
      for (const entity of entities) this.#parent.registerDirty(entityName, entity)
    }
    for (const [entityName, entities] of this.#changes.deleted) {
      for (const entity of entities) this.#parent.registerDeleted(entityName, entity)
    }
  }

  #assertNotDisposed() {
    if (this.#disposed) throw new RepositoryTransactionError('Unit of Work has been disposed', { operation: 'assert' })
  }

  async #validate() {
    for (const [, entities] of this.#changes.new) {
      for (const entity of entities) {
        if (entity.validate) await entity.validate()
      }
    }
  }

  #topologicalSort() {
    const order = []
    const newKeys = [...this.#changes.new.keys()]
    const dirtyKeys = [...this.#changes.dirty.keys()]
    const deletedKeys = [...this.#changes.deleted.keys()]
    order.push(...newKeys, ...dirtyKeys, ...deletedKeys)
    return [...new Set(order)]
  }

  async #execute(ordered) {
    for (const entityName of ordered) {
      const newEntities = this.#changes.new.get(entityName) || []
      const dirtyEntities = this.#changes.dirty.get(entityName) || []
      const deletedEntities = this.#changes.deleted.get(entityName) || []
      if (newEntities.length > 0) {
        this.#emit(REPOSITORY_EVENTS.ENTITY_CREATED, { entityName, count: newEntities.length })
      }
      if (dirtyEntities.length > 0) {
        this.#emit(REPOSITORY_EVENTS.ENTITY_UPDATED, { entityName, count: dirtyEntities.length })
      }
      if (deletedEntities.length > 0) {
        this.#emit(REPOSITORY_EVENTS.ENTITY_DELETED, { entityName, count: deletedEntities.length })
      }
    }
  }

  async #reverse(err) {
    this.#changes = { new: new Map(), dirty: new Map(), deleted: new Map() }
    for (const child of this.#children) await child.#reverse(err)
  }

  #countChanges() {
    let count = 0
    for (const entities of this.#changes.new.values()) count += entities.length
    for (const entities of this.#changes.dirty.values()) count += entities.length
    for (const entities of this.#changes.deleted.values()) count += entities.length
    return { new: this.#changes.new.size, dirty: this.#changes.dirty.size, deleted: this.#changes.deleted.size, total: count }
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createRepositoryEvent(event, { source: 'unit-of-work', ...data }))
    }
  }
}

export default UnitOfWork
