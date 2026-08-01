# CODE-GENERATION.md — Valdi Code Generation Engine

## Overview

The Code Generation Engine produces standards-compliant code from templates and configurations. Every generated file is immediately valid, testable, and deployable.

## Generation Pipeline

```
Input Configuration
       │
       ▼
┌──────────────┐
│  Template    │  Load template based on type
│  Resolver    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Variable    │  Inject name, deps, events, etc.
│  Injection   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Code        │  Apply coding standards
│  Formatting  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Validation  │  Run architecture validator
│  Pass        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  File        │  Write to disk
│  Output      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Registration│  Update register.js
│  Update      │
└──────────────┘
```

## Template System

### Template Types

| Type | Template | Output |
|---|---|---|
| capability | capability.template.js | {name}.capability.js |
| provider | provider.template.js | {name}.provider.js |
| manager | manager.template.js | {name}.manager.js |
| events | events.template.js | {name}.events.js |
| schema | schema.template.js | {name}.schema.js |
| readme | readme.template.md | README.md |
| test | test.template.js | {name}.test.js |

### Template Variables

| Variable | Source | Example |
|---|---|---|
| {name} | CLI argument | `booking` |
| {Name} | PascalCase(name) | `Booking` |
| {NAME} | UPPER_CASE(name) | `BOOKING` |
| {dependencies} | --deps flag | `'cms', 'pwa'` |
| {version} | --version flag | `1.0.0` |
| {events} | --events flag | `CREATED, UPDATED` |
| {description} | Auto-generated | `Booking capability` |
| {date} | Current date | `2026-07-27` |
| {author} | Git config | `Developer` |

### Template Composition

Templates can compose other templates:

```
capability.template
  ├── manager.template (1..N)
  ├── events.template (0..1)
  ├── schema.template (0..1)
  ├── readme.template (1)
  └── test.template (0..1)
```

## Generation Modes

### Interactive Mode
```bash
valdi create capability
# Prompts for: name, dependencies, events, managers
```

### Direct Mode
```bash
valdi create capability booking --deps cms,pwa --events created,updated
```

### Bulk Mode
```bash
valdi create capability booking,notifications,reservation --deps cms
```

### Template Mode
```bash
valdi create capability --from template.json
```

## Code Quality Rules

### Generated Code Must:
1. Use ES module syntax (import/export)
2. Follow naming conventions (camelCase methods, PascalCase classes)
3. Include JSDoc comments for public methods
4. Handle errors with try/catch
5. Clean up resources in destroy()
6. Use private fields for internal state
7. Export both named and default
8. Be under 300 lines per file

### Generated Code Must NOT:
1. Contain business logic (only boilerplate)
2. Import from forbidden paths
3. Create circular dependencies
4. Leave unused imports
5. Use var (use const/let)
6. Use console.log (use structured logging)

## Post-Generation Validation

After generation, the validator checks:
1. File exists and is readable
2. Exports are correct (named + default for capabilities)
3. Imports resolve to existing files
4. No circular dependencies introduced
5. Naming conventions followed
6. Template variables fully resolved
7. No placeholder text remaining

## Registration Integration

When a capability is generated, the SDK automatically:
1. Adds import to register.js
2. Adds to createAllCapabilities() function
3. Updates CAPABILITY_INDEX.md
4. Updates EVENT_INDEX.md (if events generated)

## Customization

### Custom Templates
Place custom templates in `.valdi/templates/`:
```
.valdi/
  templates/
    capability/
      capability.template.js
      manager.template.js
```

### Template Overrides
Override specific variables in `.valdi/config.json`:
```json
{
  "defaults": {
    "version": "1.0.0",
    "author": "Team",
    "license": "MIT"
  }
}
```
