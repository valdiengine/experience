# SDK-ARCHITECTURE.md — Valdi Platform SDK Architecture

## Overview

The Valdi SDK is the official development interface for the Valdi Engine platform. It provides tools, generators, validators, and contracts that enable developers to create, maintain, validate and evolve capabilities, providers, tenants, workflows and applications with minimal effort.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                VALDI CLI                        │
│  valdi create | validate | graph | doctor       │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│                SDK CORE                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Generators│ │Validators│ │ Visualizers      │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              TEMPLATE ENGINE                    │
│  Capability | Provider | Project | Theme        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              CONTRACTS                          │
│  Capability | Provider | Plugin | Workflow      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│            ENGINEERING STANDARDS                 │
│  ARCHITECTURAL-INVARIANTS.md                    │
│  ENGINEERING-STANDARDS.md                       │
│  DESIGN_PRINCIPLES.md                           │
└─────────────────────────────────────────────────┘
```

## SDK Modules

| Module | Purpose | Command |
|---|---|---|
| CLI | Command-line interface | `valdi` |
| Capability Generator | Create capabilities | `valdi create capability` |
| Provider Generator | Create providers | `valdi create provider` |
| Template Engine | Project templates | `valdi new` |
| Validation Engine | Architecture validation | `valdi validate` |
| Dependency Visualizer | Graph generation | `valdi graph` |
| Event Inspector | Event analysis | `valdi validate --events` |
| Documentation Generator | Auto-docs | `valdi docs` |
| Engineering Doctor | Health checks | `valdi doctor` |
| Code Quality | Analysis | `valdi test` |
| Project Bootstrap | New projects | `valdi new` |
| DX Tools | Developer experience | `valdi dev` |
| AI Integration | AI-assisted development | `valdi ai` |

## SDK Layer Model

```
Layer 4: AI Integration (metadata, contracts, standards for AI)
Layer 3: DX Tools (hot reload, live docs, dashboards)
Layer 2: Generators + Validators + Visualizers
Layer 1: Template Engine + Contracts
Layer 0: Engineering Standards + Architectural Invariants
```

## Core Principles

1. **Zero Boilerplate** — Generating a capability should take <60 seconds
2. **Standards by Default** — All generated code complies with ENGINEERING-STANDARDS.md
3. **Validation First** — Every generated component is immediately validatable
4. **AI-Ready** — SDK exposes metadata that AI assistants can consume
5. **Template Composition** — Projects compose capabilities, not copy code
6. **Non-Invasive** — SDK never modifies business logic; only scaffolds and validates

## SDK Contracts

### Capability Contract (SDK)
```javascript
{
  id: string,           // unique identifier
  name: string,         // human-readable name
  version: string,      // semver format
  dependencies: string[], // capability IDs
  init: Function,       // lifecycle: init(context)
  activate: Function,   // lifecycle: activate()
  deactivate: Function, // lifecycle: deactivate()
  destroy: Function     // lifecycle: destroy()
}
```

### Provider Contract (SDK)
```javascript
{
  id: string,
  name: string,
  type: 'database' | 'api' | 'storage' | 'external',
  load: Function,       // async initialize
  get: Function,        // read data
  set: Function,        // write data
  remove: Function,     // delete data
  getAll: Function,     // read all
  refresh: Function     // reload from source
}
```

### Plugin Contract (SDK)
```javascript
{
  id: string,
  name: string,
  version: string,
  capabilities: string[], // capabilities this plugin provides
  dependencies: string[], // capabilities required
  install: Function,
  uninstall: Function,
  configure: Function
}
```

## File Structure

```
valdi-sdk/
  cli/
    commands/           # CLI command implementations
    index.js            # CLI entry point
  generators/
    capability.js       # Capability generator
    provider.js         # Provider generator
    manager.js          # Manager generator
    events.js           # Events generator
    schema.js           # Schema generator
    project.js          # Project generator
  templates/
    capability/         # Capability templates
    provider/           # Provider templates
    project/            # Project templates
    manager/            # Manager templates
  validators/
    capability.js       # Capability validator
    dependency.js       # Dependency validator
    event.js            # Event validator
    architecture.js     # Architecture validator
    naming.js           # Naming convention validator
    documentation.js    # Documentation validator
  visualizers/
    dependency.js       # Dependency graph
    event.js            # Event graph
    layer.js            # Layer graph
    entity.js           # Entity graph
  inspectors/
    event-inspector.js  # Event analysis
    code-quality.js     # Code quality analysis
    doctor.js           # Health checks
  contracts/
    capability.js       # Capability contract definition
    provider.js         # Provider contract definition
    plugin.js           # Plugin contract definition
  standards/
    engineering.js      # Engineering standards (machine-readable)
    invariants.js       # Architectural invariants (machine-readable)
```
