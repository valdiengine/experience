# ARCHITECTURE GUARDIAN

> Architecture Protection System for the Valdi Engine.

---

## Version

1.0

---

## Purpose

The Architecture Guardian continuously inspects the repository and detects architectural violations before they become technical debt.

**Never modifies code. Only analyzes, reports, and warns.**

---

## Architecture

```
guardian/
├── index.js                 # Entry point
├── guardian.js              # Main coordinator
├── guardian.config.js        # Configuration
├── architecture.guardian.js  # Architecture checks
├── runtime.guardian.js      # Runtime checks
├── api.guardian.js          # API checks
├── repository.guardian.js    # Repository checks
├── documentation.guardian.js # Documentation checks
├── dependency.guardian.js    # Dependency checks
├── git.guardian.js          # Git checks
├── ai.guardian.js           # AI Operating System checks
└── report.generator.js     # Report generation
```

---

## Usage

### Command Line

```bash
node guardian/index.js
```

### Generated Reports

| File | Location | Format |
|------|----------|--------|
| GUARDIAN_REPORT.md | docs/architecture/ | Markdown |
| guardian-report.json | guardian/ | JSON |
| guardian-history.md | guardian/ | Markdown (append-only) |

---

## Guardian Modules

### Architecture Guardian

Verifies:
- Design Freeze status
- Architecture Version
- Frozen components
- Business Aggregate
- Capability registration
- Business Managers

### Runtime Guardian

Verifies:
- Runtime Bootstrap
- RuntimeContext
- Application Entry Point
- Health Engine
- Capability Bootstrap
- Repository Bootstrap

### API Guardian

Verifies:
- API Bootstrap
- Controllers
- Routes
- Middleware
- BusinessService delegation
- Repository isolation

### Repository Guardian

Verifies:
- Repository count
- Naming
- Contracts
- Mixins
- Persistence isolation

### Documentation Guardian

Verifies:
- Required documents exist
- Broken references
- Version consistency
- Reading order

### Dependency Guardian

Detects:
- Forbidden imports
- Cross-domain imports
- Repository leaks
- Controller leaks
- Runtime leaks
- Infrastructure leaks

### Git Guardian

Verifies:
- Current branch
- Design Freeze branch
- Tags
- Working tree status

### AI Guardian

Verifies:
- AI Operating System documents
- Consistency across AI docs
- Architecture version alignment

---

## Violation Levels

| Level | Name | Weight | Action |
|-------|------|--------|--------|
| P0 | Architecture Broken | 100 | **BLOCK** |
| P1 | Design Freeze Violation | 50 | **BLOCK** |
| P2 | Architecture Inconsistency | 20 | Review |
| P3 | Documentation Inconsistency | 10 | Warning |
| P4 | Recommendation | 1 | Info |

---

## Design Freeze Protection

The Guardian monitors attempts to modify frozen components:

- Business Aggregate
- BusinessService
- Business Managers
- Repository Engine
- Runtime Engine
- Capability Registration
- Aggregate Ownership
- Event Model

When detected, emits **DESIGN_FREEZE_VIOLATION**.

---

## Score Calculation

```
Score = 100 - (P0×25 + P1×25 + P2×10 + P3×2 + P4×1)
```

- Score 80-100: **HEALTHY**
- Score 50-79: **WARNING**
- Score 0-49: **SICK**

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Architecture Guardian
on: [push, pull_request]
jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: node guardian/index.js
      - uses: actions/upload-artifact@v3
        with:
          name: guardian-report
          path: |
            guardian/guardian-report.json
            docs/architecture/GUARDIAN_REPORT.md
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running Architecture Guardian..."
node guardian/index.js
if [ $? -ne 0 ]; then
  echo "Guardian detected violations. Aborting commit."
  exit 1
fi
```

---

## Rules

1. **Never modify implementation** — Only inspect
2. **Never auto-fix architecture** — Report only
3. **Never rewrite Design Freeze** — Protect it
4. **Only warn** — Do not block unless P0/P1
5. **Always report** — Generate all report formats

---

## Future Compatibility

Executable by:
- GitHub Actions
- Git Hooks
- VS Code
- Cursor
- Warp
- OpenCode
- Claude
- ChatGPT
- Gemini
- MiniMax

Without modifications.

---

## Status

**READY**

Run: `node guardian/index.js`
