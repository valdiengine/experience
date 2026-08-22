/**
 * Owner Staging Identity Update CLI
 *
 * Updates credentials/identity metadata for the existing staging Owner.
 *
 * Usage (CLI):
 *   TURISTIC_ENV=staging node web/owner/bootstrap/owner-staging-update.js
 *
 * This is NOT called automatically on Passenger startup.
 * It is an explicit provisioning operation.
 */

import { updateStagingOwnerIdentity } from '../services/owner-identity.service.js'
import { isConnected, createPool, closePool } from '../../../database/connection/postgres.connection.js'

const REQUIRED_ENV_VARS = [
  'TARGET_OWNER_ID',
  'TARGET_APPLICATION_ID',
  'NEW_STAGING_OWNER_EMAIL',
  'NEW_STAGING_OWNER_PASSWORD',
  'NEW_STAGING_OWNER_NAME',
  'POSTGRES_HOST',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD'
]

const OPTIONAL_ENV_VARS = [
  'POSTGRES_PORT',
  'DATABASE_SSL'
]

if (process.env.TURISTIC_ENV !== 'staging') {
  console.error('ERROR: This script must run with TURISTIC_ENV=staging')
  console.error('Current TURISTIC_ENV:', process.env.TURISTIC_ENV || '(undefined)')
  process.exit(1)
}

function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v])
  if (missing.length > 0) {
    return { valid: false, missing }
  }
  return { valid: true }
}

function buildSafeResult(result) {
  return {
    action: result.action,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      status: result.user.status,
      password_changed_at: result.user.password_changed_at
    },
    grant: {
      application_id: result.grant.application_id,
      role: result.grant.role,
      status: result.grant.status
    }
  }
}

async function runUpdate() {
  const validation = validateEnvironment()

  if (!validation.valid) {
    console.error('ERROR: Missing required environment variables:', validation.missing.join(', '))
    process.exit(1)
  }

  createPool()

  const connected = await isConnected()
  if (!connected) {
    console.error('ERROR: PostgreSQL not connected')
    await closePool()
    process.exit(1)
  }

  try {
    const result = await updateStagingOwnerIdentity({
      userId: process.env.TARGET_OWNER_ID,
      applicationId: process.env.TARGET_APPLICATION_ID,
      email: process.env.NEW_STAGING_OWNER_EMAIL,
      password: process.env.NEW_STAGING_OWNER_PASSWORD,
      name: process.env.NEW_STAGING_OWNER_NAME
    })

    console.log('Update complete:', JSON.stringify(buildSafeResult(result), null, 2))
    await closePool()
    process.exit(0)
  } catch (error) {
    console.error('Update failed:', error.message)
    await closePool()
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runUpdate()
}

export {
  validateEnvironment,
  buildSafeResult
}

export default {
  validateEnvironment,
  buildSafeResult
}
