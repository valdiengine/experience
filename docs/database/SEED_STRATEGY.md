# Seed Strategy

## Overview

Seed data infrastructure for Valdi Platform v4.1 following the geographic/business hierarchy.

## Seed Hierarchy

Seeds execute in strict order:

```
Platform
├── tenants
└── configurations
    ↓
Ecosystem
├── countries (ES, US, MX)
├── regions (MD for Spain)
├── destinations (madrid-tourism)
├── experiences
└── categories
    ↓
Company
├── businesses
└── teams
    ↓
Modules
├── reservations
├── payments
└── notifications
```

## Seed Registry

Located at `database/seeds/seed.registry.js`

### Structure

```javascript
{
  name: 'country_es',           // Unique identifier
  description: 'Create Spain',  // Human-readable description
  order: 1,                     // Execution order within phase
  countryCode: 'ES',            // Optional metadata
  async exists(provider) {     // Check if already seeded
    return result.rows?.length > 0
  },
  async execute(provider) {     // The seed logic
    return provider.execute(`INSERT INTO...`)
  }
}
```

## Seed Runner

Located at `database/seeds/seed.runner.js`

### Features

- **Phase-based execution** - Groups seeds by platform/ecosystem/company
- **Idempotency** - Checks `exists()` before executing
- **Condition support** - Optional `condition()` function for conditional execution
- **Event emission** - Emits events for monitoring
- **Verbose logging** - Detailed output in development

### Usage

```javascript
import { SeedRunner } from './database/index.js'

const runner = new SeedRunner({
  verbose: true,    // Enable logging
  eventBus: null,   // Optional event bus
})

runner.setDrizzleProvider(drizzleProvider)
await runner.seedAll({ categories: true, data: true })
```

## Environment Configuration

```javascript
// env.config.js
{
  seeds: {
    runOnStartup: true,   // Run seeds on app startup (dev only)
    verbose: true,        // Enable logging
  }
}
```

## Predefined Seeds

### Platform Seeds

| Name | Description |
|------|-------------|
| platform_tenant | Create platform master tenant |
| default_configurations | Create default platform configs |

### Ecosystem Seeds

| Name | Description |
|------|-------------|
| country_es | Spain (ES) |
| country_us | United States (US) |
| country_mx | Mexico (MX) |
| region_es_md | Community of Madrid |
| destination_madrid_tourism | Madrid Tourism destination |

### Company Seeds

| Name | Description |
|------|-------------|
| demo_business | Demo restaurant in Madrid |

## Creating Custom Seeds

```javascript
export const CUSTOM_SEED = {
  name: 'my_custom_seed',
  description: 'Seed description',
  async exists(provider) {
    const result = await provider.execute('SELECT 1 FROM table WHERE field = $1', ['value'])
    return result.rows?.length > 0
  },
  async execute(provider) {
    return provider.execute('INSERT INTO...')
  }
}
```

## Running Specific Seeds

```javascript
// Seed a specific country
await runner.seedCountry({ code: 'ES' })

// Seed a specific region
await runner.seedRegion({ code: 'MD', country: 'ES' })

// Seed a destination
await runner.seedDestination({ slug: 'madrid-tourism' })

// Seed a company
await runner.seedCompany({ slug: 'demo-restaurant-madrid' })
```

## Seed Results

```javascript
const results = runner.getResults()
// {
//   succeeded: [{ name, result }],
//   failed: [{ name, error }],
//   skipped: [{ name, reason }],
//   total: 10
// }
```

## Best Practices

1. **Idempotent** - Use `ON CONFLICT DO NOTHING` for inserts
2. **Ordered** - Respect the hierarchy order
3. **Check Existence** - Always implement `exists()` to prevent duplicates
4. **Verbose** - Provide helpful descriptions
5. **Atomic** - Each seed should do one logical operation
