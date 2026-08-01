import { DRIZZLE_EVENTS, createDrizzleEvent } from './drizzle.events.js'
import { DrizzleError } from './drizzle.errors.js'

export class DrizzleTransactionAdapter {
  constructor(drizzleClient, postgresProvider, options = {}) {
    this.client = drizzleClient
    this.postgres = postgresProvider
    this.eventBus = options.eventBus || null
    this._activeTransactions = new Map()
    this._savepoints = new Map()
  }

  async begin(options = {}) {
    const tx = {
      id: this.#generateId(),
      status: 'active',
      startedAt: Date.now(),
      timeout: options.timeout || 30000,
      isolationLevel: options.isolationLevel || 'read_committed',
      retryAttempts: options.retryAttempts || 3,
    }
    try {
      const client = this.postgres.getConnection().getClient()
      await client.query('BEGIN')
      if (tx.isolationLevel !== 'read_committed') {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${tx.isolationLevel.replace(/_/g, ' ').toUpperCase()}`)
      }
      this._activeTransactions.set(tx.id, { ...tx, client })
      this.#emit(DRIZZLE_EVENTS.DRIZZLE_QUERY_EXECUTED, { operation: 'begin_transaction', transactionId: tx.id })
      return tx
    } catch (err) {
      throw new DrizzleError(`Drizzle transaction begin failed: ${err.message}`, { operation: 'beginTransaction', cause: err })
    }
  }

  async commit(txHandle) {
    const tx = this.#resolveTx(txHandle)
    if (tx.status !== 'active') throw new DrizzleError(`Cannot commit transaction in status "${tx.status}"`, { operation: 'commit', transactionId: tx.id })
    try {
      await tx.client.query('COMMIT')
      tx.status = 'committed'
      this.#cleanupSavepoints(tx.id)
      this._activeTransactions.delete(tx.id)
      this.#emit(DRIZZLE_EVENTS.DRIZZLE_QUERY_EXECUTED, { operation: 'commit_transaction', transactionId: tx.id })
    } catch (err) {
      tx.status = 'failed'
      throw new DrizzleError(`Drizzle transaction commit failed: ${err.message}`, { operation: 'commit', transactionId: tx.id, cause: err })
    }
  }

  async rollback(txHandle, reason) {
    const tx = this.#resolveTx(txHandle)
    if (tx.status === 'committed' || tx.status === 'rolled_back') return
    try {
      await tx.client.query('ROLLBACK')
      tx.status = 'rolled_back'
      tx.error = reason?.message || 'explicit rollback'
      this.#cleanupSavepoints(tx.id)
      this._activeTransactions.delete(tx.id)
      this.#emit(DRIZZLE_EVENTS.DRIZZLE_QUERY_EXECUTED, { operation: 'rollback_transaction', transactionId: tx.id, reason: tx.error })
    } catch (err) {
      throw new DrizzleError(`Drizzle transaction rollback failed: ${err.message}`, { operation: 'rollback', transactionId: tx.id, cause: err })
    }
  }

  async savepoint(txHandle, name) {
    const tx = this.#resolveTx(txHandle)
    const spName = name || `sp_${Date.now()}`
    try {
      await tx.client.query(`SAVEPOINT "${spName}"`)
      const sp = { id: this.#generateId(), name: spName, transactionId: tx.id, createdAt: Date.now() }
      const key = `${tx.id}:${spName}`
      this._savepoints.set(key, sp)
      return sp
    } catch (err) {
      throw new DrizzleError(`Drizzle savepoint creation failed: ${err.message}`, { operation: 'savepoint', transactionId: tx.id, savepointName: spName, cause: err })
    }
  }

  async rollbackToSavepoint(txHandle, savepoint) {
    const tx = this.#resolveTx(txHandle)
    const spName = typeof savepoint === 'string' ? savepoint : savepoint.name
    const key = `${tx.id}:${spName}`
    if (!this._savepoints.has(key)) throw new DrizzleError(`Savepoint "${spName}" not found`, { operation: 'rollbackToSavepoint', transactionId: tx.id })
    try {
      await tx.client.query(`ROLLBACK TO SAVEPOINT "${spName}"`)
      this._savepoints.delete(key)
    } catch (err) {
      throw new DrizzleError(`Drizzle savepoint rollback failed: ${err.message}`, { operation: 'rollbackToSavepoint', transactionId: tx.id, savepointName: spName, cause: err })
    }
  }

  async releaseSavepoint(txHandle, savepoint) {
    const tx = this.#resolveTx(txHandle)
    const spName = typeof savepoint === 'string' ? savepoint : savepoint.name
    const key = `${tx.id}:${spName}`
    if (!this._savepoints.has(key)) throw new DrizzleError(`Savepoint "${spName}" not found`, { operation: 'releaseSavepoint', transactionId: tx.id })
    try {
      await tx.client.query(`RELEASE SAVEPOINT "${spName}"`)
      this._savepoints.delete(key)
    } catch (err) {
      throw new DrizzleError(`Drizzle savepoint release failed: ${err.message}`, { operation: 'releaseSavepoint', transactionId: tx.id, savepointName: spName, cause: err })
    }
  }

  async withRetry(operationFn, txHandle, options = {}) {
    const maxAttempts = options.retryAttempts || 3
    const delay = options.retryDelay || 100
    let lastError = null
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operationFn(txHandle)
      } catch (err) {
        lastError = err
        if (this.#isRetryable(err) && attempt < maxAttempts) {
          await this.#sleep(delay * Math.pow(2, attempt - 1))
          try { await this.rollback(txHandle, err) } catch {}
        } else {
          throw err
        }
      }
    }
    throw lastError
  }

  #emit(event, data) {
    if (this.eventBus) {
      this.eventBus.emit(event, createDrizzleEvent(event, data))
    }
  }

  status(txHandle) {
    const tx = this._activeTransactions.get(typeof txHandle === 'string' ? txHandle : txHandle?.id)
    return tx ? tx.status : 'idle'
  }

  health() {
    return {
      activeTransactions: this._activeTransactions.size,
      activeSavepoints: this._savepoints.size,
      transactions: [...this._activeTransactions.values()].map(t => ({
        id: t.id, status: t.status, isolationLevel: t.isolationLevel, elapsed: Date.now() - t.startedAt,
      })),
    }
  }

  #resolveTx(txHandle) {
    const id = typeof txHandle === 'string' ? txHandle : txHandle?.id
    const tx = this._activeTransactions.get(id)
    if (!tx) throw new DrizzleError(`Transaction "${id}" not found`, { operation: 'resolveTx', transactionId: id })
    return tx
  }

  #cleanupSavepoints(transactionId) {
    for (const [key, sp] of this._savepoints) {
      if (sp.transactionId === transactionId) this._savepoints.delete(key)
    }
  }

  #isRetryable(err) {
    const msg = err?.message?.toLowerCase() || ''
    return msg.includes('deadlock') || msg.includes('serialization') || msg.includes('timeout')
  }

  #sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

  #generateId() {
    return `drizzle_tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

export default DrizzleTransactionAdapter
