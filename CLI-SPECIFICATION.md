# CLI-SPECIFICATION.md — Valdi CLI Command Reference

## Overview

The Valdi CLI (`valdi`) is the official command-line interface for the Valdi Engine developer platform.

## Installation

```bash
npm install -g @valdi/cli
# or
npx @valdi/cli <command>
```

## Commands

### Project Commands

#### `valdi new [template]`
Create a new Valdi project from a template.

```bash
valdi new tourism          # Tourism destination project
valdi new municipality     # Municipality project
valdi new company          # Company project
valdi new region           # Regional ecosystem
valdi new destination      # Single destination
valdi new marine           # Marine tourism
valdi new adventure        # Adventure tourism
valdi new smartcity        # Smart city
valdi new education        # Education platform
valdi new events           # Events platform
valdi new marketplace      # Marketplace
valdi new sport            # Sport community
valdi new photography      # Photography platform
valdi new camping          # Camping platform
```

**Options:**
- `--name <name>` — Project name
- `--path <path>` — Target directory
- `--capabilities <list>` — Comma-separated capability list
- `--theme <theme>` — Default theme (cinematic, minimal, nature)
- `--tenant <id>` — Default tenant ID
- `--no-git` — Skip git initialization
- `--no-install` — Skip npm install

**Output:** Complete project with folder structure, capabilities, providers, documentation, CI, testing, configuration, PWA, and default theme.

---

### Create Commands

#### `valdi create capability [name]`
Generate a new capability with full boilerplate.

```bash
valdi create capability booking
valdi create capability seo-intelligence --deps cms,pwa
valdi create capability MyCapability
```

**Generated files:**
- `capabilities/{name}/{name}.capability.js`
- `capabilities/{name}/{name}.schema.js`
- `capabilities/{name}/{name}.events.js`
- `capabilities/{name}/{name}.manager.js`
- `capabilities/{name}/README.md`

**Options:**
- `--deps <list>` — Comma-separated dependencies
- `--version <ver>` — Initial version (default: 1.0.0)
- `--managers <list>` — Comma-separated manager names to generate
- `--events <list>` — Comma-separated event names to generate
- `--no-readme` — Skip README generation
- `--no-tests` — Skip test file generation

#### `valdi create provider [name]`
Generate a new provider following the Provider Contract.

```bash
valdi create provider supabase
valdi create provider postgresql --type database
valdi create provider weather --type external
```

**Generated files:**
- `providers/{name}/{name}.provider.js`
- `providers/{name}/{name}.config.js`
- `providers/{name}/README.md`

**Options:**
- `--type <type>` — Provider type: database, api, storage, external
- `--version <ver>` — Initial version

#### `valdi create manager [name]`
Generate a standalone manager class.

```bash
valdi create manager notification
valdi create manager analytics --capability intelligence
```

#### `valdi create schema [name]`
Generate entity schema definitions.

```bash
valdi create schema destination
valdi create schema booking --fields name,email,date
```

#### `valdi create events [domain]`
Generate event definitions file.

```bash
valdi create events booking
valdi create events ecology --events created,updated,deleted
```

#### `valdi create workflow [name]`
Generate a workflow definition.

```bash
valdi create workflow reservation-flow
```

#### `valdi create plugin [name]`
Generate a plugin package.

```bash
valdi create plugin analytics-dashboard
```

#### `valdi create tenant [name]`
Generate tenant configuration.

```bash
valdi create tenant demo
valdi create tenant --domain example.com --name "Example"
```

#### `valdi create engine [name]`
Generate a custom engine configuration.

```bash
valdi create engine custom
```

#### `valdi create pwa [name]`
Generate PWA configuration and service worker.

```bash
valdi create pwa my-app
```

#### `valdi create destination [name]`
Generate a complete destination template.

```bash
valdi create destination "Costa Rica"
valdi create destination "Patagonia" --locale es-MX
```

#### `valdi create locality [name]`
Generate a locality template.

```bash
valdi create locality "Monteverde"
```

#### `valdi create experience [name]`
Generate an experience template.

```bash
valdi create experience "Bird Watching"
```

#### `valdi create repository [name]`
Generate a git repository template with CI/CD.

```bash
valdi create repository my-project
```

---

### Validation Commands

#### `valdi validate`
Run full architecture validation.

