#!/usr/bin/env node

/**
 * Cleanup Expired Owner Sessions
 *
 * Removes expired active sessions from the owner_sessions table.
 *
 * This is a standalone maintenance command safe to run via cron.
 *
 * Usage:
 *   node scripts/maintenance/cleanup-expired-owner-sessions.js
 *
 * Exit codes:
 *   0 - Success (including 0 rows deleted)
 *   1 - Database error
 *   2 - Configuration error
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ROOT = join(__dirname, '..', '..')

process.chdir(ROOT)

async function main() {
  try {
    const { getEnvironment, validateConfig } = await import('../../database/config/database.config.js')

    const env = getEnvironment()

    if (env !== 'staging' && env !== 'production') {
      console.error('OWNER_SESSION_CLEANUP_ERROR environment=not_staging_or_production')
      process.exit(2)
    }

    const configValidation = validateConfig()
    if (!configValidation.valid) {
      console.error('OWNER_SESSION_CLEANUP_ERROR config_invalid')
      for (const err of configValidation.errors) {
        console.error(`OWNER_SESSION_CLEANUP_ERROR ${err}`)
      }
      process.exit(2)
    }

    const { cleanupExpiredSessions } = await import('../../web/owner/repositories/owner-session.repository.js')
    const { closePool } = await import('../../database/connection/postgres.connection.js')

    const cutoffTimestamp = new Date().toISOString()

    const deletedCount = await cleanupExpiredSessions(cutoffTimestamp, null)

    await closePool()

    console.log(`OWNER_SESSION_CLEANUP_OK deleted=${deletedCount}`)
    process.exit(0)
  } catch (error) {
    try {
      const { closePool } = await import('../../database/connection/postgres.connection.js')
      await closePool()
    } catch {
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('OWNER_SESSION_CLEANUP_ERROR database_unavailable')
    } else if (error.code === '28P01') {
      console.error('OWNER_SESSION_CLEANUP_ERROR authentication_failed')
    } else if (error.code === '3D000') {
      console.error('OWNER_SESSION_CLEANUP_ERROR database_not_found')
    } else {
      console.error('OWNER_SESSION_CLEANUP_ERROR unexpected_error')
    }

    process.exit(1)
  }
}

main()
