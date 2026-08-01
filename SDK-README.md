# SDK-README.md — Valdi Platform SDK

## What is the Valdi SDK?

The Valdi SDK is the official development toolkit for the Valdi Engine platform. It provides everything needed to create, validate, and maintain platform-compliant applications.

## Features

- **CLI** — Command-line interface for all operations
- **Code Generators** — Create capabilities, providers, managers in seconds
- **Architecture Validators** — Ensure compliance with platform standards
- **Dependency Visualizer** — Generate graphs and diagrams
- **Event Inspector** — Analyze event mesh health
- **Documentation Generator** — Auto-generate docs from code
- **Project Templates** — Start with pre-configured project setups
- **Engineering Doctor** — Health checks and diagnostics
- **AI Integration** — Export context for AI assistants

## Quick Start

```bash
# Install
npm install -g @valdi/cli

# Create a project
valdi new tourism --name "My Destination"

# Start developing
cd my-destination
valdi dev

# Create a capability
valdi create capability my-feature

# Validate
valdi validate

# Check health
valdi doctor
```

## Commands

| Command | Description |
|---|---|
| `valdi new [template]` | Create new project |
| `valdi create <type> [name]` | Generate component |
| `valdi validate` | Validate architecture |
| `valdi graph` | Generate graphs |
| `valdi doctor` | Health check |
| `valdi docs` | Generate documentation |
| `valdi test` | Run tests |
| `valdi dev` | Start development |
| `valdi build` | Build for production |
| `valdi version` | Version info |
| `valdi upgrade` | Upgrade platform |
| `valdi ai` | AI integration |

## Creating Components

### Capability
```bash
valdi create capability booking --deps cms,pwa
```

### Provider
```bash
valdi create provider supabase --type database
```

### Manager
```bash
valdi create manager analytics --capability intelligence
```

### Events
```bash
valdi create events ecology --events created,updated
```

### Schema
```bash
valdi create schema destination --fields name,location
```

## Validation

```bash
valdi validate                    # Full validation
valdi validate --capability X     # One capability
valdi validate --events           # Events only
valdi validate --imports          # Imports only
valdi validate --fix              # Auto-fix
```

## Graphs

```bash
valdi graph --type dependency     # Dependency graph
valdi graph --type event          # Event flow
valdi graph --type layer          # Layer architecture
valdi graph --type entity         # Entity relationships
valdi graph --output mermaid      # Mermaid format
valdi graph --output svg          # SVG image
```

## Health Check

```bash
valdi doctor                      # Full check
valdi doctor --quick              # Critical only
valdi doctor --fix                # Auto-fix
valdi doctor --report             # Generate report
```

## Documentation

```bash
valdi docs                        # All docs
valdi docs --capability X         # Capability docs
valdi docs --architecture         # Architecture docs
valdi docs --changelog            # Changelog
```

## AI Integration

```bash
valdi ai --context                # Export context
valdi ai --contracts              # Export contracts
valdi ai --validate file.js       # Validate AI code
```

## Configuration

```javascript
// valdi.config.js
export default {
  name: 'My Project',
  template: 'tourism',
  theme: 'cinematic',
  capabilities: ['booking', 'cms', 'public'],
  providers: { default: 'json' }
};
```

## Engineering Standards

All generated code complies with:
- ARCHITECTURAL-INVARIANTS.md (14 immutable rules)
- ENGINEERING-STANDARDS.md (12 standard sections)
- Capability Contract (BaseCapability + lifecycle)
- Event Naming Convention (domain:entity.action)
- Import Rules (no upward imports, no circular deps)

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git >= 2.0.0 (optional)

## Links

- [Engineering Standards](ENGINEERING-STANDARDS.md)
- [Architectural Invariants](ARCHITECTURAL-INVARIANTS.md)
- [CLI Specification](CLI-SPECIFICATION.md)
- [SDK Architecture](SDK-ARCHITECTURE.md)
- [Developer Guide](DX-GUIDE.md)
