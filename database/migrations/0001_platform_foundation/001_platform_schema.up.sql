-- Migration: 0001_platform_foundation
-- Description: Platform infrastructure tables
-- Order: 1
-- Layer: Platform
-- ERD Reference: VALDI_DATABASE_ERD.md

-- ============================================
-- PLATFORM LAYER TABLES
-- ============================================

-- tenants (Platform root tenant)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) DEFAULT 'company',
    status VARCHAR(50) DEFAULT 'active',
    domain VARCHAR(255),
    logo VARCHAR(500),
    favicon VARCHAR(500),
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    plan VARCHAR(50) DEFAULT 'free',
    plan_expires_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenant_type ON tenants(type);
CREATE INDEX IF NOT EXISTS idx_tenant_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenant_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenant_sort_order ON tenants(sort_order);

-- countries (ISO 3166-1 country definitions)
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(2) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    native_name VARCHAR(255),
    flag_emoji VARCHAR(10),
    flag_svg VARCHAR(500),
    currency VARCHAR(3),
    currency_symbol VARCHAR(10),
    phone_code VARCHAR(10),
    timezone VARCHAR(100),
    locale VARCHAR(10),
    date_format VARCHAR(50),
    time_format VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_country_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_country_currency ON countries(currency);
CREATE INDEX IF NOT EXISTS idx_country_timezone ON countries(timezone);
CREATE INDEX IF NOT EXISTS idx_country_locale ON countries(locale);

-- regions (Country subdivisions)
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    native_name VARCHAR(255),
    type VARCHAR(50) DEFAULT 'state',
    coordinates JSONB DEFAULT '{"lat": 0, "lng": 0}',
    bounding_box JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_region_country_id ON regions(country_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_region_country_code ON regions(country_id, code);
CREATE INDEX IF NOT EXISTS idx_region_sort_order ON regions(sort_order);

-- destinations (Tourism destinations)
CREATE TABLE IF NOT EXISTS destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) DEFAULT 'tourism',
    description TEXT,
    coordinates JSONB DEFAULT '{"lat": 0, "lng": 0}',
    branding JSONB DEFAULT '{}',
    seo JSONB DEFAULT '{}',
    maps JSONB DEFAULT '{}',
    analytics JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    enabled_categories JSONB DEFAULT '[]',
    enabled_modules JSONB DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destination_region_id ON destinations(region_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_destination_slug ON destinations(slug);
CREATE INDEX IF NOT EXISTS idx_destination_code ON destinations(code);
CREATE INDEX IF NOT EXISTS idx_destination_type ON destinations(type);
CREATE INDEX IF NOT EXISTS idx_destination_status ON destinations(status);
CREATE INDEX IF NOT EXISTS idx_destination_sort_order ON destinations(sort_order);

-- domains (DNS management)
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'website',
    subdomain VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    ssl_enabled BOOLEAN DEFAULT true,
    ssl_certificate JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_name ON domains(name);
CREATE INDEX IF NOT EXISTS idx_domain_destination_id ON domains(destination_id);
CREATE INDEX IF NOT EXISTS idx_domain_tenant_id ON domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_domain_subdomain ON domains(subdomain);
CREATE INDEX IF NOT EXISTS idx_domain_type ON domains(type);
CREATE INDEX IF NOT EXISTS idx_domain_is_primary ON domains(is_primary);

-- themes (Visual customization)
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) DEFAULT 'light',
    colors JSONB DEFAULT '{"primary": "#1976D2", "secondary": "#424242", "accent": "#FF5722", "background": "#FFFFFF", "surface": "#F5F5F5", "error": "#D32F2F", "success": "#388E3C", "warning": "#FFA000", "info": "#1976D2"}',
    typography JSONB DEFAULT '{"fontFamily": "system-ui, sans-serif", "headingFont": "system-ui, sans-serif", "bodyFont": "system-ui, sans-serif", "sizes": {}}',
    spacing JSONB DEFAULT '{}',
    border_radius JSONB DEFAULT '{}',
    shadows JSONB DEFAULT '{}',
    custom_css VARCHAR(10000),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_theme_slug ON themes(slug);
CREATE INDEX IF NOT EXISTS idx_theme_destination_id ON themes(destination_id);
CREATE INDEX IF NOT EXISTS idx_theme_tenant_id ON themes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_theme_is_default ON themes(is_default);
CREATE INDEX IF NOT EXISTS idx_theme_sort_order ON themes(sort_order);

-- languages (i18n support)
CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100),
    rtl BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_language_code ON languages(code);
CREATE INDEX IF NOT EXISTS idx_language_is_default ON languages(is_default);
CREATE INDEX IF NOT EXISTS idx_language_sort_order ON languages(sort_order);

-- Migration tracking
INSERT INTO _drizzle_migrations (name, hash, executed_at)
VALUES ('0001_platform_foundation', gen_random_uuid(), NOW())
ON CONFLICT DO NOTHING;
