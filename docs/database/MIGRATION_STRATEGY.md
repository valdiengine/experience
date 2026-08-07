# Migration Strategy

> **Version:** v4.1
> **Phase:** P12.3.1.3 — Drizzle Migration Implementation
> **Date:** 2026-08-06

## Overview

Database migrations for Valdi Platform v4.1 using Drizzle ORM.

## Migration Infrastructure

Located in `capabilities/persistence/providers/postgres/drizzle/drizzle.migration.runner.js`

## Execution Flow

1. **Startup Check** - Runner checks if migrations should run on startup (controlled by environment config)
2. **Version Table** - Creates `_drizzle_migrations` table if not exists
3. **File Discovery** - Scans `database/migrations/` for migration files
4. **Sequential Execution** - Runs migrations in order (0001 → 0005)
5. **Version Recording** - Records each successful migration

## Migration Structure

```
database/migrations/
├── 0001_platform_foundation/    # Layer 1: Platform infrastructure
├── 0002_ecosystem_layer/        # Layer 2: Ecosystem hierarchy
├── 0003_company_layer/          # Layer 3: Company entities
├── 0004_identity_layer/         # Layer 4: Identity & auth
└── 0005_business_layer/         # Layer 5: Business domain
```

## Migration Order

| Order | Migration | Layer | Tables | Dependencies |
|-------|-----------|-------|--------|--------------|
| 1 | 0001_platform_foundation | Platform | tenants, countries, regions, destinations, domains, themes, languages | None |
| 2 | 0002_ecosystem_layer | Ecosystem | ecosystems, categories, modules, experiences | 0001 |
| 3 | 0003_company_layer | Company | companies, company_profiles, company_modules, company_settings | 0001 |
| 4 | 0004_identity_layer | Identity | users, roles, permissions, user_roles, user_sessions | 0001, 0003 |
| 5 | 0005_business_layer | Business | accommodations, units, availability, reservations, payments, reviews, notifications | 0001, 0003, 0004 |

## Migration File Format

```javascript
// database/migrations/0001_platform_foundation/index.js

export async function up(provider) {
  await provider.execute(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Migration tracking
  await provider.execute(`
    INSERT INTO _drizzle_migrations (name, hash, executed_at)
    VALUES ('0001_platform_foundation', gen_random_uuid(), NOW())
    ON CONFLICT DO NOTHING
  `)
}

export async function down(provider) {
  await provider.execute(`DROP TABLE IF EXISTS tenants CASCADE`)
  await provider.execute(`DELETE FROM _drizzle_migrations WHERE name = '0001_platform_foundation'`)
}
```

## Drizzle Configuration

Located at `drizzle.config.js`:

```javascript
{
  schema: './database/schema/index.js',
  out: './database/migrations',
  dialect: 'postgresql',
  migrationsSchema: 'public',
  migrationsTable: '_drizzle_migrations',
}
```

## Environment Configuration

```javascript
// drizzle.config.js
const migrationSettings = {
  development: { runOnStartup: false, tableName: '_drizzle_migrations' },
  testing: { runOnStartup: false, tableName: '_drizzle_migrations' },
  production: { runOnStartup: false, tableName: '_drizzle_migrations' },
}
```

## Running Migrations

### Via Drizzle CLI

```bash
# Generate migrations from schema changes
npx drizzle-kit generate

# Run pending migrations
npx drizzle-kit migrate

# Check migration status
npx drizzle-kit status

# Rollback last migration
npx drizzle-kit rollback
```

### Via DrizzleMigrationRunner

```javascript
import { DrizzleMigrationRunner } from './capabilities/persistence/providers/postgres/drizzle/drizzle.migration.runner.js'
import { getMigrationsInOrder } from './database/index.js'

const runner = new DrizzleMigrationRunner(provider, {
  migrationsPath: './database/migrations',
  tableName: '_drizzle_migrations',
})

// Run all pending migrations
await runner.run()

// Get pending migrations
const pending = await runner.getPendingMigrations()

// Get executed migrations
const executed = await runner.getExecutedMigrations()
```

## Migration Naming Convention

- Format: `{order}_{layer_description}`
- Example: `0001_platform_foundation`, `0002_ecosystem_layer`
- Use 4-digit sequential numbering

## Best Practices

1. **Idempotent** - Migrations should be safe to run multiple times (`IF NOT EXISTS`)
2. **Reversible** - Always provide `down()` function for rollback
3. **Atomic** - Each migration does one logical change
4. **Tested** - Test `up()` and `down()` locally before committing
5. **Ordered** - Respect layer dependencies

## Tenant Isolation

All tenant-isolated tables include:
- `tenant_id` column with NOT NULL where required
- Composite indexes on `(tenant_id, column)`
- Foreign keys with appropriate ON DELETE rules

## Status Tracking

Migration status stored in `_drizzle_migrations` table:

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR(255) | Migration name |
| hash | VARCHAR(64) | Content hash for verification |
| executed_at | TIMESTAMPTZ | When migration ran |

## Rollback Order

Rollback must execute in **reverse order**:

```
0005_business_layer (down)
0004_identity_layer (down)
0003_company_layer (down)
0002_ecosystem_layer (down)
0001_platform_foundation (down)
```

## Foreign Key Constraints

| Child Table | Parent | ON DELETE |
|-------------|--------|-----------|
| regions | countries | RESTRICT |
| destinations | regions | RESTRICT |
| ecosystems | destinations | CASCADE |
| categories | ecosystems | CASCADE |
| modules | ecosystems | CASCADE |
| experiences | ecosystems | CASCADE |
| companies | tenants | CASCADE |
| users | tenants | SET NULL |
| accommodations | tenants | RESTRICT |
| accommodations | companies | CASCADE |
| reservations | tenants | RESTRICT |
| reservations | accommodations | RESTRICT |
| payments | tenants | RESTRICT |

## Validation Checklist

Before running in production:

```
□ PostgreSQL is running
□ DATABASE_URL is set correctly
□ Database exists
□ User has CREATE TABLE permissions
□ Connection is tested
□ Backup is taken
□ Rollback plan is documented
□ Migration order verified
□ Tenant isolation verified
```

---

## Related Documents

- [VALDI_DATABASE_ERD.md](./VALDI_DATABASE_ERD.md) - Entity Relationship Diagram
- [DATABASE_IMPLEMENTATION_RULES.md](./DATABASE_IMPLEMENTATION_RULES.md) - Implementation Rules
- [MIGRATION_IMPLEMENTATION_REPORT.md](./MIGRATION_IMPLEMENTATION_REPORT.md) - Implementation Report
