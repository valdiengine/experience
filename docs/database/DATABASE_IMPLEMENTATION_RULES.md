# Database Implementation Rules

> **Version:** v4.1
> **Phase:** P12.3.1 — Database Connection & Migration
> **Type:** Implementation Constraints
> **Date:** 2026-08-06

---

## CORE RULES

### Rule 1: ERD is the Source of Truth

```
All database tables MUST correspond to entities defined in VALDI_DATABASE_ERD.md.

No table may be created without an corresponding ERD entity.
No column may be added that violates the ERD design.
No relationship may be created that contradicts the ERD.
```

### Rule 2: No Table Without Architecture Entity

```
Every table MUST have:
1. A defined entity in VALDI_DATABASE_ERD.md
2. A documented purpose in the architecture
3. A clear ownership boundary (Platform, Ecosystem, Company, Identity, Business)
4. Defined relationships to other entities

EXCEPTION: Temporary migration辅助 tables (e.g., _drizzle_migrations) are allowed.
```

### Rule 3: No Migration Without Approved Schema

```
Before creating a migration:
1. Schema MUST exist in database/schema/{layer}/
2. Schema MUST match ERD entity definition exactly
3. Indices MUST align with ERD defined indexes
4. Foreign keys MUST respect ERD ON DELETE rules
5. Tenant isolation columns MUST be present where required
```

### Rule 4: No Business Logic Inside Database

```
The database is for DATA STORAGE only.

PROHIBITED:
- Triggers that implement business logic
- Stored procedures with domain rules
- Constraints that enforce business rules
- Database-level validation that duplicates application logic

ALLOWED:
- Data type constraints (NOT NULL, CHECK for data integrity)
- Foreign key constraints (referential integrity)
- Unique constraints (uniqueness)
- Indexes (performance)
```

### Rule 5: BusinessService Never Imports Database Directly

```
Architecture boundary:

┌─────────────────────┐
│   BusinessService    │ ← NEVER imports drizzle-orm, pg, knex
└──────────┬──────────┘
           │ uses
           ▼
┌─────────────────────┐
│   Repository        │ ← ONLY persistence boundary
└──────────┬──────────┘
           │ uses
           ▼
┌─────────────────────┐
│   Drizzle ORM      │ ← Database abstraction
└──────────┬──────────┘
           │ uses
           ▼
┌─────────────────────┐
│   PostgreSQL        │ ← Physical database
└─────────────────────┘
```

### Rule 6: Repository Layer Owns Persistence

```
All database operations MUST go through Repository Engine.

REPOSITORY_ENGINE
    │
    ├──owns──▶ BaseRepository (contract)
    │                │
    │                ▼
    │         ┌─────────────┐
    │         │  Repository │ ← Uses DrizzleAdapter
    │         └─────────────┘
    │                │
    │                ▼
    │         ┌─────────────┐
    └────────▶│ DrizzleAdapter │ ← Uses drizzle-orm
              └─────────────┘
```

### Rule 7: Tenant Isolation is Mandatory

```
For tenant-isolated entities, ALL queries MUST include tenant_id.

MANDATORY for:
- companies
- users (tenant_id + company_id)
- user_roles (tenant_id + company_id)
- accommodations
- accommodation_units
- availability
- availability_rules
- reservations
- reservation_activities
- payments
- invoices
- reviews
- review_helpfulness
- business_notifications

NOT REQUIRED for (Platform-shared):
- countries
- regions
- destinations
- domains
- themes
- languages
- ecosystems
- modules
- categories
- experiences
- roles
- permissions
```

---

## NAMING CONVENTIONS

### Table Names

```
RULE: Plural, snake_case

✓ accommodations
✓ companies
✓ user_roles
✗ Accommodation
✗ Company
✗ UserRole
```

### Column Names

```
RULE: snake_case, descriptive

✓ accommodation_id
✓ created_at
✓ is_active
✗ accommodationId (camelCase)
✗ createdAt (camelCase)
✗ IsActive (PascalCase)
```

### Foreign Key Columns

```
RULE: {referenced_table_singular}_id

✓ country_id (references countries.id)
✓ destination_id (references destinations.id)
✓ user_id (references users.id)

✗ countryId (camelCase)
✗ ref_country_id (unnecessary prefix)
```

### Index Names

```
RULE: idx_{table}_{column(s)}

✓ idx_accommodation_tenant_id
✓ idx_reservation_confirmation_code
✓ idx_user_email

✗ index_on_users (wrong format)
✗ idx_users_email_address (too long)
```

