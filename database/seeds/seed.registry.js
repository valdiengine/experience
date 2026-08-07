/**
 * Seed Registry
 *
 * Defines all seed data following the hierarchy:
 * Platform → Country → Region → Destination → Experience → Company → Modules
 */

export const SEED_ORDER = [
  { phase: 'platform', order: 1, name: 'tenants' },
  { phase: 'platform', order: 2, name: 'configurations' },
  { phase: 'platform', order: 3, name: 'audit' },
  { phase: 'ecosystem', order: 4, name: 'countries' },
  { phase: 'ecosystem', order: 5, name: 'regions' },
  { phase: 'ecosystem', order: 6, name: 'destinations' },
  { phase: 'ecosystem', order: 7, name: 'experiences' },
  { phase: 'ecosystem', order: 8, name: 'categories' },
  { phase: 'company', order: 9, name: 'businesses' },
  { phase: 'company', order: 10, name: 'teams' },
  { phase: 'modules', order: 11, name: 'reservations' },
  { phase: 'modules', order: 12, name: 'payments' },
  { phase: 'modules', order: 13, name: 'notifications' },
]

export const PLATFORM_SEEDS = {
  platform: [
    {
      name: 'platform_tenant',
      description: 'Create platform master tenant',
      order: 1,
      async exists(provider) {
        const result = await provider.execute('SELECT 1 FROM tenants WHERE slug = $1', ['platform'])
        return result.rows?.length > 0
      },
      async execute(provider) {
        return provider.execute(
          `INSERT INTO tenants (id, name, slug, type, status, config, created_at, updated_at)
           VALUES (gen_random_uuid(), 'Valdi Platform', 'platform', 'platform', 'active', '{"version": "4.1"}', NOW(), NOW())
           ON CONFLICT (slug) DO NOTHING`,
        )
      },
    },
    {
      name: 'default_configurations',
      description: 'Create default platform configurations',
      order: 2,
      async exists(provider) {
        const result = await provider.execute('SELECT COUNT(*) FROM configurations')
        return parseInt(result.rows?.[0]?.count || 0) > 0
      },
      async execute(provider) {
        const configs = [
          { key: 'platform.timezone', value: { default: 'UTC', allowed: ['UTC', 'America/New_York', 'Europe/Madrid'] } },
          { key: 'platform.locale', value: { default: 'en', allowed: ['en', 'es', 'fr', 'de'] } },
          { key: 'platform.currency', value: { default: 'USD', allowed: ['USD', 'EUR', 'GBP'] } },
          { key: 'platform.date_format', value: 'YYYY-MM-DD' },
          { key: 'platform.time_format', value: 'HH:mm:ss' },
        ]

        const tenantResult = await provider.execute("SELECT id FROM tenants WHERE slug = 'platform'")
        const tenantId = tenantResult.rows?.[0]?.id

        for (const config of configs) {
          await provider.execute(
            `INSERT INTO configurations (id, tenant_id, category, key, value, version, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, 'platform', $2, $3, 1, NOW(), NOW())
             ON CONFLICT (tenant_id, category, key) DO UPDATE SET value = $3, version = configurations.version + 1`,
            [tenantId, config.key, JSON.stringify(config.value)],
          )
        }

        return { count: configs.length }
      },
    },
  ],
}

