# SELF-EXPLAINING REPOSITORY

> How the Valdi Engine becomes self-describing through automated tools.

---

## Version

1.0

---

## Purpose

The Self-Explaining Repository system allows any AI or developer to understand the repository's state by executing a single command:

```bash
node tools/onboarding.js
```

No previous context required. No chat history needed. The repository explains itself.

---

## Architecture

```
tools/
├── onboarding.js      # Main entry point (ONLY command needed)
├── health.js         # Project Health Engine
├── guardian.js       # Architecture Guardian
├── diagnostics.js    # Runtime/Doc/Git diagnostics
├── report.js         # Dashboard generator
└── config.js         # Configuration display

Output:
docs/architecture/PROJECT_HEALTH.md
docs/architecture/PROJECT_HEALTH.json
docs/architecture/GUARDIAN_REPORT.md
```

---

## Execution Flow

```
1. Execute: node tools/onboarding.js
       ↓
2. Check Repository Structure
       ↓
3. Check Git Status
       ↓
4. Verify Design Freeze
       ↓
5. Validate Documentation
       ↓
6. Inspect Architecture
       ↓
7. Inspect Runtime
       ↓
8. Inspect API
       ↓
9. Inspect Capabilities
       ↓
10. Inspect Business Managers
       ↓
11. Print Repository Dashboard
       ↓
12. Save Health Report
       ↓
13. Display Next Steps
```

---

## Components

### Onboarding Tool

**Command:** `node tools/onboarding.js`

The single entry point that:
- Orchestrates all checks
- Prints colored dashboard
- Saves health reports
- Displays next steps

### Health Tool

**Command:** `node tools/health.js`

Generates:
- `PROJECT_HEALTH.md` — Human-readable dashboard
- `PROJECT_HEALTH.json` — Machine-readable data
- `PROJECT_HEALTH_REPORT.md` — Detailed report

### Guardian Tool

**Command:** `node tools/guardian.js`

Executes:
- Architecture Guardian (8 modules)
- Violation detection (P0-P4 levels)
- Report generation

### Diagnostics Tool

**Command:** `node tools/diagnostics.js`

Checks:
- Runtime Bootstrap
- Documentation completeness
- Git status
- Capability count

### Report Tool

**Command:** `node tools/report.js`

Generates:
- Repository Dashboard
- Configuration summary

### Config Tool

**Command:** `node tools/config.js`

Displays:
- Architecture version
- Design Freeze status
- Git configuration
- Available tools

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Repository Onboarding
on: [push, pull_request]
jobs:
  onboarding:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Run Onboarding
        run: node tools/onboarding.js
      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: repository-health
          path: |
            docs/architecture/PROJECT_HEALTH.json
            docs/architecture/GUARDIAN_REPORT.md
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running repository onboarding..."
node tools/onboarding.js
if [ $? -ne 0 ]; then
  echo "Repository health check failed."
  exit 1
fi
```

### VS Code Tasks

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Repository Onboarding",
      "command": "node",
      "args": ["tools/onboarding.js"],
      "problemMatcher": []
    }
  ]
}
```

---

## Design Freeze Protection

The Self-Explaining Repository respects Design Freeze:

- Architecture Guardian monitors frozen components
- Violations are reported at P1 level (BLOCK)
- No modifications to frozen architecture
- Only inspection and reporting

---

## Future Compatibility

Executable by without modification:

- **CI/CD:** GitHub Actions, GitLab CI, Jenkins
- **IDEs:** VS Code, Cursor, WebStorm
- **AI Systems:** Claude, ChatGPT, Gemini, MiniMax, OpenCode
- **Terminals:** Warp, iTerm, Terminal
- **Automation:** Make, npm scripts

---

## Usage Summary

| Command | Purpose |
|---------|---------|
| `node tools/onboarding.js` | Full repository inspection + dashboard |
| `node tools/health.js` | Generate health reports only |
| `node tools/guardian.js` | Run architecture guardian only |
| `node tools/diagnostics.js` | Quick diagnostics check |
| `node tools/report.js` | Generate dashboard report |
| `node tools/config.js` | Show configuration |

---

## Next Steps

After running onboarding:

1. Read `PROJECT_HEALTH.md`
2. Review `PROJECT_CONTEXT.md`
3. Check current phase in `ROADMAP.md`
4. Begin implementation if HEALTHY

---

**The repository is now self-explaining.**

Every AI can understand the architecture by executing:

```bash
node tools/onboarding.js
```
