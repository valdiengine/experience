import { OrmTransactionError, OrmConnectionError } from './orm.errors.js'

export class OrmTransactionBridge {
  constructor(config = {}) {
    this.config = config
    this.activeBridges = new Map()
    this.defaultOptions = {
      timeout: config.timeout || 30000,
      isolationLevel: config.isolationLevel || 'read_committed',
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 100,
      maxNesting: config.maxNesting || 3,
    }
  }

  async begin(unitOfWork, ormSession, options = {}) {
    const config = { ...this.defaultOptions, ...options }
    if (!ormSession || typeof ormSession !== 'object') {
      throw new OrmConnectionError('Invalid ORM session provided to transaction bridge', { operation: 'begin' })
    }
    const bridgeId = this.#generateId()
    const bridge = {
      id: bridgeId,
      unitOfWork,
      ormSession,
      status: 'active',
      startedAt: Date.now(),
      config,
      savepoints: [],
      retryCount: 0,
      error: null,
    }
    try {
      if (typeof ormSession.beginTransaction === 'function') {
        await ormSession.beginTransaction()
      }
      this.activeBridges.set(bridgeId, bridge)
      return bridge
    } catch (err) {
      throw new OrmTransactionError(`Failed to begin ORM transaction: ${err.message}`, {
        operation: 'begin',
        bridgeId,
        cause: err,
      })
    }
  }

  async commit(bridge) {
    this.#assertActive(bridge)
    try {
      if (bridge.unitOfWork.hasChanges) {
        await bridge.unitOfWork.commit()
      }
      if (typeof bridge.ormSession.commitTransaction === 'function') {
        await bridge.ormSession.commitTransaction()
      }
      bridge.status = 'committed'
      this.#cleanup(bridge)
    } catch (err) {
      bridge.status = 'failed'
      bridge.error = err.message
      throw new OrmTransactionError(`ORM transaction commit failed: ${err.message}`, {
        operation: 'commit',
        bridgeId: bridge.id,
        cause: err,
      })
    }
  }

  async rollback(bridge, reason) {
    if (bridge.status === 'committed' || bridge.status === 'rolled_back') return
    bridge.status = 'rolled_back'
    bridge.error = reason?.message || 'explicit rollback'
    try {
      await bridge.unitOfWork.rollback(reason || new Error('ORM transaction rollback'))
    } catch { }
    try {
      if (typeof bridge.ormSession.rollbackTransaction === 'function') {
        await bridge.ormSession.rollbackTransaction()
      }
    } catch { }
    this.#cleanup(bridge)
  }

  async savepoint(bridge, name) {
    this.#assertActive(bridge)
    if (bridge.savepoints.length >= this.defaultOptions.maxNesting) {
      throw new OrmTransactionError(
        `Savepoint nesting limit of ${this.defaultOptions.maxNesting} exceeded`,
        { operation: 'savepoint', bridgeId: bridge.id }
      )
    }
    const sp = {
      id: this.#generateId(),
      name: name || `sp_${bridge.savepoints.length + 1}`,
      createdAt: Date.now(),
      unitOfWork: bridge.unitOfWork.begin(),
    }
    try {
      if (typeof bridge.ormSession.savepoint === 'function') {
        await bridge.ormSession.savepoint(sp.name)
      }
      bridge.savepoints.push(sp)
      return sp
    } catch (err) {
      throw new OrmTransactionError(`Failed to create savepoint: ${err.message}`, {
        operation: 'savepoint',
        bridgeId: bridge.id,
        savepointName: sp.name,
        cause: err,
      })
    }
  }

  async rollbackToSavepoint(bridge, savepoint) {
    this.#assertActive(bridge)
    const sp = bridge.savepoints.find(s => s.name === (savepoint.name || savepoint))
    if (!sp) throw new OrmTransactionError(`Savepoint not found: ${savepoint.name || savepoint}`, {
      operation: 'rollbackToSavepoint', bridgeId: bridge.id,
    })
    try {
      await sp.unitOfWork.rollback(new Error(`Rollback to savepoint: ${sp.name}`))
      if (typeof bridge.ormSession.rollbackToSavepoint === 'function') {
        await bridge.ormSession.rollbackToSavepoint(sp.name)
      }
      bridge.savepoints = bridge.savepoints.filter(s => s.id !== sp.id)
    } catch (err) {
      throw new OrmTransactionError(`Failed to rollback to savepoint: ${err.message}`, {
        operation: 'rollbackToSavepoint', bridgeId: bridge.id, savepointName: sp.name, cause: err,
      })
    }
  }

  async releaseSavepoint(bridge, savepoint) {
    this.#assertActive(bridge)
    const sp = bridge.savepoints.find(s => s.name === (savepoint.name || savepoint))
    if (!sp) throw new OrmTransactionError(`Savepoint not found: ${savepoint.name || savepoint}`, {
      operation: 'releaseSavepoint', bridgeId: bridge.id,
    })
    try {
      sp.unitOfWork.dispose()
      if (typeof bridge.ormSession.releaseSavepoint === 'function') {
        await bridge.ormSession.releaseSavepoint(sp.name)
      }
      bridge.savepoints = bridge.savepoints.filter(s => s.id !== sp.id)
    } catch (err) {
      throw new OrmTransactionError(`Failed to release savepoint: ${err.message}`, {
        operation: 'releaseSavepoint', bridgeId: bridge.id, savepointName: sp.name, cause: err,
      })
    }
  }

  async withRetry(operationFn, bridge, options = {}) {
    const maxAttempts = options.retryAttempts || this.defaultOptions.retryAttempts
    const delay = options.retryDelay || this.defaultOptions.retryDelay
    let lastError = null
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        bridge.retryCount = attempt - 1
        return await operationFn(bridge)
      } catch (err) {
        lastError = err
        if (this.#isRetryable(err) && attempt < maxAttempts) {
          await this.#sleep(delay * Math.pow(2, attempt - 1))
          if (bridge.status === 'active') {
            try { await this.rollback(bridge, err) } catch { }
          }
        } else {
          throw err
        }
      }
    }
    throw lastError
  }

  status(bridge) {
    if (!bridge) return 'idle'
    return bridge.status
  }

  health() {
    return {
      activeBridges: this.activeBridges.size,
      config: { ...this.defaultOptions },
      bridges: [...this.activeBridges.values()].map(b => ({
        id: b.id,
        status: b.status,
        startedAt: b.startedAt,
        elapsed: Date.now() - b.startedAt,
        savepointCount: b.savepoints.length,
        retryCount: b.retryCount,
      })),
    }
  }

  #assertActive(bridge) {
    if (!bridge) throw new OrmTransactionError('Bridge is null', { operation: 'assertActive' })
    if (bridge.status !== 'active') {
      throw new OrmTransactionError(
        `Bridge is in status "${bridge.status}", expected "active"`,
        { operation: 'assertActive', bridgeId: bridge.id }
      )
    }
  }

  #cleanup(bridge) {
    this.activeBridges.delete(bridge.id)
  }

  #isRetryable(err) {
    const msg = err?.message?.toLowerCase() || ''
    return msg.includes('deadlock') || msg.includes('serialization') || msg.includes('timeout') ||
      msg.includes('connection') || msg.includes('locked')
  }

  #sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

  #generateId() {
    return `bridge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

export default OrmTransactionBridge
