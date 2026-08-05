# PROJECT HEALTH ENGINE

> Developer Tool for automated repository health inspection and documentation generation.

---

## Version

1.0

---

## Purpose

The Project Health Engine automatically inspects the repository and generates health documentation without manual editing.

Never hardcodes values. Everything inferred from repository.

Never modifies architecture. Only inspects and generates reports.

---

## Architecture

```
scripts/project-health.js
    ↓
[Inspection Phase]
    ├── Architecture
    ├── Git
    ├── Documentation
    ├── Runtime
    ├── API
    ├── Capabilities
    ├── Repositories
    ├── Business Managers
    └── Smoke Tests
    ↓
[Generation Phase]
    ↓
docs/architecture/PROJECT_HEALTH.md
docs/architecture/PROJECT_HEALTH.json
docs/architecture/PROJECT_HEALTH_REPORT.md
```

---

## Usage

### Command Line

```bash
node scripts/project-health.js
```

### Generated Files

| File | Purpose | Format |
|------|---------|--------|
| PROJECT_HEALTH.md | Human-readable dashboard | Markdown |
| PROJECT_HEALTH.json | Machine-readable data | JSON |
| PROJECT_HEALTH_REPORT.md | Detailed report with warnings | Markdown |

---

## Inspection Categories

### Architecture

- Architecture Version
- Documentation Version
- Context Version
- Design Freeze status
- Architecture Score
- Current Phase
- Last Phase
- Next Phase

### Git

- Current Branch
- Design Freeze Branch
- Latest Tag
- Last Commit
- Working Tree Status
- Repository Initialized

### Documentation

Verifies existence of:
- AI_BOOTSTRAP
- 00_READ_FIRST
- PROJECT_CONTEXT
- PROJECT_HEALTH
- ARCHITECTURE_FINGERPRINT
- AI_RULES
- AI_HANDSHAKE
- AI_SESSION_REPORT
- AI_DECISIONS
- CURRENT_STATE
- NEXT_PHASE
- MASTER_CONTEXT
- ROADMAP
- CHANGELOG
- DESIGN_FREEZE
- ARCHITECTURE_IMMUTABLE

### Runtime

- Application Entry Point
- Runtime Bootstrap
- RuntimeContext
- Capability Bootstrap
- Repository Bootstrap

### API

- API Bootstrap
- API Server
- Business Controller
- All Route Files
- Middleware Count
- Route Count

### Capabilities

- Total Capabilities
- Capability List
- Missing Registrations
- Duplicated Registrations
- Naming Verification

### Repositories

- Total Repositories
- Total Mixins
- Repository Contracts
- Naming Verification

### Business Managers

- Total Managers
- Sub-Manager Count
- Manager List
- Registration Verification
- Delegation Pattern

### Smoke Tests

- API Smoke Test
- Runtime Bootstrap
- Latest Score
- Report Existence

---

## Output Formats

### PROJECT_HEALTH.md

Single-page health dashboard with:
- Status tables for each category
- PASS/FAIL/WARNING indicators
- Overall health assessment

### PROJECT_HEALTH.json

Machine-readable format:

```json
{
  "timestamp": "2026-08-02T...",
  "architecture": {
    "version": "P13.8",
    "score": 98,
    "currentPhase": "P14.1.6",
    "status": "PASS"
  },
  "overall": {
    "architecture": "PASS",
    "documentation": "PASS",
    "runtime": "PASS",
    "overall": "HEALTHY"
  }
}
```

### PROJECT_HEALTH_REPORT.md

Detailed report with:
- Warnings list
- Errors list
- Statistics
- Recommendations

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Project Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: node scripts/project-health.js
      - uses: actions/upload-artifact@v3
        with:
          name: project-health
          path: docs/architecture/PROJECT_HEALTH.*
```

### VS Code

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [{
    "label": "Project Health",
    "command": "node",
    "args": ["scripts/project-health.js"],
    "problemMatcher": []
  }]
}
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
node scripts/project-health.js
git add docs/architecture/PROJECT_HEALTH.*
```

---

## Future AI Sessions

Every AI can now run:

```bash
node scripts/project-health.js
```

To regenerate the health dashboard from current repository state.

---

## Rules

1. Never hardcode values — always infer from repository
2. Never modify architecture — only inspect
3. Never modify implementation — only generate reports
4. Always generate all three output formats
5. Never skip any inspection category

---

## Status

**READY**

The engine is ready for execution.

Run: `node scripts/project-health.js`
