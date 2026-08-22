/**
 * Application Persistence Module
 *
 * P15.9.6 - Application Builder Persistence Implementation
 *
 * Exports:
 * - ApplicationPersistence (abstract contract)
 * - FileApplicationPersistence (filesystem implementation)
 * - InMemoryApplicationPersistence (testing implementation)
 * - Error types
 * - Serialization utilities
 */

export {
  ApplicationPersistence,
  validateApplicationId,
  validateVersionId
} from './application.persistence.js'

export {
  FileApplicationPersistence,
  createFilePersistence
} from './file.application.persistence.js'

export {
  InMemoryApplicationPersistence,
  createInMemoryPersistence
} from './inmemory.application.persistence.js'

export {
  PERSISTENCE_ERROR_CODES,
  PersistenceError,
  ApplicationNotFoundError,
  VersionNotFoundError,
  DraftNotFoundError,
  InvalidIdentityError,
  VersionConflictError,
  IsolationViolationError,
  PathTraversalError,
  SerializationError,
  StorageError
} from './persistence.errors.js'

export {
  serialize,
  deserialize,
  safeRead,
  safeWrite,
  deepClone,
  deepFreeze,
  isMutable,
  makeMutable
} from './persistence.serialization.js'
