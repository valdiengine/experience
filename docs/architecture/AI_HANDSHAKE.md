# AI HANDSHAKE

> Defines what every AI must internally verify before implementing. No implementation details.

---

## Version

1.0

---

## Pre-Implementation Checklist

Every AI must answer YES to all questions before implementing:

---

### Architecture Understanding

- [ ] Architecture Version verified (P13.8 + P14.x)
- [ ] Design Freeze status confirmed (ACTIVE/FROZEN)
- [ ] Current phase identified (P14.1.6)
- [ ] Next phase defined

---

### Design Freeze Verification

- [ ] Frozen components identified
- [ ] Immutable rules confirmed
- [ ] Allowed modifications understood
- [ ] Forbidden modifications confirmed

---

### Entry Point Verification

- [ ] BusinessService is ONLY Commercial Aggregate entry point
- [ ] capability?.service access pattern confirmed
- [ ] capability?.getXxxService() bypass pattern forbidden
- [ ] Business Managers orchestration preserved

---

### Architecture Consistency

- [ ] Aggregate ownership preserved
- [ ] Repository isolation respected
- [ ] Business Managers not bypassed
- [ ] Runtime Engine not modified
- [ ] Event Model not violated

---

### Domain Isolation

- [ ] No infrastructure imports in capabilities
- [ ] No SQL/ORM in capabilities
- [ ] No direct capability imports
- [ ] Cross-capability communication via events

---

### Implementation Readiness

- [ ] Reading order followed (AI_BOOTSTRAP → 00_READ_FIRST → ...)
- [ ] Architecture fingerprint verified
- [ ] Current state confirmed
- [ ] Next phase defined

---

## Implementation Gate

Only proceed if ALL checks are YES.

If ANY check is NO:
- STOP
- Report the issue
- Do NOT modify architecture

---

## Session Start

At the start of every session, verify:

1. Architecture Version: **P13.8 Design Freeze + P14.x Runtime/API Integration**
2. Design Freeze: **ACTIVE**
3. Current Phase: **P14.1.6**
4. Entry Point: **BusinessService via capability?.service**
5. Frozen Components: **Business Aggregate, BusinessService, Business Managers, Repository Engine, Runtime Engine, Capability Registration, Aggregate Ownership, Event Model**

---

## Confirmation

When all checks pass, respond:

```
[✓] Architecture understood
[✓] Design Freeze understood
[✓] Current phase understood
[✓] BusinessService entry point verified
[✓] Runtime entry point verified
[✓] Ready for implementation
```
