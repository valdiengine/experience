# Git Release Commands — Version 4.0

> Platform release commands for Valdi Platform v4.0

---

## Required Commands

### 1. Checkout Design Freeze Branch

```bash
git checkout release/design-freeze-p13.8
```

### 2. Verify Clean Working Directory

```bash
git status
# Should show: "On branch release/design-freeze-p13.8"
# Working directory should be clean
```

### 3. Tag Platform Release

```bash
git tag -a v4.0-platform -m "Valdi Platform v4.0 - Platform Certified - Ready for Product Development"
```

### 4. Push Branch to Remote

```bash
git push origin release/design-freeze-p13.8
```

### 5. Push Tag to Remote

```bash
git push origin v4.0-platform
```

---

## GitHub Release (Optional)

### Generate Release Notes

Create a GitHub release with this title and description:

**Title:**
```
Valdi Platform v4.0 — Platform Certified
```

**Description:**
```
# Valdi Platform Version 4.0 — Platform Certified

## Status: READY FOR PRODUCT DEVELOPMENT

### Platform Certification

Valdi Platform Version 4.0 has been officially certified as stable and ready for product development.

### What's Included

- **Architecture:** P13.8 Design Freeze (98/100 score)
- **API Layer:** 56+ REST endpoints (closed)
- **Runtime:** Verified and stable
- **Repository:** Design freeze branch
- **Guardian:** Architecture enforcement active
- **Health Engine:** Real-time monitoring

### Key Milestones

- P13.8 — Commercial Aggregate Design Freeze
- P14 — API Layer Foundation
- P14.FINAL — API Layer Closure Audit
- Platform Certification

### Frozen Components

1. Business Aggregate
2. BusinessService
3. Business Managers
4. Repository Engine
5. Runtime Engine
6. API Layer

### Next Steps

- P12.3.1 — Database Connection & Migration
- Product feature development

### Documentation

- Architecture: docs/architecture/
- API Spec: docs/architecture/API_LAYER.md
- Platform Certificate: docs/architecture/PLATFORM_CERTIFICATE.md

---
**Platform Status:** PLATFORM CERTIFIED
**Certification Date:** 2026-08-02
```

---

## Verification Commands

### Verify Current Branch

```bash
git branch --show-current
# Expected: release/design-freeze-p13.8
```

### Verify Latest Tag

```bash
git describe --tags --abbrev=0
# Expected: design-freeze-p13.8
```

### Verify Commit Hash

```bash
git rev-parse HEAD
# Should match the commit in DESIGN_FREEZE.md
```

### List All Tags

```bash
git tag -l
# Expected tags: design-freeze-p13.8, v4.0-platform
```

---

## Rollback Commands (If Needed)

### Remove Local Tag

```bash
git tag -d v4.0-platform
```

### Remove Remote Tag

```bash
git push origin --delete v4.0-platform
```

### Revert to Previous Tag

```bash
git checkout design-freeze-p13.8
```

---

## Post-Release Commands

### Create Next Development Branch

```bash
git checkout -b release/p12.3-infrastructure
```

### Set Upstream Tracking

```bash
git push -u origin release/p12.3-infrastructure
```

---

## Important Notes

1. **Never force push** to `release/design-freeze-p13.8`
2. **All PRs** must pass Guardian checks
3. **Architecture changes** require Design Freeze approval
4. **Feature branches** should branch from `release/design-freeze-p13.8`

---

**Last Updated:** 2026-08-02
**Platform Version:** 4.0
**Release Status:** READY
