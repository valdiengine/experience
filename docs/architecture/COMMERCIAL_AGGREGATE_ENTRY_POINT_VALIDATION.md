# P14.1.5.5 — Commercial Aggregate Entry Point Validation

**Status:** DECISION COMPLETE

**Date:** 2026-08-02
**Validator:** P14.1.5.5 Architectural Decision Validation

---

## Executive Summary

**Decision: OPTION A**

**BusinessService is the ONLY official entry point for the Commercial Aggregate.**

Controllers MUST NEVER access `Capability.service` directly.

**Evidence:** Multiple architecture documents explicitly establish BusinessService as the mandatory entry point. No document supports direct Capability.service access from controllers.

---

## Questions Answered

### 1. What is the official entry point?

**BusinessService** is the official entry point.

### 2. What was the original architectural intent?

The architectural intent is documented in:

| Document | Section | Quote |
|----------|---------|-------|
| `API_LAYER.md` | Objective | "Consumes only BusinessService (no bypass, no duplication)" |
| `API_LAYER.md` | Rules | "ALWAYS delegate to BusinessService" |
| `DESIGN_FREEZE.md` | Orchestration | "Business Managers must remain as thin orchestrators" |
| `DESIGN_FREEZE.md` | Orchestration | "All delegation patterns must be preserved" |
| `API_LAYER_ARCHITECTURE_VALIDATION.md` | Dependency Graph | All 7 route files "✓ Delegates to BusinessService" |
| `API_RUNTIME_INTEGRATION.md` | Verified Chain | "Controller → BusinessService → BusinessManager → Capability → Repository" |

### 3. Does allowing Pattern B violate the Commercial Aggregate?

**YES — Pattern B violates the Commercial Aggregate architecture.**

The Commercial Aggregate is designed with Business as the **aggregate root**. All operations on child entities (Accommodation, Reservation, Visitor, etc.) must flow through Business. Bypassing BusinessService to access Capability.service directly breaks the aggregate root contract.

### 4. Does BusinessService exist to hide the capability graph?

**YES.**

BusinessService is the **facade** that:
- Hides the internal capability structure
- Provides a stable, domain-oriented API
- Enforces aggregate root invariants
- Prevents coupling between controllers and internal capability graph

### 5. Would exposing every capability directly increase coupling?

**YES — significantly.**

If controllers accessed capabilities directly:
- Controllers would know about capability internals
- Changing capability structure would break controllers
- Aggregate invariants could be bypassed
- Business orchestration logic would be duplicated or lost

### 6. Does Pattern B violate Design Freeze rules?

**YES.**

Design Freeze explicitly states:
> "All delegation patterns must be preserved"

Pattern B eliminates the delegation through BusinessService.

### 7. Evaluate Business Managers if controllers bypass them.

Business Managers would become **redundant** if controllers bypass them.

The 12 BusinessManagers (1 aggregate root + 11 sub-managers) exist to:
- Orchestrate cross-capability operations
- Enforce cascade rules
- Maintain aggregate invariants
- Provide business-level aggregation

If controllers access `capability.service` directly, these managers are never invoked.

### 8. Official dependency chain.

```
Controller
    ↓
BusinessService  ← MANDATORY ENTRY POINT
    ↓
BusinessManager (and sub-managers)
    ↓
Capability
    ↓
Repository
```

---

## Pattern Comparison

| Aspect | Pattern A (BusinessService) | Pattern B (Capability.service) |
|--------|-----------------------------|-------------------------------|
| Entry point | BusinessService | Capability.service |
| Aggregate root respected | YES | NO |
| Business orchestration | INVOKED | BYPASSED |
| Cascade rules | ENFORCED | VIOLATED |
| Coupling to internals | LOW | HIGH |
| Stable API | YES | NO |
| Design Freeze compliant | YES | NO |

---

## Evidence Summary

### Document: API_LAYER.md

**Section: Objective**
> Exposes Commercial Aggregate capabilities via REST API that:
> - Consumes only BusinessService (no bypass, no duplication)

**Section: Rules**
> 4. **ALWAYS** delegate to BusinessService

### Document: DESIGN_FREEZE.md

**Section: Business Orchestration**
> - Business Managers must remain as thin orchestrators
> - All delegation patterns must be preserved

### Document: API_LAYER_ARCHITECTURE_VALIDATION.md

**Section: Dependency Graph**
```
│   ├── accommodation.routes.js    ✓ Delegates to BusinessService
│   ├── availability.routes.js    ✓ Delegates to BusinessService
│   ├── business.routes.js        ✓ Delegates to BusinessService
│   ├── payment.routes.js         ✓ Delegates to BusinessService
│   ├── reservation.routes.js     ✓ Delegates to BusinessService
│   ├── review.routes.js          ✓ Delegates to BusinessService
│   └── visitor.routes.js         ✓ Delegates to BusinessService
```

### Document: API_RUNTIME_INTEGRATION.md