### Unique Constraint Names

```
RULE: idx_{table}_{column}_unique or uk_{table}_{column}

✓ idx_company_slug (for UNIQUE constraint)
✓ idx_user_email (for UNIQUE constraint)

Note: Drizzle handles unique constraints differently.
Use uniqueIndex() in table definition.
```

---

## LAYER SEPARATION

### Layer 1 — Platform (database/schema/platform/)

```
ENTITIES:
- tenants
- countries
- regions
- destinations
- domains
- themes
- languages

CHARACTERISTICS:
- NOT tenant-isolated
- Shared across all tenants
- Platform-owned
```

### Layer 2 — Ecosystem (database/schema/ecosystem/)

```
ENTITIES:
- ecosystems
- categories
- modules
- experiences

CHARACTERISTICS:
- NOT tenant-isolated
- Belong to Destination
- Configuration-driven
```

### Layer 3 — Company (database/schema/company/)

```
ENTITIES:
- companies
- company_profiles
- company_modules
- company_settings

CHARACTERISTICS:
- Tenant-isolated (tenant_id required)
- Belong to Destination
- Company-owned
```

### Layer 4 — Identity (database/schema/identity/)

```
ENTITIES:
- users (tenant_id + company_id)
- roles (tenant_id optional)
- permissions
- user_roles (tenant_id + company_id)
- user_sessions

CHARACTERISTICS:
- Multi-scope (tenant + company)
- Authentication/Authorization
```

### Layer 5 — Business (database/schema/business/)

```
ENTITIES:
- accommodations
- accommodation_units
- availability
- availability_rules
- reservations
- reservation_activities
- payments
- invoices
- reviews
- review_helpfulness
- business_notifications
- notification_preferences

CHARACTERISTICS:
- Tenant-isolated
- Company-owned
- Operational data
```

---

## INDEX STRATEGY

### Multi-Tenant Index Design

```javascript
// Every tenant-isolated table MUST index tenant_id first
pgTable('accommodations', {
  // ... columns
}, (table) => [
  // tenant_id first for partition pruning
  index('idx_accommodation_tenant_id').on(table.tenantId),

  // Then composite indexes for common queries
  index('idx_accommodation_tenant_status').on(table.tenantId, table.status),

  // Unique constraints include tenant_id
  uniqueIndex('idx_accommodation_tenant_slug').on(table.tenantId, table.slug),
])
```

### Required Indexes Per Entity

| Entity | Required Indexes |
|--------|-----------------|
| companies | tenant_id, slug (unique) |
| users | tenant_id, email (unique), company_id |
| accommodations | tenant_id, company_id, slug (unique), status |
| reservations | tenant_id, accommodation_id, confirmation_code (unique), status, dates |
| payments | tenant_id, reservation_id, provider_reference (unique), status |

### Index Naming Convention

```
idx_{table}_{column1}_{column2}_...

EXAMPLES:
idx_accommodation_tenant_id
idx_reservation_tenant_accommodation_status
idx_user_tenant_company
```

---

## FOREIGN KEY CONSTRAINTS

### ON DELETE Rules (from ERD)

| Child Entity | Parent Entity | ON DELETE |
|--------------|---------------|-----------|
| regions | countries | RESTRICT |
| destinations | regions | RESTRICT |
| domains | destinations | CASCADE |
| themes | destinations | CASCADE |
| ecosystems | destinations | CASCADE |
| categories | ecosystems | CASCADE |
| modules | ecosystems | CASCADE |
| experiences | ecosystems | CASCADE |
| experiences | categories | SET NULL |
| categories | categories (self) | SET NULL |
| companies | tenants | CASCADE |
| company_profiles | companies | CASCADE |
| company_settings | companies | CASCADE |
| company_modules | companies | CASCADE |
| users | tenants | SET NULL |
| user_roles | users | CASCADE |
| user_roles | roles | CASCADE |
| user_sessions | users | CASCADE |
| accommodations | tenants | RESTRICT |
| accommodations | companies | CASCADE |
| accommodation_units | accommodations | CASCADE |
| availability | accommodations | CASCADE |
| availability_rules | accommodations | CASCADE |
| reservations | tenants | RESTRICT |
| reservations | accommodations | RESTRICT |
| reservations | users | SET NULL |
| reservation_activities | reservations | CASCADE |
| payments | tenants | RESTRICT |
| payments | reservations | SET NULL |
| reviews | accommodations | CASCADE |
| review_helpfulness | reviews | CASCADE |

