# DEVELOPMENT_POLICY.md

> Permanent development policy for Valdi Platform.
> This document defines the rules for all development activity.

---

## Overview

The Valdi Platform has completed certification (v4.0). The platform is now in **Product Development Mode**, where features are built on top of the frozen platform architecture.

---

## Development Modes

### Platform Development Mode (COMPLETED)

| Item | Value |
|------|-------|
| **Period** | P0 - P14.FINAL |
| **Goal** | Build and certify the platform |
| **Result** | Platform v4.0 CERTIFIED |
| **Status** | COMPLETED |

### Product Development Mode (ACTIVE)

| Item | Value |
|------|-------|
| **Period** | P12.3.1 onwards |
| **Goal** | Build product features on frozen platform |
| **Constraint** | Cannot modify frozen platform components |
| **Status** | ACTIVE |

---

## Golden Rules

### Never Modify (Platform Components)

1. **Business Aggregate** - NEVER modify
2. **BusinessService** - NEVER modify
3. **Business Managers** - NEVER modify
4. **Repository Engine** - NEVER modify
5. **Runtime Engine** - NEVER modify
6. **API Layer** - NEVER modify
7. **Commercial Aggregate** - NEVER modify
8. **Capability Registration** - NEVER modify

### Platform Changes Require

1. **Architecture Proposal** - Document the change
2. **Architecture Audit** - Review by Architecture Guardian
3. **Design Freeze Approval** - Explicit approval to unfreeze
4. **Version Bump** - New platform version if approved

---

## Product Features

### Allowed

- Feature branches from `release/design-freeze-p13.8`
- New capability modules
- New API endpoints (using existing patterns)
- New business logic in new capabilities
- Product-specific code
- Tests
- Documentation

### Prohibited

- Modifications to frozen platform components
- Bypassing BusinessService
- Direct repository access from controllers
- Infrastructure code in domain capabilities
- Introduction of new dependencies on frozen components

---

## Development Workflow

### Feature Development

```
1. Create feature branch from release/design-freeze-p13.8
   git checkout -b feature/my-feature

2. Implement feature
   - Follow existing patterns
   - Use BusinessService as entry point
   - Do not modify frozen components

3. Code Review
   - Peer review required
   - Guardian checks pass

4. Merge to develop
   git checkout develop
   git merge feature/my-feature

5. Guardian Validation
   - Run tools/guardian.js
   - All checks must pass
```

### Platform Modification (EXCEPTIONAL)

```
1. Architecture Proposal
   - Document the change
   - Explain why it cannot be a product feature
   - Submit to Architecture Guardian

2. Architecture Audit
   - Guardian reviews the proposal
   - Evaluates impact on frozen components

3. Design Freeze Approval
   - Requires explicit approval
   - Unfreezes required components
   - Bumps platform version

4. Implementation
   - Only after approval
   - Follows Platform Development protocols
```

---

## Git Workflow

### Protected Branches

| Branch | Purpose | Protection |
|--------|---------|------------|
| `release/design-freeze-p13.8` | Platform baseline | No direct commits |
| `develop` | Integration branch | PR required |
| `main` | Production | PR + review required |

### Feature Branches

| Pattern | Example |
|---------|---------|
| `feature/*` | `feature/database`, `feature/auth` |
| `bugfix/*` | `bugfix/login-issue` |
| `hotfix/*` | `hotfix/critical-fix` |

### Merge Strategy

| Source | Target | Method |
|--------|--------|--------|
| Feature | develop | Merge commit |
| Develop | release/design-freeze-p13.8 | PR + Guardian |
| Hotfix | release/design-freeze-p13.8 | PR + Guardian + Approval |
| Release | main | Tag + Release |

---

## Guardian Integration

### Automatic Checks

The Guardian tool validates:

| Check | Applies To |
|-------|------------|
| Design Freeze Violations | All commits |
| Architecture Consistency | PRs to protected branches |
| Dependency Graph | All changes |
| Frozen Component Access | All code |
| BusinessService Delegation | API changes |

### Required Checks Before Merge

```
✓ tools/guardian.js passes
✓ tools/onboarding.js passes
✓ No frozen component modifications
✓ No Design Freeze violations
✓ Architecture consistency maintained
```

---

## Product Development Priorities

### Infrastructure (P12.3.x)

| Priority | Milestone | Description |
|----------|-----------|-------------|
| 1 | P12.3.1 | Database Connection & Migration |
| 2 | P12.3.2 | Authentication Provider |
| 3 | P12.3.3 | CMS Provider Configuration |
| 4 | P12.3.4 | Repository Adapter Registration |
| 5 | P12.3.5 | Environment Setup |

### API Development (P12.3.8 - P12.3.11)

| Priority | Milestone | Description |
|----------|-----------|-------------|
| 6 | P12.3.8 | Accommodation Management API |
| 7 | P12.3.9 | Reservation API |
| 8 | P12.3.10 | Owner Portal API |
| 9 | P12.3.11 | Visitor Experience API |

### Quality (P12.3.12)

| Priority | Milestone | Description |
|----------|-----------|-------------|
| 10 | P12.3.12 | Testing Setup |

---

## Effort Allocation

### Target

| Category | Allocation |
|----------|------------|
| Product Features | 80% |
| Platform Maintenance | 10% |
| Infrastructure | 10% |

### Rules

1. **80% minimum** on product feature development
2. **Platform modifications** are exceptional and require approval
3. **Infrastructure** should enable product features, not modify platform
4. **Technical debt** in product code is acceptable; platform debt requires approval

---

## Version Policy

### Platform Version

- Only changes when platform architecture changes
- Requires Design Freeze approval
- Current: 4.0 (CERTIFIED)

### Product Version

- Follows semantic versioning
- Increments with each release
- Independent of platform version

---

## Exceptions

### When Platform Modification IS Allowed

1. Critical security vulnerability
2. Required by legal/regulatory changes
3. Performance critical fix with no product alternative
4. Explicit Architecture Proposal approval

### Process for Exceptions

1. Emergency flag in PR
2. Architecture Guardian expedited review
3. Platform lead approval
4. Immediate documentation update
5. Version bump if required

---

## Enforcement

| Rule | Enforcement |
|------|-------------|
| Frozen Component Modification | Guardian blocks merge |
| Design Freeze Violation | Guardian blocks merge |
| Architecture Inconsistency | Guardian blocks merge |
| Missing Tests | PR cannot merge to main |
| Documentation Missing | PR cannot merge to main |

---

## Review and Approval

| Action | Required |
|--------|----------|
| Feature merge to develop | 1 reviewer |
| Feature merge to release | Guardian + 1 reviewer |
| Platform modification | Architecture Proposal + Guardian + Approval |
| Hotfix to release | Guardian + Approval |
| Release to main | 2 reviewers + Guardian |

---

## Documentation Requirements

| Change Type | Documentation |
|-------------|---------------|
| Feature | Feature docs + API docs if applicable |
| Bugfix | Issue reference + fix description |
| Hotfix | Issue reference + fix description + risk assessment |
| Platform Modification | Architecture Proposal + impact analysis |

---

**Policy Established:** 2026-08-02
**Platform Version:** 4.0
**Status:** MANDATORY FOR ALL DEVELOPMENT
