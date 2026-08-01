import { RepositoryTransactionError } from '../errors/repository.errors.js'
import { UnitOfWork } from './unit-of-work.js'
import { REPOSITORY_EVENTS, createRepositoryEvent } from '../events/repository.events.js'

export class TransactionManager {
  #activeTransactions = new Map()
  #savepoints = new Map()
  #eventBus = null
  #config = {}

  constructor(config = {}) {
    this.#config = {
      defaultTimeout: config.defaultTimeout || 30000,
      defaultIsolationLevel: config.defaultIsolationLevel || 'read_committed',
      defaultRetryAttempts: config.defaultRetryAttempts || 3,
      maxNesting: config.maxNesting || 3,
      ...config,
    }
  }

  setEventBus(eventBus) { this.#eventBus = eventBus }

  get activeCount() { return this.#activeTransactions.size }

  async begin(options = {}) {
    const config = {
      timeout: options.timeout || this.#config.defaultTimeout,
      isolationLevel: options.isolationLevel || this.#config.defaultIsolationLevel,
      retryAttempts: options.retryAttempts || this.#config.defaultRetryAttempts,
      scope: options.scope || 'broadcast',
      transactionGroup: options.transactionGroup || null,
    }

    const tx = {
      id: this.#generateId(),
      status: 'active',
      startedAt: Date.now(),
      timeout: config.timeout,
      isolationLevel: config.isolationLevel,
      retryAttempts: config.retryAttempts,
      scope: config.scope,
      transactionGroup: config.transactionGroup,
      retryCount: 0,
      metadata: options.metadata || {},
    }

    const uow = new UnitOfWork({ depth: 0, eventBus: this.#eventBus })

    this.#activeTransactions.set(tx.id, { transaction: tx, unitOfWork: uow, timeoutHandle: null })
    this.#startTimeout(tx)

    this.#emit(REPOSITORY_EVENTS.TRANSACTION_STARTED, { transactionId: tx.id, isolationLevel: tx.isolationLevel })

    return { transaction: tx, unitOfWork: uow }
  }

  async commit(tx) {
    const entry = this.#getEntry(tx)
    if (entry.transaction.status !== 'active') {
      throw new RepositoryTransactionError(
        `Cannot commit transaction in status "${entry.transaction.status}"`,
        { operation: 'commit', transactionId: entry.transaction.id }
      )
    }
    try {
      this.#clearTimeout(entry)
      await entry.unitOfWork.commit()
      entry.transaction.status = 'committed'
      this.#emit(REPOSITORY_EVENTS.TRANSACTION_COMMITTED, { transactionId: entry.transaction.id })
    } catch (err) {
      entry.transaction.status = 'failed'
      entry.transaction.error = err.message
      this.#emit(REPOSITORY_EVENTS.TRANSACTION_ROLLED_BACK, { transactionId: entry.transaction.id, error: err.message })
      throw err
    } finally {
      this.#cleanup(tx)
    }
  }

  async rollback(tx, reason) {
    const entry = this.#getEntry(tx)
    if (entry.transaction.status === 'committed' || entry.transaction.status === 'rolled_back') return
    try {
      this.#clearTimeout(entry)
      await entry.unitOfWork.rollback(reason || new Error('Explicit rollback'))
      entry.transaction.status = 'rolled_back'
      entry.transaction.error = reason?.message || 'explicit rollback'
      this.#emit(REPOSITORY_EVENTS.TRANSACTION_ROLLED_BACK, {
        transactionId: entry.transaction.id,
        reason: reason?.message || 'explicit rollback',
      })
    } finally {
      this.#cleanup(tx)
    }
  }

  async savepoint(tx, name) {
    const entry = this.#getEntry(tx)
    if (entry.transaction.status !== 'active') {
      throw new RepositoryTransactionError(
        `Cannot create savepoint in transaction status "${entry.transaction.status}"`,
        { operation: 'savepoint', transactionId: entry.transaction.id }
      )
    }
    const sp = {
      id: this.#generateId(),
      name: name || `sp_${Date.now()}`,
      transactionId: entry.transaction.id,
      createdAt: Date.now(),
      unitOfWork: entry.unitOfWork.begin(),
    }
    const key = `${entry.transaction.id}:${sp.name}`
    this.#savepoints.set(key, sp)
    return sp
  }

  async rollbackToSavepoint(tx, sp) {
    const entry = this.#getEntry(tx)
    const key = `${entry.transaction.id}:${sp.name}`
    const saved = this.#savepoints.get(key)
    if (!saved) {
      throw new RepositoryTransactionError(
        `Savepoint "${sp.name}" not found in transaction "${entry.transaction.id}"`,
        { operation: 'rollbackToSavepoint', transactionId: entry.transaction.id, detail: sp.name }
      )
    }
    await saved.unitOfWork.rollback(new Error(`Rollback to savepoint: ${sp.name}`))
    entry.transaction.status = 'active'
    this.#savepoints.delete(key)
  }

  async releaseSavepoint(tx, sp) {
    const entry = this.#getEntry(tx)
    const key = `${entry.transaction.id}:${sp.name}`
    const saved = this.#savepoints.get(key)
    if (!saved) {
      throw new RepositoryTransactionError(
        `Savepoint "${sp.name}" not found in transaction "${entry.transaction.id}"`,
        { operation: 'releaseSavepoint', transactionId: entry.transaction.id, detail: sp.name }
      )
    }
    saved.unitOfWork.dispose()
    this.#savepoints.delete(key)
  }

  status(tx) {
    const entry = this.#activeTransactions.get(typeof tx === 'string' ? tx : tx?.id)
    if (!entry) return 'idle'
    return entry.transaction.status
  }

  getTransaction(id) {
    const entry = this.#activeTransactions.get(id)
    return entry ? entry.transaction : null
  }

  getUnitOfWork(tx) {
    const entry = this.#activeTransactions.get(typeof tx === 'string' ? tx : tx?.id)
    return entry ? entry.unitOfWork : null
  }

  health() {
    return {
      activeTransactions: this.#activeTransactions.size,
      activeSavepoints: this.#savepoints.size,
      config: { ...this.#config },
      transactions: [...this.#activeTransactions.values()].map(e => ({
        id: e.transaction.id,
        status: e.transaction.status,
        startedAt: e.transaction.startedAt,
        isolationLevel: e.transaction.isolationLevel,
        elapsed: Date.now() - e.transaction.startedAt,
      })),
    }
  }

  #getEntry(tx) {
    const id = typeof tx === 'string' ? tx : tx?.id
    const entry = this.#activeTransactions.get(id)
    if (!entry) {
      throw new RepositoryTransactionError(
        `Transaction "${id}" not found`,
        { operation: 'getEntry', transactionId: id }
      )
    }
    return entry
  }

  #startTimeout(txEntry) {
    const tx = txEntry.transaction
    if (tx.timeout > 0) {
      txEntry.timeoutHandle = setTimeout(() => {
        if (tx.status === 'active') {
          tx.status = 'failed'
          tx.error = 'Transaction timeout exceeded'
          this.#emit(REPOSITORY_EVENTS.TRANSACTION_ROLLED_BACK, {
            transactionId: tx.id,
            error: 'Transaction timeout exceeded',
          })
          this.#cleanup(tx)
        }
      }, tx.timeout)
    }
  }

  #clearTimeout(entry) {
    if (entry.timeoutHandle) {
      clearTimeout(entry.timeoutHandle)
      entry.timeoutHandle = null
    }
  }

  #cleanup(tx) {
    const id = typeof tx === 'string' ? tx : tx?.id
    this.#activeTransactions.delete(id)
    for (const [key, sp] of this.#savepoints) {
      if (sp.transactionId === id) {
        sp.unitOfWork.dispose()
        this.#savepoints.delete(key)
      }
    }
  }

  #generateId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createRepositoryEvent(event, { source: 'transaction-manager', ...data }))
    }
  }
}

export default TransactionManager
