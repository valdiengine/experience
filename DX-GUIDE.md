# DX-GUIDE.md — Developer Experience Guide

## Overview

The Valdi DX (Developer Experience) tooling makes developing for the Valdi Engine platform fast, safe, and enjoyable.

## Quick Start

```bash
# Install SDK
npm install -g @valdi/cli

# Create project
valdi new tourism --name "My Destination"

# Start developing
cd my-destination
valdi dev

# Create a capability
valdi create capability bookings

# Validate
valdi validate

# Check health
valdi doctor
```

## Development Workflow

### 1. Create a Capability
```bash
valdi create capability my-feature --deps cms,pwa
```
This generates:
- capability.js (extends BaseCapability)
- schema.js (entity definitions)
- events.js (event contracts)
- manager.js (business logic)
- README.md (documentation)
- __tests__/my-feature.test.js (tests)

### 2. Implement Business Logic
Edit the generated manager.js to add business methods.
The capability.js already has lifecycle methods wired up.

### 3. Define Events
Edit events.js to add your event contracts:
```javascript
export const MY_FEATURE_EVENTS = {
  CREATED: 'my-feature:created',
  UPDATED: 'my-feature:updated',
};
```

### 4. Register Events
In capability.js, use this.on()/this.off() for listeners.

### 5. Validate
```bash
valdi validate
```

### 6. Test
```bash
valdi test --capability my-feature
```

## Hot Reload

The development server supports hot reload:

```bash
valdi dev --hot
```

Changes to capability files automatically reload the affected capabilities without full page refresh.

## Live Documentation

```bash
valdi docs --watch
```

Documentation regenerates automatically when source files change.

## Event Monitor

```bash
valdi dev --events
```

Real-time event stream showing all events flowing through the system.

## Dependency Monitor

```bash
valdi dev --deps
```

Live dependency graph that updates when capabilities are added/removed.

## Debug Mode

```bash
valdi dev --inspect --verbose
```

Detailed logging of:
- Capability initialization order
- Event emission and consumption
- DataManager operations
- Provider connections

## Architecture Dashboard

```bash
valdi dev --dashboard
```

Browser-based dashboard showing:
- Capability health status
- Event mesh visualization
- Dependency graph
- Performance metrics
- Architecture compliance

## AI Integration

### Export Context for AI
```bash
valdi ai --context > ai-context.json
```

This exports:
- All capability metadata
- All event contracts
- All entity schemas
- Architecture rules
- Engineering standards

### Validate AI-Generated Code
```bash
valdi ai --validate generated-code.js
```

Checks if AI-generated code complies with platform standards.

### Generate Compliant Code
```bash
valdi ai --generate "Create a booking capability with confirmation events"
```

Uses AI to generate platform-compliant code from natural language.

## IDE Integration

### VS Code Extension (Future)
- Auto-complete for capability APIs
- Event contract validation
- Import path suggestions
- Architecture linting
- Live documentation hover

### Language Server Protocol (Future)
- Provides IDE features to any editor
- Real-time validation
- Code actions for common patterns

## Debugging

### Common Issues

**Capability not initializing:**
```bash
valdi doctor --capability my-feature
```

**Events not firing:**
```bash
valdi validate --events
```

**Import errors:**
```bash
valdi validate --imports
```

**Performance issues:**
```bash
valdi doctor --performance
```

### Debug Logging

Set environment variable for verbose logging:
```bash
VALDI_DEBUG=true valdi dev
```

## Best Practices

1. **Always validate before committing** — `valdi validate`
2. **Use the generator** — Don't create capabilities manually
3. **Keep managers small** — Split at 300 lines
4. **Define events first** — Then implement handlers
5. **Test lifecycle** — init → activate → deactivate → destroy
6. **Document as you go** — README.md is required
7. **Follow naming conventions** — The validator enforces them

## Getting Help

```bash
valdi --help                      # General help
valdi create --help               # Create command help
valdi validate --help             # Validate command help
valdi doctor --help               # Doctor command help
```
