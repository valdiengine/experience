/**
 * Migration: 0006_owner_identity_grants
 * Layer: Owner Identity (Layer 6)
 * Tables: users, owner_application_grants
 * Dependencies: None (isolated from 0001-0005)
 */

export async function up(provider) {
  await provider.execute(`
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
  `);
}

export async function down(provider) {
  await provider.execute(`
    DROP INDEX IF EXISTS idx_oag_user_app_active;
    DROP INDEX IF EXISTS idx_oag_expires;
    DROP INDEX IF EXISTS idx_oag_app_status;
    DROP INDEX IF EXISTS idx_oag_user_status;
    DROP INDEX IF EXISTS idx_oag_application_id;
    DROP INDEX IF EXISTS idx_oag_user_id;
    DROP TABLE IF EXISTS owner_application_grants;
    DROP INDEX IF EXISTS idx_users_email;
    DROP TABLE IF EXISTS users;
  `);
}
