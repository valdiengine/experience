# RELEASE PROCESS

> Official release process for Valdi Engine.

---

## Version

1.0

---

## Overview

The release process ensures architectural integrity, documentation completeness, and operational readiness.

---

## Release Stages

### Stage 1: Development

**Branch:** `develop` or `feature/*`

Activities:
1. Implement feature or fix
2. Run smoke tests locally
3. Update documentation
4. Update AI_SESSION_REPORT.md

Requirements:
- Smoke test score: 95+
- No Design Freeze violations
- No frozen component modifications

---

### Stage 2: Validation

**Before Merge to develop**

Activities:
1. Run `api.smoke.test.js`
2. Run Architecture Validation
3. Verify Documentation Consistency
4. Review AI_SESSION_REPORT.md

Requirements:
- All tests pass
- Architecture consistent
- Documentation updated

---

### Stage 3: Smoke Tests

**After Merge to develop**

Activities:
1. Run full smoke test suite
2. Verify API endpoints
3. Verify Runtime bootstrap
4. Verify Repository isolation

Requirements:
- Commercial Runtime: PASS
- API Runtime: 95+
- All health checks: PASS

---

### Stage 4: Documentation

**After Validation**

Activities:
1. Update ARCHITECTURE_CHANGELOG.md
2. Update AI_SESSION_REPORT.md
3. Update CURRENT_STATE.md if needed
4. Update NEXT_PHASE.md

Requirements:
- All documentation accurate
- No broken references
- Consistency score: 100/100

---

### Stage 5: Design Freeze

**Release Branch Creation**

For P13.8, the process was:

1. Create branch: `release/design-freeze-p13.8`
2. Tag: `design-freeze-p13.8`
3. Freezes all Commercial Aggregate components
4. Documentation marked as frozen

Requirements:
- Architecture Score: 95+
- All validations pass
- Design Freeze approval

---

### Stage 6: Tagging

**Version Tag Creation**

Format: `design-freeze-p13.8` (architectural) or `v<major>.<minor>.<patch>` (release)

Activities:
1. Create tag with message
2. Tag commit hash
3. Push tag to remote

Example:
```
git tag -a design-freeze-p13.8 -m "P13.8 Design Freeze Approved"
git push origin design-freeze-p13.8
```

---

### Stage 7: Release

**Production Deployment**

Activities:
1. Verify tag on release branch
2. Run production smoke tests
3. Verify health endpoints
4. Deploy

Requirements:
- Tag verified
- Tests pass
- Health checks pass

---

## Future Design Freeze

### Trigger Conditions

A new Design Freeze is triggered when:

1. Major architecture milestone reached
2. All Commercial Aggregate entities validated
3. Architecture score: 95+
4. All smoke tests: 95+

### Process

1. **Proposal**
   - Document architecture changes since last freeze
   - List all frozen components
   - Propose freeze date

2. **Audit**
   - Full Architecture Audit
   - 24-category validation
   - Score must be 95+

3. **Approval**
   - Architecture Review Board
   - Design Freeze vote
   - Create release branch

4. **Implementation**
   - Create `release/design-freeze-pXX.X`
   - Tag the commit
   - Update DESIGN_FREEZE.md

---

## Validation Checklist

Before any release:

- [ ] Smoke tests pass (95+)
- [ ] Architecture validation passes
- [ ] Documentation consistent
- [ ] No broken references
- [ ] AI_SESSION_REPORT.md updated
- [ ] ARCHITECTURE_CHANGELOG.md updated
- [ ] CURRENT_STATE.md updated
- [ ] No Design Freeze violations
- [ ] Git branch correct
- [ ] Tag created

---

## Rollback Process

If issues found after release:

1. **Hotfix Branch**
   - Create `hotfix/<issue>`
   - Fix the issue
   - Run smoke tests

2. **Validation**
   - Full smoke test suite
   - Architecture validation

3. **Merge**
   - Merge to main
   - Merge to develop
   - Update documentation

---

## Release Artefacts

| Artefact | Location | Description |
|----------|----------|-------------|
| Design Freeze | docs/architecture/DESIGN_FREEZE.md | Frozen components |
| Tag | Git | Version marker |
| Branch | Git | Release branch |
| Smoke Test Report | runtime/startup/*.report.json | Test results |
| Session Report | docs/architecture/AI_SESSION_REPORT.md | Work history |

---

## Status

**ACTIVE**

Current Phase: P14.1.6 (Integration Validation Corrections)

Latest Design Freeze: P13.8 (2026-08-01)

---

## Flow Diagram

```
develop/feature
    ↓
Validation
    ↓
Smoke Tests (95+)
    ↓
Documentation Update
    ↓
Architecture Review
    ↓
Design Freeze (if milestone)
    ↓
Tag Creation
    ↓
Release
```

---

**End of Release Process**
