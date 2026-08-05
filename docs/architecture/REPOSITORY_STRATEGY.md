# REPOSITORY_STRATEGY.md

> Git workflow and branching strategy for Valdi Platform.
> This document defines how code moves through the repository.

---

## Overview

| Item | Value |
|------|-------|
| **Platform Version** | 4.0 (CERTIFIED) |
| **Current Branch** | release/design-freeze-p13.8 |
| **Current Tag** | design-freeze-p13.8 |
| **Strategy** | Gitflow + Guardian |

---

## Branch Structure

```
main                                    # Production releases
  └── release/design-freeze-p13.8      # Platform baseline (FROZEN)
        └── develop                     # Integration branch
              ├── feature/*            # Feature branches
              ├── bugfix/*             # Bugfix branches
              └── hotfix/*             # Hotfix branches
```

---

## Protected Branches

| Branch | Purpose | Protection Level |
|--------|---------|-----------------|
| `main` | Production code | Highest - PR + 2 reviewers + Guardian |
| `release/design-freeze-p13.8` | Platform baseline | No direct commits |
| `develop` | Integration branch | PR + 1 reviewer + Guardian |

### Rules for Protected Branches

1. **No direct commits** - All changes via PR
2. **Guardian must pass** - `tools/guardian.js` must pass
3. **Code review required** - At least 1 reviewer
4. **No force push** - History must be preserved
5. **Protected by GitHub settings** - Admin-enforced

---

## Feature Branches

### Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/{name}` | `feature/database`, `feature/auth` |
| Bugfix | `bugfix/{issue}-{name}` | `bugfix/123-login-error` |
| Hotfix | `hotfix/{issue}-{name}` | `hotfix/999-critical-security` |
| Chore | `chore/{name}` | `chore/update-deps` |
| Docs | `docs/{name}` | `docs/api-documentation` |
| Refactor | `refactor/{name}` | `refactor/booking-flow` |

### Feature Branch Lifecycle

```
1. Create from release/design-freeze-p13.8
   git checkout -b feature/my-feature release/design-freeze-p13.8

2. Work on feature
   git add .
   git commit -m "feat: implement my feature"

3. Keep up to date with parent
   git fetch origin
   git merge origin/release/design-freeze-p13.8

4. Push branch
   git push -u origin feature/my-feature

5. Create PR to develop
   (GitHub PR template)

6. After approval, merge to develop
   git checkout develop
   git merge feature/my-feature
```

---

## Recommended Feature Branches

### Infrastructure

| Branch | Description | Milestone |
|--------|-------------|-----------|
| `feature/database` | Database connection & migration | P12.3.1 |
| `feature/auth-provider` | Authentication provider setup | P12.3.2 |
| `feature/cms-provider` | CMS provider configuration | P12.3.3 |
| `feature/repository-adapters` | Repository adapter registration | P12.3.4 |
| `feature/environments` | Environment setup | P12.3.5 |

### Backend APIs

| Branch | Description | Milestone |
|--------|-------------|-----------|
| `feature/accommodation-api` | Accommodation Management API | P12.3.8 |
| `feature/reservation-api` | Reservation API | P12.3.9 |
| `feature/owner-portal-api` | Owner Portal API | P12.3.10 |
| `feature/visitor-api` | Visitor Experience API | P12.3.11 |
| `feature/cms-sync` | Event → CMS Sync Wiring | P12.3.6 |
| `feature/email-wiring` | Event → Email Wiring | P12.3.7 |

### Quality

| Branch | Description | Milestone |
|--------|-------------|-----------|
| `feature/testing` | Testing setup | P12.3.12 |

### Future

| Branch | Description |
|--------|-------------|
| `feature/stripe` | Stripe payment integration |
| `feature/flutter-app` | Flutter mobile app |
| `feature/pwa` | Progressive Web App |
| `feature/admin-panel` | Admin panel |

---

## Merge Strategy

### Feature → Develop

```
Method: Merge commit (no fast-forward)
Protection: PR + 1 reviewer + Guardian

PR Requirements:
✓ Guardian checks pass
✓ Tests added/updated
✓ Documentation updated
✓ No frozen component modifications
```

### Develop → release/design-freeze-p13.8

