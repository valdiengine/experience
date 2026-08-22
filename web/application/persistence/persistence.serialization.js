/**
 * Persistence Serialization
 *
 * P15.9.6 - Application Builder Persistence Implementation
 *
 * Handles safe serialization/deserialization of application data.
 * Framework-free implementation using native JSON.
 */

import { SerializationError } from './persistence.errors.js'

export function serialize(data) {
  if (data === undefined) {
    return null
  }

  try {
    return JSON.stringify(data, null, 2)
  } catch (error) {
    throw new SerializationError(`Failed to serialize: ${error.message}`)
  }
}

export function deserialize(json) {
  if (json === null || json === undefined || json === '') {
    return null
  }

  if (typeof json !== 'string') {
    throw new SerializationError('Input must be a string')
  }

  try {
    return JSON.parse(json)
  } catch (error) {
    throw new SerializationError(`Failed to parse JSON: ${error.message}`)
  }
}

export function safeRead(filePath, fs) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return deserialize(content)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }
    throw new SerializationError(`Failed to read file: ${error.message}`)
  }
}

export function safeWrite(filePath, data, fs) {
  const content = serialize(data)

  const tempPath = filePath + '.tmp'

  try {
    fs.writeFileSync(tempPath, content, 'utf8')
    fs.renameSync(tempPath, filePath)
  } catch (error) {
    try {
      fs.unlinkSync(tempPath)
    } catch {
      // Ignore cleanup errors
    }
    throw new SerializationError(`Failed to write file: ${error.message}`)
  }
}

export function deepClone(data) {
  if (data === null || data === undefined) {
    return data
  }

  return JSON.parse(JSON.stringify(data))
}

export function deepFreeze(data) {
  if (data === null || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return Object.freeze(data.map(item => deepFreeze(item)))
  }

  const frozen = {}
  for (const [key, value] of Object.entries(data)) {
    frozen[key] = deepFreeze(value)
  }

  return Object.freeze(frozen)
}

export function isMutable(data) {
  if (data === null || data === undefined) {
    return false
  }

  if (typeof data !== 'object') {
    return false
  }

  if (Array.isArray(data)) {
    return Object.isExtensible(data)
  }

  return Object.isExtensible(data)
}

export function makeMutable(data) {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => makeMutable(item))
  }

  const mutable = {}
  for (const [key, value] of Object.entries(data)) {
    mutable[key] = makeMutable(value)
  }

  return mutable
}

export default {
  serialize,
  deserialize,
  safeRead,
  safeWrite,
  deepClone,
  deepFreeze,
  isMutable,
  makeMutable
}
