# Database Connection Architecture
## Valdi Platform v4.1 - P12.3.1.4

---

## Overview

This document describes the database connection architecture for the Valdi Platform, implementing P12.3.1.4 (PostgreSQL Connection & Environment Configuration).

## Architecture Boundary

```
┌─────────────────────────────────────────────────────────────────┐
│                         RUNTIME                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Repository Layer                        │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │              Drizzle ORM (Client)                   │  │   │
│  │  │  ┌────────────────────────────────────────────────┐ │  │   │
│  │  │  │         PostgreSQL Connection Pool            │ │  │   │
│  │  │  └────────────────────────────────────────────────┘ │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Rule**: Database must NOT be imported directly by API, BusinessService, Capabilities, or Experience Engine. All access must remain behind Repository boundaries.

---

## Startup Sequence

```
1. Environment Loader     → Load .env file based on NODE_ENV
2. Database Config        → Apply database configuration
3. Connection Pool        → Initialize PostgreSQL pool
4. Drizzle Client         → Create Drizzle ORM client
5. Schema Validation      → Verify all 33 entity schemas
```

---

## Key Files

| File | Purpose |
|------|---------|
| `database/config/environment.loader.js` | Loads .env files by NODE_ENV |
| `database/config/database.config.js` | PostgreSQL settings, pool config |
| `database/connection/postgres.connection.js` | Pool, query, transaction, health |
| `database/connection/connection.pool.js` | PoolState, initialize/shutdown |
| `database/connection/connection.health.js` | checkConnection, ping, checkTables |
| `database/client.js` | Drizzle client with schema exports |
| `database/bootstrap/database.bootstrap.js` | Full bootstrap flow |
| `runtime/startup/database.bootstrap.js` | Runtime integration |

---

## Environment Configuration

### Environment Files

- `.env.example` - Base template
- `.env.development.example` - Development overrides
- `.env.test.example` - Test environment
- `.env.production.example` - Production settings

### Required Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `DATABASE_HOST` | Database host | localhost |
| `DATABASE_PORT` | Database port | 5432 |
| `DATABASE_NAME` | Database name | valdi |
| `DATABASE_USER` | Database user | postgres |
| `DATABASE_PASSWORD` | Database password | - |
| `DATABASE_POOL_MIN` | Minimum pool connections | 2 |
| `DATABASE_POOL_MAX` | Maximum pool connections | 10 |
| `NODE_ENV` | Runtime environment | development |

---

## Connection Pool Configuration

### Pool Settings

```javascript
{
  min: 2,
  max: 10,
  idleTimeout: 30000,
  connectionTimeout: 5000
}
```

### Health Checks

- `checkConnection()` - Verifies database connectivity
- `ping()` - Simple ping/pong test
- `checkTables()` - Validates expected tables exist

---

## Drizzle ORM Integration

### Schema Layers

| Layer | Entities | Tables |
|-------|----------|--------|
| Platform | tenants, countries, regions, destinations, domains, themes, languages | 7 |
| Ecosystem | ecosystems, categories, modules, experiences | 4 |
| Company | companies, company_profiles, company_modules, company_settings | 4 |
| Identity | users, roles, permissions, user_roles, user_sessions | 5 |
| Business | accommodations, accommodation_units, availability, availability_rules, reservations, reservation_activities, payments, invoices, reviews, review_helpfulness, business_notifications, notification_preferences | 12 |

**Total**: 33 entities across 5 layers, 29 tables

---

## Migration Registry

| Migration | Layer | Tables |
|-----------|-------|--------|
| `0001_platform_foundation` | Platform | 7 |
| `0002_ecosystem_layer` | Ecosystem | 4 |
| `0003_company_layer` | Company | 4 |
| `0004_identity_layer` | Identity | 5 |
| `0005_business_layer` | Business | 12 |

---

## Guardian Integration

The `DatabaseGuardian` validates:
- Database configuration exists
- Migration files present (0001-0005)
- Schema layers exist (platform, ecosystem, company, identity, business)
- Environment templates present
- Drizzle configuration exists
- No direct database access from forbidden paths

---

## Version

- **Platform**: Valdi Platform v4.1
- **Phase**: P12.3.1.4
- **Document Version**: 1.0
- **Last Updated**: 2026-08-06