### Drizzle Implementation

```javascript
// RESTRICT (default in Drizzle)
uuid('country_id').notNull().references(() => countries.id)

// CASCADE
uuid('destination_id').references(() => destinations.id, { onDelete: 'cascade' })

// SET NULL
uuid('category_id').references(() => categories.id, { onDelete: 'set null' })
```

---

## TENANT ISOLATION PATTERN

### Query Pattern (Mandatory)

```javascript
// ✓ CORRECT: Always filter by tenant
const accommodations = await db.query.accommodations.findMany({
  where: and(
    eq(accommodations.tenantId, session.tenantId), // MANDATORY
    eq(accommodations.status, 'active'),
  ),
})

// ✗ WRONG: Missing tenant filter
const accommodations = await db.query.accommodations.findMany({
  where: eq(accommodations.status, 'active'), // DANGEROUS!
})
```

### Insert Pattern (Mandatory)

```javascript
// ✓ CORRECT: Always set tenant_id
await db.insert(accommodations).values({
  tenantId: session.tenantId, // MANDATORY
  companyId: input.companyId,
  name: input.name,
  // ...
})

// ✗ WRONG: Forgetting tenant_id
await db.insert(accommodations).values({
  companyId: input.companyId,
  name: input.name,
  // tenantId is missing!
})
```

### Repository Pattern

```javascript
class AccommodationRepository extends BaseRepository {
  async findAll(tenantId, options = {}) {
    return this.db.query.accommodations.findMany({
      where: and(
        eq(this.table.tenantId, tenantId), // MANDATORY
        options.status ? eq(this.table.status, options.status) : undefined,
      ),
    })
  }

  async create(tenantId, data) {
    return this.db.insert(this.table).values({
      tenantId, // MANDATORY
      ...data,
    })
  }
}
```

---

## MIGRATION RULES

### Migration File Naming

```
RULE: {order}_{description}.js

FORMAT:
- order: 3-digit sequential (001, 002, 003...)
- description: snake_case, descriptive

EXAMPLES:
001_platform_schema.js
002_ecosystem_schema.js
003_company_schema.js
004_identity_schema.js
005_business_schema.js
```

### Migration Structure

```javascript
// migrations/001_platform_schema.js

export async function up(provider) {
  // Create tables in dependency order
  await provider.execute(`
    CREATE TABLE tenants (...)
  `)
  await provider.execute(`
    CREATE TABLE countries (...)
  `)
  // etc.
}

export async function down(provider) {
  // Drop in reverse order
  await provider.execute(`DROP TABLE IF EXISTS countries`)
  await provider.execute(`DROP TABLE IF EXISTS tenants`)
}
```

### Migration Principles

```
1. IDEMPOTENT: Safe to run multiple times
2. REVERSIBLE: Always provide down() function
3. ATOMIC: Each migration does one logical change
4. TESTED: Verify up() and down() locally first
```

---

## DRIZZLE SCHEMA RULES

### Schema File Location

```
database/schema/
├── platform/     → Layer 1 entities
├── ecosystem/   → Layer 2 entities
├── company/     → Layer 3 entities
├── identity/    → Layer 4 entities
└── business/    → Layer 5 entities
```

### Schema Definition Rules

```javascript
// ✓ CORRECT: Complete schema definition
export const accommodations = pgTable(
  'accommodations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    // ... all columns
  },
  (table) => [
    // Indices
    uniqueIndex('idx_accommodation_slug').on(table.slug),
    index('idx_accommodation_tenant_id').on(table.tenantId),
    index('idx_accommodation_company_id').on(table.companyId),
    index('idx_accommodation_status').on(table.status),
  ],
)

// ✗ WRONG: Missing required columns
export const accommodations = pgTable(
  'accommodations',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 255 }),
    // tenant_id missing!
    // company_id missing!
    // created_at missing!
  },
)
```

### Column Type Rules

| Data Type | Drizzle Type | PostgreSQL |
|-----------|--------------|------------|
| UUID | `uuid()` | UUID |
| String | `varchar({ length })` | VARCHAR |
| Text | `text()` | TEXT |
| Integer | `integer()` | INTEGER |
| Boolean | `boolean()` | BOOLEAN |
| Decimal | `decimal({ precision, scale })` | NUMERIC |
| JSON | `json()` or `jsonb()` | JSON or JSONB |
| Timestamp | `timestamp({ withTimezone: true })` | TIMESTAMPTZ |
| Date | `date()` | DATE |
| Time | `time()` | TIME |