```bash
valdi validate                    # Validate entire project
valdi validate --capability booking  # Validate specific capability
valdi validate --fix              # Auto-fix fixable issues
valdi validate --strict           # Fail on warnings
```

**Checks:**
- Architecture invariants compliance
- Capability contract compliance
- Dependency graph validity
- Event contract validity
- Naming convention compliance
- Documentation completeness
- Version consistency
- Import rules
- Shared layer purity
- Provider purity

#### `valdi validate --events`
Run event mesh validation.

```bash
valdi validate --events           # Validate all events
valdi validate --events --dead    # Show dead events only
valdi validate --events --orphans # Show orphan consumers only
```

#### `valdi validate --imports`
Validate import rules.

```bash
valdi validate --imports          # Check all imports
valdi validate --imports --upward # Check upward imports only
```

---

### Graph Commands

#### `valdi graph`
Generate dependency graphs.

```bash
valdi graph                       # Default: capability dependency graph
valdi graph --type dependency     # Dependency graph
valdi graph --type layer          # Layer graph
valdi graph --type event          # Event flow graph
valdi graph --type entity         # Entity relationship graph
valdi graph --type provider       # Provider graph
valdi graph --type workflow       # Workflow graph
valdi graph --output markdown     # Output as markdown
valdi graph --output mermaid      # Output as Mermaid diagram
valdi graph --output svg          # Output as SVG
valdi graph --output json         # Output as interactive JSON
```

---

### Doctor Command

#### `valdi doctor`
Run complete platform health inspection.

```bash
valdi doctor                      # Full health check
valdi doctor --quick              # Quick check (critical only)
valdi doctor --fix                # Auto-fix issues
valdi doctor --report             # Generate health report
```

**Checks:**
- Architecture compliance
- Dependency health
- Version consistency
- Broken imports
- Missing READMEs
- Missing tests
- Missing events
- Dead events
- Large managers
- Circular dependencies
- Documentation drift
- Unused files
- Event mesh health
- Technical debt items

---

### Documentation Commands

#### `valdi docs`
Generate documentation.

```bash
valdi docs                        # Generate all docs
valdi docs --capability booking   # Generate capability docs
valdi docs --architecture         # Generate architecture docs
valdi docs --api                  # Generate API docs
valdi docs --changelog            # Generate changelog
valdi docs --release-notes        # Generate release notes
valdi docs --version-matrix       # Generate version matrix
```

---

### Testing Commands

#### `valdi test`
Run tests.

```bash
valdi test                        # Run all tests
valdi test --capability booking   # Run capability tests
valdi test --coverage             # Run with coverage
valdi test --watch                # Watch mode
```

---

### Build Commands

#### `valdi build`
Build the project.

```bash
valdi build                       # Production build
valdi build --dev                 # Development build
valdi build --analyze             # Bundle analysis
```

---

### Development Commands

#### `valdi dev`
Start development mode.

```bash
valdi dev                         # Start dev server
valdi dev --hot                   # Hot reload
valdi dev --inspect               # Debug mode
valdi dev --verbose               # Verbose logging
```

---

### Version Commands

#### `valdi version`
Show version information.

```bash
valdi version                     # Show CLI version
valdi version --platform          # Show platform version
valdi version --capabilities      # Show all capability versions
valdi version --check             # Check for updates
```

---

### Upgrade Command

#### `valdi upgrade`
Upgrade the platform.

```bash
valdi upgrade                     # Upgrade to latest
valdi upgrade --to <version>      # Upgrade to specific version
valdi upgrade --check             # Check available upgrades
```

---

### AI Commands

#### `valdi ai`
AI developer integration.

```bash
valdi ai --context                # Export platform context for AI
valdi ai --contracts              # Export contracts for AI
valdi ai --standards              # Export standards for AI
valdi ai --validate <file>        # Validate AI-generated code
```

---

## Global Options

- `--help` — Show help
- `--version` — Show version
- `--verbose` — Verbose output
- `--quiet` — Minimal output
- `--json` — JSON output
- `--dry-run` — Preview without changes
- `--force` — Overwrite existing files
- `--path <path>` — Working directory

---

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General error |
| 2 | Validation failed |
| 3 | File conflict |
| 4 | Missing dependency |
| 5 | Architecture violation |
