# REPOSITORY STARTUP

> Human onboarding guide for the Valdi Engine.

---

## Version

1.0

---

## Quick Start

The ONLY command you need to start:

```bash
node tools/onboarding.js
```

This single command will tell you everything about the repository.

---

## Step-by-Step Onboarding

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd <repository-name>
```

### Step 2: Run Onboarding

```bash
node tools/onboarding.js
```

This will:
- Verify repository structure
- Check Git status
- Validate Design Freeze
- Inspect all components
- Print a colored dashboard
- Generate health reports

### Step 3: Read the Dashboard

The dashboard shows:

```
Architecture .............. ACTIVE
Git ....................... CLEAN
Capabilities ............. 32
Business Managers ......... 12
Documentation ............ COMPLETE
Smoke Tests ............... PASS
Design Freeze ............. ACTIVE

Overall ................... HEALTHY
```

### Step 4: Understand Your Position

| Status | Meaning | Action |
|--------|---------|--------|
| HEALTHY | Repository ready | Begin implementation |
| WARNING | Minor issues | Review warnings, proceed |
| FAIL | Critical issues | Fix before proceeding |

### Step 5: Read Key Documents

After onboarding, read:

1. `docs/architecture/PROJECT_HEALTH.md` — Repository health snapshot
2. `docs/architecture/PROJECT_CONTEXT.md` — Architecture overview
3. `docs/architecture/AI_BOOTSTRAP.md` — AI operating procedures
4. `docs/roadmap/ROADMAP.md` — Current development phase

### Step 6: Begin Development

If repository is HEALTHY:

1. Identify your task
2. Read the current phase in ROADMAP
3. Follow AI_BOOTSTRAP rules
4. Never modify frozen components
5. Run tests before committing

---

## Repository Structure

```
<root>/
├── capabilities/          # Domain capabilities (FROZEN)
├── runtime/              # Platform runtime (FROZEN)
├── api/                  # REST API layer
├── persistence/         # Repository engine (FROZEN)
├── docs/                 # Documentation
│   ├── architecture/      # Architecture docs
│   ├── ai/              # AI context files
│   └── roadmap/         # Development roadmap
├── tools/               # Repository tools
│   └── onboarding.js    # ← START HERE
├── guardian/            # Architecture Guardian
└── scripts/             # Utility scripts
```

---

## Design Freeze Rules

**DO NOT MODIFY:**

- Business Aggregate
- BusinessService
- Business Managers
- Repository Engine
- Runtime Engine
- Capability Registration
- Aggregate Ownership
- Event Model

These are frozen at P13.8.

---

## Development Rules

1. **Always use BusinessService as entry point**
2. **Never access repositories directly from controllers**
3. **Never import infrastructure into capabilities**
4. **Always run smoke tests before committing**
5. **Update documentation when changing architecture**

---

## Common Commands

| Command | Purpose |
|---------|---------|
| `node tools/onboarding.js` | Full inspection |
| `node tools/health.js` | Health reports |
| `node tools/guardian.js` | Architecture Guardian |
| `node tools/diagnostics.js` | Quick diagnostics |
| `node tools/report.js` | Dashboard report |
| `node tools/config.js` | Configuration |

---

## Architecture Version

- **Current:** P13.8 Design Freeze + P14.x Runtime/API Integration
- **Frozen:** P13.8 (2026-08-01)
- **Architecture Score:** 98/100

---

## Troubleshooting

### Onboarding fails

1. Check Node.js version (requires 18+)
2. Verify repository clone completed
3. Run: `node tools/diagnostics.js` for details

### Design Freeze violations

1. Review GUARDIAN_REPORT.md
2. Identify which component is frozen
3. Redesign without touching frozen components

### Unknown current phase

1. Read `docs/roadmap/ROADMAP.md`
2. Check `docs/ai/NEXT_PHASE.md`
3. Look at recent commits

---

## Getting Help

1. Run `node tools/onboarding.js` for repository state
2. Read `docs/architecture/AI_BOOTSTRAP.md` for AI procedures
3. Review `docs/architecture/PROJECT_CONTEXT.md` for architecture

---

## Next Steps After Onboarding

1. **Read** `docs/architecture/PROJECT_CONTEXT.md`
2. **Understand** the Commercial Aggregate
3. **Identify** your current development phase
4. **Check** `docs/ai/NEXT_PHASE.md` for tasks
5. **Begin** implementation following AI_BOOTSTRAP rules

---

**START:** `node tools/onboarding.js`
