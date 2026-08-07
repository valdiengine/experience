/**
 * Migration: 0002_ecosystem_layer
 * Layer: Ecosystem (Layer 2)
 * Tables: ecosystems, categories, modules, experiences
 * Dependencies: 0001_platform_foundation (destinations)
 */

export async function up(provider) {
  await provider.execute(`
    -- ecosystems
    CREATE TABLE IF NOT EXISTS ecosystems (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(50) DEFAULT 'tourism',
      description TEXT,
      logo VARCHAR(500),
      cover_image VARCHAR(500),
      branding JSONB DEFAULT '{}',
      configuration JSONB DEFAULT '{}',
      features JSONB DEFAULT '[]',
      settings JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_ecosystem_slug ON ecosystems(slug);
    CREATE INDEX IF NOT EXISTS idx_ecosystem_destination_id ON ecosystems(destination_id);
    CREATE INDEX IF NOT EXISTS idx_ecosystem_type ON ecosystems(type);
    CREATE INDEX IF NOT EXISTS idx_ecosystem_status ON ecosystems(status);
    CREATE INDEX IF NOT EXISTS idx_ecosystem_sort_order ON ecosystems(sort_order);

    -- categories (self-referential for hierarchy)
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ecosystem_id UUID NOT NULL REFERENCES ecosystems(id) ON DELETE CASCADE,
      parent_id UUID,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(50) DEFAULT 'general',
      icon VARCHAR(100),
      description TEXT,
      image VARCHAR(500),
      metadata JSONB DEFAULT '{}',
      settings JSONB DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_category_slug ON categories(slug);
    CREATE INDEX IF NOT EXISTS idx_category_ecosystem_id ON categories(ecosystem_id);
    CREATE INDEX IF NOT EXISTS idx_category_parent_id ON categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_category_type ON categories(type);
    CREATE INDEX IF NOT EXISTS idx_category_status ON categories(status);
    CREATE INDEX IF NOT EXISTS idx_category_sort_order ON categories(sort_order);

    -- modules
    CREATE TABLE IF NOT EXISTS modules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ecosystem_id UUID NOT NULL REFERENCES ecosystems(id) ON DELETE CASCADE,
      code VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(50) DEFAULT 'feature',
      description TEXT,
      version VARCHAR(20) DEFAULT '1.0.0',
      icon VARCHAR(100),
      configuration JSONB DEFAULT '{}',
      capabilities JSONB DEFAULT '[]',
      permissions JSONB DEFAULT '[]',
      dependencies JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      settings JSONB DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      is_enabled BOOLEAN DEFAULT false,
      is_built_in BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_module_slug ON modules(slug);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_module_ecosystem_code ON modules(ecosystem_id, code);
    CREATE INDEX IF NOT EXISTS idx_module_ecosystem_id ON modules(ecosystem_id);
    CREATE INDEX IF NOT EXISTS idx_module_type ON modules(type);
    CREATE INDEX IF NOT EXISTS idx_module_status ON modules(status);
    CREATE INDEX IF NOT EXISTS idx_module_is_enabled ON modules(is_enabled);
    CREATE INDEX IF NOT EXISTS idx_module_sort_order ON modules(sort_order);

    -- experiences
    CREATE TABLE IF NOT EXISTS experiences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ecosystem_id UUID NOT NULL REFERENCES ecosystems(id) ON DELETE CASCADE,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(50) DEFAULT 'tourism',
      description TEXT,
      short_description VARCHAR(500),
      image VARCHAR(500),
      gallery JSONB DEFAULT '[]',
      location JSONB DEFAULT '{}',
      navigation JSONB DEFAULT '{}',
      layouts JSONB DEFAULT '{}',
      workflows JSONB DEFAULT '{}',
      permissions JSONB DEFAULT '{}',
      i18n JSONB DEFAULT '{}',
      seo JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      settings JSONB DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'draft',
      is_active BOOLEAN DEFAULT true,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_experience_slug ON experiences(slug);
    CREATE INDEX IF NOT EXISTS idx_experience_ecosystem_id ON experiences(ecosystem_id);
    CREATE INDEX IF NOT EXISTS idx_experience_category_id ON experiences(category_id);
    CREATE INDEX IF NOT EXISTS idx_experience_type ON experiences(type);
    CREATE INDEX IF NOT EXISTS idx_experience_status ON experiences(status);
    CREATE INDEX IF NOT EXISTS idx_experience_sort_order ON experiences(sort_order);

    -- Migration tracking
    INSERT INTO _drizzle_migrations (name, hash, executed_at)
    VALUES ('0002_ecosystem_layer', gen_random_uuid(), NOW())
    ON CONFLICT DO NOTHING;
  `)
}

export async function down(provider) {
  await provider.execute(`
    DROP TABLE IF EXISTS experiences CASCADE;
    DROP TABLE IF EXISTS modules CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS ecosystems CASCADE;
    DELETE FROM _drizzle_migrations WHERE name = '0002_ecosystem_layer';
  `)
}

export default { up, down }
