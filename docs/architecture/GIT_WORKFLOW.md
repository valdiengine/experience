# GIT WORKFLOW

> Official Git strategy for the Valdi Engine project.

---

## Version

1.0

---

## Branch Strategy

### main

Production only.

Never develop here.

Direct merges only from release branches.

---

### release/design-freeze-p13.8

Frozen architecture.

Historical reference.

**Never modify.**

This branch represents the P13.8 Design Freeze state.

All further development happens on feature branches.

---

### develop

Current integration branch.

Default working branch.

Feature branches merge here after validation.

---

### feature/*

Feature development branches.

Naming convention: `feature/<feature-name>`

Examples:
- `feature/payment-provider`
- `feature/notification-provider`
- `feature/mobile-app`
- `feature/search`
- `feature/openapi`
- `feature/flutter-client`
- `feature/admin-panel`
- `feature/reporting`

Rules:
- One feature per branch
- Merge only after validation
- Must pass smoke tests before merge

---

### hotfix/*

Critical production fixes only.

Naming: `hotfix/<issue>`

Merge directly to main and develop.

Requires smoke test validation.

---

### experiment/*

Architecture experiments.

Naming: `experiment/<experiment-name>`

Rules:
- Never merge without Architecture Audit
- Must be approved by Architecture Review
- Experimental code stays separate

---

## Merge Requirements

Every merge into `develop` requires:

1. **Architecture Validation**
   - Verify no Design Freeze violations
   - Verify no frozen components modified

2. **Smoke Test**
   - Run `api.smoke.test.js`
   - Score must be 95+

3. **Documentation Update**
   - Update AI_SESSION_REPORT.md
   - Update ARCHITECTURE_CHANGELOG.md if needed

4. **AI Session Report**
   - Log the work done
   - Log any warnings
   - Log next phase

---

## Prohibited Actions

### NEVER DO

- Never merge directly to main (except hotfix)
- Never modify release/design-freeze-p13.8
- Never bypass smoke tests
- Never skip Architecture Validation
- Never modify frozen components
- Never commit secrets or keys
- Never force push to main or release branches

---

## Commit Messages

Format: `<type>(<scope>): <description>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

Examples:
- `docs(ai): update session report`
- `fix(api): correct route service access`
- `feat(provider): add stripe integration`

---

## Branch Protection

| Branch | Protection |
|--------|------------|
| main | Requires PR + 2 reviews + tests |
| release/design-freeze-p13.8 | NO MODIFICATIONS |
| develop | Requires PR + 1 review + tests |
| feature/* | Requires PR + tests |
| hotfix/* | Requires PR + tests |
| experiment/* | Requires Architecture Audit |

---

## Git Flow Diagram

```
main
  ↑                    ↑
  │      hotfix/*      │
  └────────────────────┘
                          release/design-freeze-p13.8
                                        ↑
  develop ←────────────────────────────┤
    ↑                                  │
    │    feature/* ────────────────────┘
    │          ↓
    │    (after validation)
    │
    └────────────────→ experiment/*
```

---

## Version Tags

Format: `v<major>.<minor>.<patch>`

Current: `design-freeze-p13.8` (architectural tag)

Future:
- `v1.0.0` (first production release)
- `v1.1.0` (feature release)
- `v1.1.1` (patch release)

---

## Design Freeze Rules

During Design Freeze (P13.8):

1. No modifications to frozen components
2. Only documentation updates allowed
3. Only AI Operating System changes allowed
4. Feature branches frozen until next release

---

## Workflow Summary

| Action | Branch | Requirements |
|--------|--------|--------------|
| Develop | develop | PR + Validation + Tests |
| Feature | feature/* | PR + Validation + Tests |
| Hotfix | hotfix/* | PR + Tests |
| Experiment | experiment/* | Architecture Audit |
| Release | release/* | PR + Full Validation |
| Design Freeze | release/design-freeze-p13.8 | NO MODIFICATIONS |

---

## Status

**ACTIVE**

Current branch: `release/design-freeze-p13.8`

Design Freeze: ACTIVE (P13.8)