export const ECOSYSTEM_SEEDS = [
  {
    name: 'country_es',
    description: 'Create Spain country entry',
    countryCode: 'ES',
    async exists(provider) {
      const result = await provider.execute("SELECT 1 FROM countries WHERE code = 'ES'")
      return result.rows?.length > 0
    },
    async execute(provider) {
      return provider.execute(
        `INSERT INTO countries (id, code, name, flag, currency, timezone, locale, created_at, updated_at)
         VALUES (gen_random_uuid(), 'ES', 'Spain', '🇪🇸', 'EUR', 'Europe/Madrid', 'es-ES', NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
      )
    },
  },
  {
    name: 'country_us',
    description: 'Create United States country entry',
    countryCode: 'US',
    async exists(provider) {
      const result = await provider.execute("SELECT 1 FROM countries WHERE code = 'US'")
      return result.rows?.length > 0
    },
    async execute(provider) {
      return provider.execute(
        `INSERT INTO countries (id, code, name, flag, currency, timezone, locale, created_at, updated_at)
         VALUES (gen_random_uuid(), 'US', 'United States', '🇺🇸', 'USD', 'America/New_York', 'en-US', NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
      )
    },
  },
  {
    name: 'country_mx',
    description: 'Create Mexico country entry',
    countryCode: 'MX',
    async exists(provider) {
      const result = await provider.execute("SELECT 1 FROM countries WHERE code = 'MX'")
      return result.rows?.length > 0
    },
    async execute(provider) {
      return provider.execute(
        `INSERT INTO countries (id, code, name, flag, currency, timezone, locale, created_at, updated_at)
         VALUES (gen_random_uuid(), 'MX', 'Mexico', '🇲🇽', 'MXN', 'America/Mexico_City', 'es-MX', NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
      )
    },
  },
  {
    name: 'region_es_md',
    description: 'Create Madrid region',
    countryCode: 'ES',
    async exists(provider) {
      const countryResult = await provider.execute("SELECT id FROM countries WHERE code = 'ES'")
      const countryId = countryResult.rows?.[0]?.id
      const result = await provider.execute('SELECT 1 FROM regions WHERE country_id = $1 AND code = $2', [countryId, 'MD'])
      return result.rows?.length > 0
    },
    async execute(provider) {
      const countryResult = await provider.execute("SELECT id FROM countries WHERE code = 'ES'")
      const countryId = countryResult.rows?.[0]?.id
      return provider.execute(
        `INSERT INTO regions (id, country_id, code, name, coordinates, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'MD', 'Community of Madrid', '{"lat": 40.4168, "lng": -3.7038}', NOW(), NOW())
         ON CONFLICT (country_id, code) DO NOTHING`,
        [countryId],
      )
    },
  },
  {
    name: 'destination_madrid_tourism',
    description: 'Create Madrid Tourism experience destination',
    async exists(provider) {
      const result = await provider.execute("SELECT 1 FROM destinations WHERE slug = 'madrid-tourism'")
      return result.rows?.length > 0
    },
    async execute(provider) {
      const regionResult = await provider.execute(
        `SELECT r.id FROM regions r JOIN countries c ON r.country_id = c.id WHERE c.code = 'ES' AND r.code = 'MD'`,
      )
      const regionId = regionResult.rows?.[0]?.id
      const tenantResult = await provider.execute("SELECT id FROM tenants WHERE slug = 'platform'")
      const tenantId = tenantResult.rows?.[0]?.id

      return provider.execute(
        `INSERT INTO destinations (id, region_id, tenant_id, code, name, slug, domain, subdomain, description, coordinates, branding, seo, maps, analytics, enabled_categories, enabled_modules, status, created_at, updated_at)
         VALUES (
           gen_random_uuid(), $1, $2, 'MAD-TR', 'Madrid Tourism', 'madrid-tourism', 'madrid.valdi.es', 'tourism.madrid.valdi.es',
           'Official tourism platform for Madrid',
           '{"lat": 40.4168, "lng": -3.7038}',
           '{"primary": "#C40D1E", "secondary": "#FFD700"}',
           '{"title": "Visit Madrid", "description": "Discover the capital of Spain"}',
           '{"google_maps_key": "AIzaSy..."}',
           '{"analytics_id": "G-XXXXX"}',
           '["tourism", "accommodation", "restaurant", "activity"]',
           '["reservation", "payment", "notification"]',
           'active', NOW(), NOW()
         )
         ON CONFLICT (slug) DO NOTHING`,
        [regionId, tenantId],
      )
    },
  },
]

export const COMPANY_SEEDS = [
  {
    name: 'demo_business',
    description: 'Create demo restaurant business',
    async exists(provider) {
      const result = await provider.execute("SELECT 1 FROM businesses WHERE slug = 'demo-restaurant-madrid'")
      return result.rows?.length > 0
    },
    async execute(provider) {
      const destResult = await provider.execute("SELECT id FROM destinations WHERE slug = 'madrid-tourism'")
      const destId = destResult.rows?.[0]?.id
      const tenantResult = await provider.execute("SELECT id FROM tenants WHERE slug = 'platform'")
      const tenantId = tenantResult.rows?.[0]?.id

      return provider.execute(
        `INSERT INTO businesses (id, tenant_id, destination_id, name, slug, type, description, contact, location, hours, branding, status, created_at, updated_at)
         VALUES (
           gen_random_uuid(), $1, $2, 'Demo Restaurant Madrid', 'demo-restaurant-madrid', 'restaurant',
           'A demo restaurant for testing purposes',
           '{"email": "demo@restaurant.com", "phone": "+34 912 345 678"}',
           '{"address": "Calle Gran Via 1", "city": "Madrid", "coordinates": {"lat": 40.4168, "lng": -3.7038}}',
           '{"monday": {"open": "09:00", "close": "23:00"}, "tuesday": {"open": "09:00", "close": "23:00"}}',
           '{"primary": "#FF5722", "secondary": "#FFFFFF"}',
           'active', NOW(), NOW()
         )
         ON CONFLICT (slug) DO NOTHING`,
        [tenantId, destId],
      )
    },
  },
]

export function getSeedsByPhase(phase) {
  switch (phase) {
    case 'platform':
      return PLATFORM_SEEDS.platform
    case 'ecosystem':
      return ECOSYSTEM_SEEDS
    case 'company':
      return COMPANY_SEEDS
    default:
      return []
  }
}

export function getAllSeeds() {
  return [...PLATFORM_SEEDS.platform, ...ECOSYSTEM_SEEDS, ...COMPANY_SEEDS]
}

export default {
  SEED_ORDER,
  PLATFORM_SEEDS,
  ECOSYSTEM_SEEDS,
  COMPANY_SEEDS,
  getSeedsByPhase,
  getAllSeeds,
}
