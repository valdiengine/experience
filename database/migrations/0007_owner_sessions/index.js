/**
 * Migration: 0007_owner_sessions
 * Layer: Owner Session Persistence (Layer 6)
 * Table: owner_sessions
 * Dependencies: 0006_owner_identity_grants (users, owner_application_grants must exist)
 */

export async function up(provider) {
  await provider.execute(`
    CREATE TABLE IF NOT EXISTS owner_sessions (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         TEXT        NOT NULL
                            REFERENCES users(id)
                            ON DELETE CASCADE,
      application_id  TEXT        NOT NULL,
      token_hash      TEXT        NOT NULL UNIQUE,
      status          TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'revoked')),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at      TIMESTAMPTZ NOT NULL,
      revoked_at      TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_owner_sessions_user_id
      ON owner_sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_owner_sessions_expires
      ON owner_sessions(expires_at)
      WHERE status = 'active';
  `)
}

export async function down(provider) {
  await provider.execute(`
    DROP INDEX IF EXISTS idx_owner_sessions_expires;
    DROP INDEX IF EXISTS idx_owner_sessions_user_id;
    DROP TABLE IF EXISTS owner_sessions;
  `)
}