```
Method: PR withGuardian validation
Protection: PR + Guardian + Architecture review

PR Requirements:
✓ Guardian checks pass
✓ No Design Freeze violations
✓ All milestone tests pass
✓ Documentation complete
✓ Architecture consistency verified
```

### Hotfix → release/design-freeze-p13.8

```
Method: Fast-track PR
Protection: PR + Guardian + Emergency approval

Requirements:
✓ Critical issue justification
✓ Risk assessment
✓ Guardian checks pass
✓ Rollback plan documented
```

### Release → main

```
Method: Tag + Release
Protection: 2 reviewers + Guardian + Release approval

Requirements:
✓ All tests pass
✓ Changelog updated
✓ Version bumped
✓ Release notes written
```

---

## Commit Messages

### Format

```
{type}: {short description}

{optional body}

{optional footer}
```

### Types

| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting |
| `refactor` | Code restructuring |
| `test` | Tests |
| `chore` | Maintenance |
| `perf` | Performance |
| `ci` | CI/CD |

### Examples

```
feat: add database connection configuration

Implement PostgreSQL connection using environment variables.
Configure Drizzle ORM for production use.

Closes #123
```

```
fix: resolve authentication token expiration issue

The JWT token was expiring too quickly. Extended expiration
to 24 hours and added refresh token logic.

Fixes #456
```

---

## Version Tags

### Platform Tags

| Tag | Description |
|-----|-------------|
| `v4.0-platform` | Platform v4.0 certified release |

### Product Tags

| Pattern | Example |
|---------|---------|
| `v{MAJOR}.{MINOR}.{PATCH}` | `v1.0.0`, `v1.1.0` |

### Tag Process

```
1. Create tag from release branch
   git tag -a v1.0.0 -m "Release v1.0.0"

2. Push tag to remote
   git push origin v1.0.0

3. GitHub release created automatically
   (via GitHub Actions or manually)
```

---

## GitHub Configuration

### Branch Protection Rules

| Branch | Required Reviews | Enforce Guardian | Status Checks |
|--------|-----------------|------------------|---------------|
| `main` | 2 | Required | All must pass |
| `release/design-freeze-p13.8` | 1 | Required | All must pass |
| `develop` | 1 | Required | All must pass |

### Required Status Checks

```
✓ guardian.js (tools/guardian.js)
✓ onboarding.js (tools/onboarding.js)
✓ tests (if available)
✓ lint (if configured)
```

---

## Rollback Procedures

### Feature Rollback

```
1. Revert merge commit
   git revert {merge-commit-sha}

2. Push revert
   git push origin develop

3. Guardian validates
```

### Hotfix Rollback

```
1. Identify issue
2. Create hotfix branch
3. Implement fix
4. Test thoroughly
5. Merge with Guardian validation
6. Monitor production
```

---

## Workflow Summary

```
                    ┌─────────────────────────────────────┐
                    │         release/design-freeze-p13.8 │
                    │              (PROTECTED)            │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │              develop                │
                    │         (PROTECTED)                │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼─────────┐ ┌────────▼────────┐ ┌────────▼────────┐
    │  feature/*       │ │  bugfix/*      │ │  chore/*       │
    │  (Temporary)     │ │  (Temporary)   │ │  (Temporary)   │
    └─────────┬─────────┘ └────────┬────────┘ └────────────────┘
              │                    │
              └────────────────────┘
                           │
                    Merge via PR
                    (with Guardian)
```

---

## Common Commands

### Start Feature

```bash
git checkout -b feature/my-feature release/design-freeze-p13.8
```

### Update from Parent

```bash
git fetch origin
git merge origin/release/design-freeze-p13.8
```

### Complete Feature

```bash
git checkout develop
git merge feature/my-feature --no-ff
git push origin develop
```

### Create Hotfix

```bash
git checkout -b hotfix/critical-issue release/design-freeze-p13.8
# Implement fix
git checkout release/design-freeze-p13.8
git merge hotfix/critical-issue --no-ff
git push origin release/design-freeze-p13.8
```

---

**Document Created:** 2026-08-02
**Platform Version:** 4.0
**Status:** MANDATORY FOR ALL DEVELOPMENT
