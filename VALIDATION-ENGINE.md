# VALIDATION-ENGINE.md — Architecture Validation Engine

## Overview

The Validation Engine inspects the entire Valdi Engine codebase and verifies compliance with architectural rules, engineering standards, and platform contracts.

## Validation Categories

### 1. Capability Contract Validation

Checks every capability for:
- Extends BaseCapability
- Has static id, name, version, dependencies
- Implements init(), activate(), deactivate(), destroy()
- Exports named class + default export
- Has README.md
- Has no business logic violations
- Resources cleaned up in destroy()

**Severity:** CRITICAL if extends BaseCapability fails
**Severity:** HIGH if missing lifecycle methods
**Severity:** MEDIUM if missing README
**Severity:** LOW if missing export default

### 2. Dependency Graph Validation

Checks:
- No circular dependencies (DFS cycle detection)
- No upward imports (layer N → layer N+1)
- No sibling capability imports
- All dependencies declared in static dependencies
- No unused imports
- No duplicate imports
- Import paths resolve to existing files

**Severity:** CRITICAL if circular dependency found
**Severity:** CRITICAL if upward import found
**Severity:** HIGH if undeclared dependency
**Severity:** MEDIUM if unused import

### 3. Event Mesh Validation

Checks:
- No duplicate event strings across files
- Every emitted event has at least one consumer
- Every consumed event has at least one producer
- Event naming follows convention (domain:entity.action)
- No namespace collisions (same export name, different events)
- Event payloads are documented
- Reserved events are marked

**Severity:** HIGH if dead event (no consumer)
**Severity:** HIGH if orphan consumer (no producer)
**Severity:** MEDIUM if naming violation
**Severity:** LOW if missing payload docs

### 4. Naming Convention Validation

Checks:
- Capability IDs: lowercase, hyphenated
- File names: dot-separated ({domain}.{type}.js)
- Class names: PascalCase
- Method names: camelCase
- Event names: domain:entity.action
- Constant names: UPPER_SNAKE_CASE
- Folder names: lowercase

**Severity:** MEDIUM for any naming violation

### 5. Documentation Validation

Checks:
- Every capability has README.md
- README contains: purpose, dependencies, events, usage
- CURRENT_STATE.md is up to date
- CAPABILITY_INDEX.md matches register.js
- EVENT_INDEX.md matches event files
- No broken cross-references
- Version numbers match between code and docs

**Severity:** MEDIUM for missing documentation
**Severity:** LOW for outdated references

### 6. Version Consistency Validation

Checks:
- All capability versions follow semver
- Documentation versions match code versions
- No version drift between files
- ROADMAP.md versions are current

**Severity:** LOW for version drift

### 7. Shared Layer Purity Validation

Checks:
- No business logic in shared/constants/
- No domain-specific labels in shared/
- No tenant-specific config in shared/
- shared/ imports only from shared/ (no upward)

**Severity:** HIGH for business logic in shared

### 8. Provider Purity Validation

Checks:
- No business logic in providers/
- Providers only handle data source communication
- Providers follow BaseProvider contract
- No domain-specific logic in providers

**Severity:** HIGH for business logic in providers

### 9. Architecture Invariants Validation

Checks all 14 invariants:
- INV-001: Event-driven communication only
- INV-002: Providers never contain business logic
- INV-003: Shared layer is business-agnostic
- INV-004: Capabilities communicate through contracts
- INV-005: Offline-first by design
- INV-006: Contextual discovery
- INV-007: Ecology precedes monetization
- INV-008: Multi-tenant compatible
- INV-009: Independently deployable
- INV-010: AI assists, humans decide
- INV-011: No upward imports
- INV-012: All data through DataManager
- INV-013: Events as source of truth
- INV-014: Single responsibility

**Severity:** CRITICAL for invariant violation

### 10. Code Quality Validation

Checks:
- File size <300 lines per file
- No duplicate code blocks
- No unused exports
- No unused variables
- Cyclomatic complexity <10
- No hardcoded strings (brand names, tenant IDs)
- Error handling present

**Severity:** MEDIUM for quality issues

## Validation Report Format

```markdown
# Validation Report

Date: 2026-07-27
Scope: Full project
Duration: 2.3s

## Summary
- CRITICAL: 0
- HIGH: 2
- MEDIUM: 5
- LOW: 3
- PASSED: 45

## Results

### ✅ PASSED
- [CAP-001] All 26 capabilities extend BaseCapability
- [CAP-002] All lifecycle methods present
- [DEP-001] No circular dependencies
- ...

### ⚠️ WARNING
- [EVT-003] 120 dead events (marked Reserved)
- [NAM-002] Dual event naming conventions
- ...

### ❌ FAILED
- [DEP-005] Upward import in engine/core/engine.js:45
- ...
```

## Validation Commands

```bash
valdi validate                    # Full validation
valdi validate --capability X     # Validate one capability
valdi validate --events           # Events only
valdi validate --imports          # Imports only
valdi validate --naming           # Naming only
valdi validate --docs             # Documentation only
valdi validate --fix              # Auto-fix issues
valdi validate --strict           # Fail on warnings
valdi validate --json             # JSON output
```
