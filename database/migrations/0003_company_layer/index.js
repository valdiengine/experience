/**
 * Migration: 0003_company_layer
 * Layer: Company (Layer 3)
 * Tables: companies, company_profiles, company_modules, company_settings
 * Dependencies: 0001_platform_foundation (tenants, destinations)
 */

export async function up(provider) {
  await provider.execute(`
    -- companies (tenant-isolated)
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(50) DEFAULT 'business',
      status VARCHAR(50) DEFAULT 'active',
      logo VARCHAR(500),
      cover_image VARCHAR(500),
      description TEXT,
      short_description VARCHAR(500),
      contact JSONB DEFAULT '{}',
      location JSONB DEFAULT '{}',
      hours JSONB DEFAULT '{}',
      social JSONB DEFAULT '{}',
      website VARCHAR(500),
      email VARCHAR(255),
      phone VARCHAR(50),
      tax_id VARCHAR(50),
      registration_number VARCHAR(100),
      founded_year INTEGER,
      employee_count VARCHAR(50),
      branding JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      settings JSONB DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_slug ON companies(slug);
    CREATE INDEX IF NOT EXISTS idx_company_tenant_id ON companies(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_company_destination_id ON companies(destination_id);
    CREATE INDEX IF NOT EXISTS idx_company_type ON companies(type);
    CREATE INDEX IF NOT EXISTS idx_company_status ON companies(status);
    CREATE INDEX IF NOT EXISTS idx_company_sort_order ON companies(sort_order);

    -- company_profiles (one-to-one with companies)
    CREATE TABLE IF NOT EXISTS company_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
      bio TEXT,
      story TEXT,
      mission TEXT,
      vision TEXT,
      values JSONB DEFAULT '[]',
      team JSONB DEFAULT '[]',
      awards JSONB DEFAULT '[]',
      certifications JSONB DEFAULT '[]',
      associations JSONB DEFAULT '[]',
      media JSONB DEFAULT '{}',
      gallery JSONB DEFAULT '[]',
      announcements JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      is_published BOOLEAN DEFAULT false,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_profile_company_id ON company_profiles(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_profile_is_published ON company_profiles(is_published);

    -- company_modules
    CREATE TABLE IF NOT EXISTS company_modules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      module_id UUID,
      module_code VARCHAR(100) NOT NULL,
      module_name VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      configuration JSONB DEFAULT '{}',
      permissions JSONB DEFAULT '[]',
      is_enabled BOOLEAN DEFAULT false,
      enabled_at TIMESTAMPTZ,
      disabled_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_module_company_module ON company_modules(company_id, module_code);
    CREATE INDEX IF NOT EXISTS idx_company_module_company_id ON company_modules(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_module_status ON company_modules(status);
    CREATE INDEX IF NOT EXISTS idx_company_module_is_enabled ON company_modules(is_enabled);

    -- company_settings (one-to-one with companies)
    CREATE TABLE IF NOT EXISTS company_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
      timezone VARCHAR(100) DEFAULT 'UTC',
      locale VARCHAR(10) DEFAULT 'en',
      currency VARCHAR(3) DEFAULT 'USD',
      date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',
      time_format VARCHAR(20) DEFAULT 'HH:mm',
      week_start_day INTEGER DEFAULT 0,
      business_rules JSONB DEFAULT '{}',
      booking_rules JSONB DEFAULT '{}',
      cancellation_policy JSONB DEFAULT '{}',
      payment_settings JSONB DEFAULT '{}',
      notification_settings JSONB DEFAULT '{}',
      privacy_settings JSONB DEFAULT '{}',
      integration_settings JSONB DEFAULT '{}',
      custom_fields JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_settings_timezone ON company_settings(timezone);
    CREATE INDEX IF NOT EXISTS idx_company_settings_locale ON company_settings(locale);
    CREATE INDEX IF NOT EXISTS idx_company_settings_currency ON company_settings(currency);

    -- Migration tracking
    INSERT INTO _drizzle_migrations (name, hash, executed_at)
    VALUES ('0003_company_layer', gen_random_uuid(), NOW())
    ON CONFLICT DO NOTHING;
  `)
}

export async function down(provider) {
  await provider.execute(`
    DROP TABLE IF EXISTS company_settings CASCADE;
    DROP TABLE IF EXISTS company_modules CASCADE;
    DROP TABLE IF EXISTS company_profiles CASCADE;
    DROP TABLE IF EXISTS companies CASCADE;
    DELETE FROM _drizzle_migrations WHERE name = '0003_company_layer';
  `)
}

export default { up, down }
