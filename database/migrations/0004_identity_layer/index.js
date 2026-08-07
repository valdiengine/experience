/**
 * Migration: 0004_identity_layer
 * Layer: Identity (Layer 4)
 * Tables: users, roles, permissions, user_roles, user_sessions
 * Dependencies: 0001_platform_foundation (tenants), 0003_company_layer (companies)
 */

export async function up(provider) {
  await provider.execute(`
    -- users (tenant-isolated with optional company)
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
      company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
      email VARCHAR(255) NOT NULL,
      username VARCHAR(100),
      password_hash VARCHAR(255),
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      display_name VARCHAR(255),
      avatar VARCHAR(500),
      type VARCHAR(50) DEFAULT 'user',
      status VARCHAR(50) DEFAULT 'active',
      email_verified BOOLEAN DEFAULT false,
      phone_verified BOOLEAN DEFAULT false,
      phone VARCHAR(50),
      preferred_language VARCHAR(10),
      preferred_currency VARCHAR(3),
      timezone VARCHAR(100),
      profile JSONB DEFAULT '{}',
      preferences JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      last_login_at TIMESTAMPTZ,
      last_activity_at TIMESTAMPTZ,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMPTZ,
      password_changed_at TIMESTAMPTZ,
      mfa_enabled BOOLEAN DEFAULT false,
      mfa_secret VARCHAR(255),
      mfa_methods JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON users(email);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_username ON users(username) WHERE username IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_user_tenant_id ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_user_company_id ON users(company_id);
    CREATE INDEX IF NOT EXISTS idx_user_type ON users(type);
    CREATE INDEX IF NOT EXISTS idx_user_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON users(deleted_at);

    -- roles (platform or tenant-scoped)
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      type VARCHAR(50) DEFAULT 'custom',
      description TEXT,
      permissions JSONB DEFAULT '[]',
      is_system BOOLEAN DEFAULT false,
      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_role_tenant_company_slug ON roles(tenant_id, company_id, slug) WHERE tenant_id IS NOT NULL OR company_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_role_tenant_id ON roles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_role_company_id ON roles(company_id);
    CREATE INDEX IF NOT EXISTS idx_role_type ON roles(type);
    CREATE INDEX IF NOT EXISTS idx_role_is_system ON roles(is_system);
    CREATE INDEX IF NOT EXISTS idx_role_is_default ON roles(is_default);

    -- permissions (platform-wide)
    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      resource VARCHAR(100) NOT NULL,
      action VARCHAR(50) NOT NULL,
      description TEXT,
      attributes JSONB DEFAULT '[]',
      conditions JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_slug ON permissions(slug);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_resource_action ON permissions(resource, action);
    CREATE INDEX IF NOT EXISTS idx_permission_resource ON permissions(resource);
    CREATE INDEX IF NOT EXISTS idx_permission_action ON permissions(action);

    -- user_roles (junction table with tenant/company scope)
    CREATE TABLE IF NOT EXISTS user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT true,
      granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_role_user_role ON user_roles(user_id, role_id);
    CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_role_role_id ON user_roles(role_id);
    CREATE INDEX IF NOT EXISTS idx_user_role_tenant_id ON user_roles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_user_role_company_id ON user_roles(company_id);

    -- user_sessions
    CREATE TABLE IF NOT EXISTS user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      refresh_token_hash VARCHAR(255),
      device_info JSONB DEFAULT '{}',
      ip_address VARCHAR(45),
      user_agent TEXT,
      type VARCHAR(50) DEFAULT 'web',
      status VARCHAR(50) DEFAULT 'active',
      expires_at TIMESTAMPTZ,
      last_activity_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_session_token_hash ON user_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_session_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_session_status ON user_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_user_session_expires_at ON user_sessions(expires_at);

    -- Migration tracking
    INSERT INTO _drizzle_migrations (name, hash, executed_at)
    VALUES ('0004_identity_layer', gen_random_uuid(), NOW())
    ON CONFLICT DO NOTHING;
  `)
}

export async function down(provider) {
  await provider.execute(`
    DROP TABLE IF EXISTS user_sessions CASCADE;
    DROP TABLE IF EXISTS user_roles CASCADE;
    DROP TABLE IF EXISTS permissions CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DELETE FROM _drizzle_migrations WHERE name = '0004_identity_layer';
  `)
}

export default { up, down }