**Section: Request Flow (Verified)**
```
HTTP Request → ApiServer → Middleware → Router → BusinessController.list()
→ BusinessService.listBusinesses() → BusinessManager.getMany()
→ Repository → Response
```

---

## Decision

### OPTION A SELECTED

**BusinessService is the ONLY official entry point.**

Controllers MUST NEVER access `Capability.service` directly.

---

## Violations Found

The following route files violate OPTION A:

| File | Current Pattern | Violation |
|------|----------------|-----------|
| `accommodation.routes.js` | `capabilities.get('business').getAccommodationService()` | Accesses business capability, not accommodation |
| `visitor.routes.js` | `capabilities.get('business').getVisitorService()` | Accesses business capability, not visitor |
| `reservation.routes.js` | `capabilities.get('business').getReservationService()` | Accesses business capability, not reservation |
| `payment.routes.js` | `capabilities.get('business').getPaymentService()` | Accesses business capability, not payment |
| `review.routes.js` | `capabilities.get('business').getReviewService()` | Accesses business capability, not review |
| `availability.routes.js` | `capabilities.get('business').getAvailabilityService()` | Accesses business capability, not availability |

**All 6 files violate the OPTION A rule.**

---

## Root Cause Analysis

The 6 route files were implemented with an incorrect assumption:
- They assumed BusinessService would expose sub-service getters (`getAccommodationService()`, etc.)
- These getters do not exist on BusinessService
- The fallback `|| businessService` returns the BusinessCapability, not any useful service

**Correct implementation per OPTION A:**
```javascript
// These routes should call BusinessService methods directly
// NOT access capabilities directly
// Example: BusinessService.createAccommodation(data, identity)
// NOT: capabilities.get('accommodation').service.createAccommodation(...)
```

---

## Architectural Implications

### Why BusinessService is the mandatory entry point:

1. **Aggregate Root Pattern**: Business owns all commercial entities. Operations must flow through Business.

2. **Orchestration**: BusinessManagers coordinate cross-entity operations (cascades, statistics, search indexing). Bypassing them breaks functionality.

3. **Stability**: Controllers depend on a stable BusinessService interface. The internal capability graph can evolve without breaking controllers.

4. **Enforcement**: Cascade rules, permissions, and business invariants are enforced in BusinessManagers. Direct capability access bypasses all of this.

### Why Pattern B was never intended:

- No architecture document describes Pattern B
- No Design Freeze document permits direct capability access from controllers
- All 7 route files in API_LAYER_ARCHITECTURE_VALIDATION.md show "Delegates to BusinessService"
- API_LAYER.md explicitly states "no bypass"

---

## Documents Requiring No Changes

The following documents correctly reflect OPTION A and require no modifications:
- `API_LAYER.md` — Already states BusinessService is mandatory
- `DESIGN_FREEZE.md` — Already requires delegation patterns
- `MASTER_ARCHITECTURE.md` — Already shows BusinessService as entry point
- `API_LAYER_ARCHITECTURE_VALIDATION.md` — Already documents delegation

---

## Recommended Corrections for P14.1.6

**Option A requires route files to use BusinessService methods directly:**

| Route File | Current (Wrong) | Correct (OPTION A) |
|------------|-----------------|-------------------|
| `accommodation.routes.js` | `capabilities.get('business').getAccommodationService()` | `capabilities.get('business').service.createAccommodation(...)` |
| `visitor.routes.js` | `capabilities.get('business').getVisitorService()` | `capabilities.get('business').service.createVisitor(...)` |
| `reservation.routes.js` | `capabilities.get('business').getReservationService()` | `capabilities.get('business').service.createReservation(...)` |
| `payment.routes.js` | `capabilities.get('business').getPaymentService()` | `capabilities.get('business').service.createPayment(...)` |
| `review.routes.js` | `capabilities.get('business').getReviewService()` | `capabilities.get('business').service.createReview(...)` |
| `availability.routes.js` | `capabilities.get('business').getAvailabilityService()` | `capabilities.get('business').service.createAvailability(...)` |

**BusinessService must have the appropriate methods for each entity type.**

---

## Final Verdict

**COMMERCIAL AGGREGATE ENTRY POINT APPROVED**

**Decision: OPTION A — BusinessService is the ONLY official entry point.**

**Rationale:**
- Explicitly documented in API_LAYER.md, DESIGN_FREEZE.md, and MASTER_ARCHITECTURE.md
- Preserves aggregate root pattern
- Maintains Business Manager orchestration
- Prevents coupling to internal capability graph
- Design Freeze explicitly requires delegation patterns

**Violations Identified:** 6 route files (input for P14.1.6)

**Changes Required:** Route files must use BusinessService methods, not direct capability access

---

## Sign-off

- **Validator:** P14.1.5.5 — Commercial Aggregate Entry Point Validation
- **Date:** 2026-08-02
- **Status:** DECISION COMPLETE
- **Verdict:** COMMERCIAL AGGREGATE ENTRY POINT APPROVED
- **Decision:** OPTION A — BusinessService is the ONLY official entry point
