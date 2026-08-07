# Database Implementation Guide

## Overview

Database implementation for Valdi Platform v4.1 following P12.3.1 requirements.

## Architecture

```
database/
├── schema/          # Schema registry and definitions
│   └── index.js     # Central schema registry (SCHEMA_REGISTRY, SCHEMAS)
├── migrations/      # Database migrations
├── seeds/           # Seed data infrastructure
│   ├── seed.registry.js   # Seed definitions
│   └── seed.runner.js    # Seed execution engine
└── config/          # Database configuration
```

## Schema Hierarchy

Schemas follow the Platform hierarchy: **Platform → Ecosystem → Company → Modules**

### Platform Schemas
- `tenants` - Multi-tenant support
- `configurations` - Key-value configuration store
- `audit_logs` - Audit trail

### Ecosystem Schemas
- `countries` - Country definitions (ISO 3166-1)
- `regions` - Regional subdivisions
- `destinations` - Tourism destinations
- `experiences` - Experience configurations
- `categories` - Business categories

### Company Schemas
- `businesses` - Company/business entries
- `teams` - Team membership
- `contacts` - Contact information

### Module Schemas
- `reservations` - Booking data
- `payments` - Payment transactions
- `notifications` - Notification queue

## Configuration

Environment-based configuration in `env.config.js`:

```javascript
ENVIRONMENT_CONFIG = {
  development: { /* local dev */ },
  staging: { /* staging env */ },
  production: { /* production */ }
}
```

### Required Environment Variables
- `POSTGRES_HOST` - Database host
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `NODE_ENV` - Environment (development|staging|production)

## Seed Data

### Execution Order
1. **Platform** - Tenant, configurations
2. **Ecosystem** - Country → Region → Destination → Experience → Category
3. **Company** - Business data

### Running Seeds
```javascript
import { SeedRunner } from './database/index.js'

const runner = new SeedRunner({ verbose: true })
runner.setDrizzleProvider(drizzleProvider)
await runner.seedAll()
```

### Seed Registry Structure
```javascript
{
  name: 'country_es',
  description: 'Create Spain country entry',
  async exists(provider) { /* check */ },
  async execute(provider) { /* insert */ }
}
```

## Usage with Drizzle Provider

```javascript
import { DrizzleProvider } from './capabilities/persistence/providers/postgres/drizzle/drizzle.provider.js'
import { getConfig } from './database/env.config.js'

const config = getConfig()
const provider = new DrizzleProvider({ config: config.drizzle })
await provider.initialize()

const runner = new SeedRunner()
runner.setDrizzleProvider(provider)
await runner.seedAll()
```

## Schema Definition Format

```javascript
{
  entityName: 'country',
  tableName: 'countries',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true },
    { name: 'code', type: 'varchar', length: 2, unique: true },
  ],
  indexes: [
    { name: 'idx_country_code', columns: ['code'], unique: true }
  ],
  timestamps: true,  // adds created_at, updated_at
  softDelete: true   // adds deleted_at
}
```
