/**
 * Owner Session 1 — Staging Migration CLI
 *
 * One-shot deterministic migration for OWNER-SESSION-1 staging.
 *
 * Usage:
 *   node web/owner/bootstrap/owner-staging-migrate.js
 *
 * This script:
 * - Connects ONLY to staging PostgreSQL (TURISTIC_ENV=staging)
 * - Executes ONLY migration 0006 (users + owner_application_grants)
 * - Does NOT invoke migrations 0001-0005
 * - Does NOT initialize Drizzle
 * - Is safe to run multiple times (IF NOT EXISTS / CREATE INDEX IF NOT EXISTS)
 * - Returns non-zero on failure
 * - Does NOT log credentials
 *
 * Gate 2 authorized command:
 *   node web/owner/bootstrap/owner-staging-migrate.js
 */

import { createPool, query, closePool, isConnected } from '../../../database/connection/postgres.connection.js'

const MIGRATION_SQL = `
-- ============================================
-- USERS (Owner Identity)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_users_status CHECK (status IN ('active', 'disabled', 'locked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- OWNER APPLICATION GRANTS
-- ============================================
CREATE TABLE IF NOT EXISTS owner_application_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL DEFAULT 'business_owner',
  permissions JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_grant_status CHECK (status IN ('active', 'revoked')),
  CONSTRAINT chk_permissions_json CHECK (jsonb_typeof(permissions) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_oag_user_id ON owner_application_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_oag_application_id ON owner_application_grants(application_id);
CREATE INDEX IF NOT EXISTS idx_oag_user_status ON owner_application_grants(user_id, status);
CREATE INDEX IF NOT EXISTS idx_oag_app_status ON owner_application_grants(application_id, status);
CREATE INDEX IF NOT EXISTS idx_oag_expires ON owner_application_grants(expires_at)
  WHERE expires_at IS NOT NULL;

-- Partial unique index: one active grant per user per application
CREATE UNIQUE INDEX IF NOT EXISTS idx_oag_user_app_active
  ON owner_application_grants(user_id, application_id)
  WHERE status = 'active';
`

async function runMigration() {
  if (process.env.TURISTIC_ENV !== 'staging') {
    console.error('ERROR: This migration must run with TURISTIC_ENV=staging')
    console.error('Current TURISTIC_ENV:', process.env.TURISTIC_ENV || '(undefined)')
    process.exit(1)
  }

  console.log('[Migration] Starting OWNER-SESSION-1 migration for staging...')

  createPool()

  const connected = await isConnected()
  if (!connected) {
    console.error('[Migration] ERROR: PostgreSQL not connected')
    process.exit(1)
  }

  console.log('[Migration] Connected to staging PostgreSQL')

  try {
    await query(MIGRATION_SQL)
    console.log('[Migration] Migration 0006 executed successfully')
    console.log('[Migration] Tables created: users, owner_application_grants')
    console.log('[Migration] Indexes created successfully')
  } catch (error) {
    console.error('[Migration] ERROR:', error.message)
    await closePool()
    process.exit(1)
  }

  await closePool()
  console.log('[Migration] Pool closed')
  process.exit(0)
}

runMigration()
