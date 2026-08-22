/**
 * Owner Staging Bootstrap
 *
 * Explicit one-time staging bootstrap for owner identity.
 *
 * Usage (CLI):
 *   TURISTIC_ENV=staging node web/owner/bootstrap/owner-staging-bootstrap.js
 *
 * This is NOT called automatically on Passenger startup.
 * It is an explicit provisioning operation.
 */

import { bootstrapStagingOwner } from '../services/owner-identity.service.js'
import { isConnected, createPool, closePool } from '../../../database/connection/postgres.connection.js'

const REQUIRED_ENV_VARS = [
  'STAGING_OWNER_EMAIL',
  'STAGING_OWNER_PASSWORD'
]

if (process.env.TURISTIC_ENV !== 'staging') {
  console.error('ERROR: Bootstrap must run with TURISTIC_ENV=staging')
  console.error('Current TURISTIC_ENV:', process.env.TURISTIC_ENV || '(undefined)')
  process.exit(1)
}

export function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v])

  if (missing.length > 0) {
    return {
      valid: false,
      missing
    }
  }

  return { valid: true }
}

export async function runStagingBootstrap() {
  const validation = validateEnvironment()

  if (!validation.valid) {
    throw new Error(`Missing required environment variables: ${validation.missing.join(', ')}`)
  }

  createPool()

  const connected = await isConnected()

  if (!connected) {
    throw new Error('PostgreSQL not connected')
  }

  const result = await bootstrapStagingOwner({
    email: process.env.STAGING_OWNER_EMAIL,
    password: process.env.STAGING_OWNER_PASSWORD,
    name: process.env.STAGING_OWNER_NAME,
    applicationId: process.env.STAGING_OWNER_APPLICATION_ID || 'valdi.app/albasie'
  })

  return result
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runStagingBootstrap()
    .then(async (result) => {
      const safeResult = {
        user: result.user ? {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          status: result.user.status
        } : null,
        grant: result.grant ? {
          application_id: result.grant.application_id,
          role: result.grant.role,
          status: result.grant.status
        } : null,
        action: result.action
      }
      console.log('Bootstrap complete:', JSON.stringify(safeResult, null, 2))
      await closePool()
      process.exit(0)
    })
    .catch(async (error) => {
      console.error('Bootstrap failed:', error.message)
      await closePool()
      process.exit(1)
    })
}

export default {
  validateEnvironment,
  runStagingBootstrap
}
