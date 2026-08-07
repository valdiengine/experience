/**
 * Environment Loader
 *
 * Loads environment variables from .env files based on NODE_ENV.
 * Supports: development, testing, production
 *
 * @version 4.1
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, isAbsolute } from 'path'

/**
 * Environment file suffixes by environment
 */
const ENV_FILES = {
  development: ['.env.development', '.env.local', '.env'],
  testing: ['.env.test', '.env.local', '.env'],
  production: ['.env.production', '.env.local', '.env'],
}

/**
 * Default encoding for env files
 */
const ENCODING = 'utf8'

/**
 * Load environment from files
 */
export function loadEnv(options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env.NODE_ENV || 'development',
    silent = false,
    override = true,
  } = options

  const files = ENV_FILES[env] || ENV_FILES.development

  if (!silent) {
    console.log(`[Environment] Loading environment: ${env}`)
  }

  let loadedCount = 0

  for (const file of files) {
    const filePath = isAbsolute(file) ? file : resolve(cwd, file)

    if (existsSync(filePath)) {
      loadFile(filePath, { silent, override })
      loadedCount++
      if (!silent) {
        console.log(`[Environment] Loaded: ${file}`)
      }
    }
  }

  if (!silent && loadedCount === 0) {
    console.warn(`[Environment] No .env files found for environment: ${env}`)
  }

  return loadedCount > 0
}

/**
 * Load environment from a single file
 */
function loadFile(filePath, options = {}) {
  const { silent = false, override = true } = options

  try {
    const content = readFileSync(filePath, ENCODING)
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      // Parse KEY=VALUE
      const equalsIndex = trimmed.indexOf('=')
      if (equalsIndex === -1) {
        if (!silent) {
          console.warn(`[Environment] Invalid line in .env: ${line}`)
        }
        continue
      }

      const key = trimmed.substring(0, equalsIndex).trim()
      let value = trimmed.substring(equalsIndex + 1).trim()

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      // Set environment variable
      if (override || !process.env.hasOwnProperty(key)) {
        process.env[key] = value
      }
    }
  } catch (error) {
    if (!silent) {
      console.error(`[Environment] Error loading ${filePath}: ${error.message}`)
    }
  }
}

/**
 * Get environment name
 */
export function getEnvName() {
  return process.env.NODE_ENV || 'development'
}

/**
 * Check if environment is production
 */
export function isProduction() {
  return getEnvName() === 'production'
}

/**
 * Check if environment is development
 */
export function isDevelopment() {
  return getEnvName() === 'development'
}

/**
 * Check if environment is testing
 */
export function isTesting() {
  return getEnvName() === 'testing'
}

/**
 * Get required environment variables
 */
export function getRequiredEnvVars(requiredVars) {
  const missing = []

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }

  return {
    complete: missing.length === 0,
    missing,
  }
}

/**
 * Validate required environment variables
 */
export function validateEnv(requiredVars = []) {
  const { complete, missing } = getRequiredEnvVars(requiredVars)

  if (!complete) {
    console.error(`[Environment] Missing required environment variables:`)
    for (const varName of missing) {
      console.error(`  - ${varName}`)
    }
  }

  return complete
}

export default {
  loadEnv,
  getEnvName,
  isProduction,
  isDevelopment,
  isTesting,
  getRequiredEnvVars,
  validateEnv,
}