### Required Columns (Every Table)

```
✓ id           — UUID, primary key
✓ created_at   — TIMESTAMPTZ, NOT NULL, DEFAULT NOW()
✓ updated_at   — TIMESTAMPTZ, NOT NULL, DEFAULT NOW()

OPTIONAL (add when needed):
✓ deleted_at   — TIMESTAMPTZ (for soft delete)
✓ tenant_id    — UUID (for tenant isolation)
```

---

## PRE-FLIGHT CHECKLIST (Before PostgreSQL)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PRE-FLIGHT CHECKLIST                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  □ 1. Schema files exist for all 33 ERD entities                        │
│  □ 2. All tables have id, created_at, updated_at                       │
│  □ 3. All tenant-isolated tables have tenant_id                         │
│  □ 4. All foreign keys match ERD ON DELETE rules                        │
│  □ 5. All indices are defined per ERD requirements                      │
│  □ 6. Unique constraints are properly named                            │
│  □ 7. Migration files are in correct layer order                        │
│  □ 8. DrizzleMigrationRunner is compatible with schemas                │
│  □ 9. Repository layer can consume these schemas                        │
│  □ 10. Environment variables are set for PostgreSQL                     │
│  □ 11. Connection pool settings are configured                          │
│  □ 12. SSL settings are appropriate for environment                     │
│  □ 13. Backup strategy is defined                                      │
│  □ 14. Migration rollback plan is documented                           │
│  □ 15. Seed data plan is defined                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TESTING RULES

### Unit Test Requirements

```
Every repository MUST have tests for:
1. create() - with tenant_id
2. findById() - with tenant isolation
3. findAll() - with tenant filtering
4. update() - tenant isolation preserved
5. delete() - soft delete or hard delete
```

### Integration Test Requirements

```
Every migration MUST be tested:
1. up() executes without error
2. down() executes without error
3. Data integrity constraints work
4. Foreign keys enforce correctly
5. Indices improve query performance
```

---

## FORBIDDEN PATTERNS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FORBIDDEN PATTERNS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ✗ Direct database access from BusinessService                          │
│  ✗ Business logic in triggers or stored procedures                      │
│  ✗ Queries without tenant_id for tenant-isolated data                   │
│  ✗ Hard-coded SQL strings in repositories (use Drizzle)                  │
│  ✗ Creating tables without corresponding ERD entity                     │
│  ✗ Adding columns not in ERD                                            │
│  ✗ Modifying foreign key ON DELETE rules                                │
│  ✗ Creating indexes on non-ERD columns                                  │
│  ✗ Denormalizing data without architecture decision                      │
│  ✗ Cross-tenant queries for business data                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## VALIDATION COMMANDS

### Before Creating Migration

```bash
# 1. Validate schema files exist
ls database/schema/*/index.js

# 2. Check schema exports
grep "export const" database/schema/*/index.js

# 3. Validate index definitions
grep "index(" database/schema/*/index.js

# 4. Check tenant isolation
grep "tenant_id" database/schema/*/index.js
```

### After Creating Migration

```bash
# 1. Dry run migration (if supported)
npm run migrate:dry

# 2. Verify SQL syntax
npm run migrate:validate

# 3. Run tests
npm run test:integration
```

---

## COMPLIANCE

```
This document is MANDATORY for all database implementation work.

Non-compliance will result in:
1. PR rejection
2. Architecture violation report
3. Required corrections before merge

For questions or exceptions:
1. Create an ADR (Architecture Decision Record)
2. Get approval from Architecture Owner
3. Update ERD if entity changes are needed
4. Update this document if rules change
```

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-06 | Initial rules for P12.3.1 |

---

## VALIDATION STATUS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPLIANCE VERIFICATION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Rule 1: ERD is source of truth .................... ✓ COMPLIANT       │
│  Rule 2: No table without entity .................. ✓ COMPLIANT       │
│  Rule 3: No migration without schema ............... ✓ COMPLIANT       │
│  Rule 4: No business logic in DB .................. ✓ COMPLIANT       │
│  Rule 5: BusinessService never touches DB .......... ✓ COMPLIANT       │
│  Rule 6: Repository owns persistence .............. ✓ COMPLIANT       │
│  Rule 7: Tenant isolation mandatory ................ ✓ COMPLIANT       │
│                                                                          │
│  All rules enforceable: YES                                              │
│  All rules documented: YES                                              │
│  All rules validated against ERD: YES                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```
