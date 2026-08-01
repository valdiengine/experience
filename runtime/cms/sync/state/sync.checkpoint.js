export class SyncCheckpoint {
  #checkpoints = new Map()
  #eventBus = null

  constructor() {
    this.#checkpoints = new Map()
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  save(entityType, provider, checkpoint) {
    const key = this.#key(entityType, provider)
    this.#checkpoints.set(key, {
      entityType,
      provider,
      checkpoint,
      savedAt: Date.now(),
    })
    return this.#checkpoints.get(key)
  }

  get(entityType, provider) {
    const key = this.#key(entityType, provider)
    return this.#checkpoints.get(key) || null
  }

  restore(entityType, provider) {
    const cp = this.get(entityType, provider)
    if (!cp) return null
    return cp.checkpoint
  }

  update(entityType, provider, checkpoint) {
    return this.save(entityType, provider, checkpoint)
  }

  remove(entityType, provider) {
    return this.#checkpoints.delete(this.#key(entityType, provider))
  }

  list(provider) {
    const results = []
    for (const entry of this.#checkpoints.values()) {
      if (!provider || entry.provider === provider) {
        results.push(entry)
      }
    }
    return results
  }

  getLatest(entityType) {
    let latest = null
    for (const entry of this.#checkpoints.values()) {
      if (entry.entityType === entityType) {
        if (!latest || entry.savedAt > latest.savedAt) {
          latest = entry
        }
      }
    }
    return latest
  }

  clear() {
    this.#checkpoints.clear()
  }

  count() {
    return this.#checkpoints.size
  }

  #key(entityType, provider) {
    return `${entityType}:${provider}`
  }
}

export default SyncCheckpoint
