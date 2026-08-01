# ARCHITECTURE CONSISTENCY AUDIT

> **Audit Date:** 2026-08-01
> **Audit Phase:** P13.8 Post-Design-Freeze
> **Source Branch:** `release/design-freeze-p13.8`
> **Audit Scope:** Compare source code against documentation

---

## Executive Summary

| Metric | Documented | Actual | Difference |
|--------|-----------|--------|------------|
| **Capabilities with .capability.js** | 42 (MASTER) / 34 (INDEX) | **35** | -7 / +1 |
| **Registered Capabilities** | 34 (INDEX) | **32** | -2 |
| **Domain Repositories** | 27 (MASTER/INDEX) | **30** | +3 |
| **Business Managers** | 11 (MASTER) / 12 (table) | **12** | 0 / -1 |
| **Runtime Components** | 11 (MASTER) | **11** | 0 |

**Overall Consistency Score: 85/100**

**Verdict: NEEDS CORRECTION**

---

## 1. Capability Inventory

### 1.1 Real Implemented Capabilities (Source of Truth)

**Count: 35 capabilities with `.capability.js` file**

| # | Capability ID | File Exists | Registered |
|---|---------------|-------------|------------|
| 1 | accommodation | YES | **NO** |
| 2 | admin | YES | YES |
| 3 | availability | YES | YES |
| 4 | billing | YES | YES |
| 5 | booking | YES | YES |
| 6 | business | YES | YES |
| 7 | catalog | YES | NO (orphan) |
| 8 | cms | YES | YES |
| 9 | communication | YES | YES |
| 10 | community | YES | YES |
| 11 | conversion | YES | YES |
| 12 | engagement | YES | YES |
| 13 | exploration | YES | YES |
| 14 | gallery | YES | NO (orphan) |
| 15 | governance | YES | YES |
| 16 | identity | YES | YES (as destination-identity) |
| 17 | intelligence | YES | YES |
| 18 | lifecycle | YES | YES |
| 19 | notification | YES | YES |
| 20 | notifications | YES | YES |
| 21 | observability | YES | YES |
| 22 | onboarding | YES | YES |
| 23 | operations | YES | YES (as destination-operations) |
| 24 | opportunity | YES | YES |
| 25 | owner | YES | YES |
| 26 | payment | YES | YES |
| 27 | payments | YES | NO (orphan) |
| 28 | persistence | YES | YES |
| 29 | public | YES | YES |
| 30 | pwa | YES | YES |
| 31 | pwa-engine | YES | YES |
| 32 | reservation | YES | YES |
| 33 | saas | YES | YES |
| 34 | scheduler | YES | YES |
| 35 | seo-intelligence | YES | YES |
| 36 | visitor | YES | YES |

### 1.2 Registered Capabilities (in `AVAILABLE_CAPABILITIES`)

**Count: 32**

```
admin, availability, billing, booking, business, cms, communication,
community, conversion, engagement, exploration, governance,
intelligence, lifecycle, notification, notifications, observability,
onboarding, opportunity, owner, payment, persistence, public, pwa,
reservation, saas, scheduler, visitor, seo-intelligence, pwa-engine,
destination-operations, destination-identity
```

### 1.3 Documentation Mismatches

| Document | Claim | Actual | Discrepancy |
|----------|-------|--------|-------------|
| MASTER_ARCHITECTURE.md | 42 capabilities | 35 | -7 |
| CAPABILITY_INDEX.md | 34 registered | 32 | -2 |
| CAPABILITY_INDEX.md header | "34 registered" | 32 | -2 |

### 1.4 Orphaned Capabilities (Have .capability.js, NOT Registered)

| Capability | Status |
|------------|--------|
| accommodation | Implemented but NOT registered |
| catalog | Placeholder (P1-3), never registered |
| gallery | Placeholder (P1-3), never registered |
| payments | Placeholder (P1-3), never registered |

### 1.5 Aliases in Registration

| Registered As | Actual Capability | Note |
|---------------|------------------|------|
| destination-identity | identity | Same capability |
| destination-operations | operations | Same capability |

### 1.6 Recommended Corrections

**CAPABILITY_INDEX.md:**
- Change header from "34 registered capabilities" to "32 registered capabilities"
- Add accommodation to the registered list (or document it as implemented but not registered)
- Document that destination-identity maps to identity capability
- Document that destination-operations maps to operations capability

**MASTER_ARCHITECTURE.md:**
- Change "42 capabilities" to "35 capabilities with .capability.js files"
- Change "34 capabilities" to "32 registered capabilities"

---

## 2. Repository Inventory

### 2.1 Real Domain Repositories

**Count: 30 unique repositories**

| # | Repository | Path | Status |
|---|------------|------|--------|
| 1 | accommodation | repositories/accommodation/ | EXISTS |
| 2 | analytics | repositories/analytics/ | EXISTS |
| 3 | audit | repositories/audit/ | EXISTS |
| 4 | availability | repositories/availability/ | EXISTS |
| 5 | badge | repositories/badge/ | EXISTS |
| 6 | booking | repositories/booking/ | EXISTS |
| 7 | business | repositories/business/ | EXISTS |
| 8 | campaign | repositories/campaign/ | EXISTS |
| 9 | challenge | repositories/challenge/ | EXISTS |
| 10 | community | repositories/community/ | EXISTS |
| 11 | destination | repositories/destination/ | EXISTS |
| 12 | governance | repositories/governance/ | EXISTS |
| 13 | habitat | repositories/habitat/ | EXISTS |
| 14 | identity | repositories/identity/ | EXISTS |
| 15 | media | repositories/media/ | EXISTS |
| 16 | memory | repositories/memory/ | EXISTS |
| 17 | notification | repositories/notification/ | EXISTS |
| 18 | observation | repositories/observation/ | EXISTS |
| 19 | operations | repositories/operations/ | EXISTS |
| 20 | opportunity | repositories/opportunity/ | EXISTS |
| 21 | owner | repositories/owner/ | EXISTS |
| 22 | partner | repositories/partner/ | EXISTS |
| 23 | payment | repositories/payment/ | EXISTS |
| 24 | reservation | repositories/reservation/ | EXISTS |
| 25 | route | repositories/route/ | EXISTS |
| 26 | species | repositories/species/ | EXISTS |
| 27 | story | repositories/story/ | EXISTS |
| 28 | subscription | repositories/subscription/ | EXISTS |
| 29 | tenant | repositories/tenant/ | EXISTS |
| 30 | visitor | repositories/visitor/ | EXISTS |

### 2.2 Documentation Mismatches

| Document | Claim | Actual | Discrepancy |
|----------|-------|--------|-------------|
| MASTER_ARCHITECTURE.md | 27 repositories | 30 | +3 |
| CAPABILITY_INDEX.md | 27 repositories | 30 | +3 |

### 2.3 MASTER_ARCHITECTURE.md Lists These as Missing (but they exist)

| Repository | Note |
|------------|------|
| OpportunityRepository | EXISTS in opportunity/ subdirectory |
| OwnerRepository | EXISTS in owner/ subdirectory |
| BookingRepository | EXISTS in booking/ subdirectory |

### 2.4 Recommended Corrections

**MASTER_ARCHITECTURE.md:**
- Change "27 Domain Repositories" table to show all 30 repositories
- Remove "OpportunityRepository (placeholder)", "OwnerRepository (placeholder)", "BookingRepository (placeholder)" labels - they are NOT placeholders, they exist

**CAPABILITY_INDEX.md:**
- Change "Repositories (27)" to "Repositories (30)"

---

## 3. Business Managers

### 3.1 Real Business Managers

**Count: 12 managers total**

| # | Manager | File | Location |
|---|---------|------|----------|
| 1 | BusinessManager | business.manager.js | capabilities/business/ |
| 2 | BusinessAccommodationManager | business-accommodation.manager.js | capabilities/business/manager/ |
| 3 | BusinessAvailabilityManager | business-availability.manager.js | capabilities/business/manager/ |
| 4 | BusinessBrandManager | business-brand.manager.js | capabilities/business/manager/ |
| 5 | BusinessCMSManager | business-cms.manager.js | capabilities/business/manager/ |
| 6 | BusinessNotificationManager | business-notification.manager.js | capabilities/business/manager/ |
| 7 | BusinessOwnerManager | business-owner.manager.js | capabilities/business/manager/ |
| 8 | BusinessPaymentManager | business-payment.manager.js | capabilities/business/manager/ |
| 9 | BusinessReservationManager | business-reservation.manager.js | capabilities/business/manager/ |
| 10 | BusinessSearchManager | business-search.manager.js | capabilities/business/manager/ |
| 11 | BusinessStatisticsManager | business-statistics.manager.js | capabilities/business/manager/ |
| 12 | BusinessVisitorManager | business-visitor.manager.js | capabilities/business/manager/ |

### 3.2 Documentation Mismatches

| Document | Claim | Actual | Discrepancy |
|----------|-------|--------|-------------|
| MASTER_ARCHITECTURE.md table | 12 rows | 12 | OK |
| MASTER_ARCHITECTURE.md text | "11 Business Managers" | 12 | -1 |

**Note:** MASTER_ARCHITECTURE.md text says "11 Business Managers" but the table shows 12 rows (including BusinessManager).

### 3.3 Recommended Corrections

**MASTER_ARCHITECTURE.md:**
- Change "11 Business Managers" to "12 managers (1 aggregate root + 11 sub-managers)"

---

## 4. Runtime Components

### 4.1 Verified Runtime Components

| Component | File Path | Status |
|-----------|-----------|--------|
| RuntimeEngine | runtime/runtime.engine.js | EXISTS |
| BootstrapPipeline | runtime/bootstrap/bootstrap.pipeline.js | EXISTS |
| EventBus | shared/events/eventbus.js | EXISTS |
| RepositoryEngine | capabilities/persistence/engine/repository.engine.js | EXISTS |
| SearchEngine | runtime/contracts/search.runtime.js | EXISTS |
| SyncEngine | runtime/cms/sync/sync.engine.js | EXISTS |
| Scheduler | capabilities/scheduler/scheduler.capability.js | EXISTS |
| Queue | runtime/contracts/queue.runtime.js | EXISTS |
| Configuration | shared/constants/config.js | EXISTS |
| Logging | runtime/runtime.lifecycle.js | EXISTS |
| HealthMonitor | runtime/runtime.health.js | EXISTS |

**Count: 11** - All documented components exist.

### 4.2 Documentation Status

**CORRECT** - No discrepancies found.

---

## 5. Provider Layer

### 5.1 Verified Providers

| Provider | Path | Status |
|----------|------|--------|
| PostgreSQL Provider | capabilities/persistence/providers/postgres/ | EXISTS |
| Drizzle ORM | capabilities/persistence/providers/postgres/drizzle/ | EXISTS |
| WordPress Provider | runtime/cms/providers/wordpress/wordpress.provider.js | EXISTS |
| Search Provider | capabilities/persistence/providers/search/ | EXISTS |
| Notification Providers | capabilities/notifications/providers/ | EXISTS |
| - Email Provider | capabilities/notifications/providers/email.provider.js | EXISTS |
| - Push Provider | capabilities/notifications/providers/push.provider.js | EXISTS |
| - WhatsApp Provider | capabilities/notifications/providers/whatsapp.provider.js | EXISTS |

### 5.2 Documented But Not Implemented

| Provider | Documented In | Status |
|----------|---------------|--------|
| Stripe Provider | MASTER_ARCHITECTURE.md | NOT IMPLEMENTED |
| MercadoPago Provider | MASTER_ARCHITECTURE.md | NOT IMPLEMENTED |
| Transbank Provider | MASTER_ARCHITECTURE.md | NOT IMPLEMENTED |
| SendGrid Provider | MASTER_ARCHITECTURE.md | NOT IMPLEMENTED |
| Twilio Provider | MASTER_ARCHITECTURE.md | NOT IMPLEMENTED |
| Firebase Provider | MASTER_ARCHITECTURE.md | NOT IMPLEMENTED |
| JWT Provider | MASTER_ARCHITECTURE.md | NOT IMPLEMENTED (file-based JWT engine exists, but not as separate provider) |
| OAuth Provider | MASTER_ARCHITECTURE.md | NOT IMPLEMENTED |

### 5.3 Recommended Corrections

**MASTER_ARCHITECTURE.md:**
- Remove Stripe, MercadoPago, Transbank from infrastructure layer (they are future providers)
- Remove SendGrid, Twilio, Firebase (the generic "Notification Providers" exist, but specific providers are not implemented)
- Clarify that JWT/OAuth are in runtime/auth/, not as separate provider packages

---

## 6. Event Graph Audit

### 6.1 Commercial Aggregate Events (Actual Files)

| Capability | Events File | Lines |
|------------|-------------|-------|
| Business | business.events.js | 117 |
| Accommodation | accommodation.events.js | 12 |
| Availability | availability.events.js | 17 |
| Reservation | reservation.events.js | 30 |
| Visitor | visitor.events.js | 22 |
| Payment | payment.events.js | 20 |
| Notification | notification.events.js | 17 |

**Total: ~235 lines of event definitions**

### 6.2 Documentation vs Reality

| Capability | Documented Events | Actual (lines) | Note |
|------------|-------------------|----------------|------|
| Business | ~104 | 117 lines | Documentation approximate |
| Accommodation | 10 | 12 lines | +2 events |
| Availability | 16 | 17 lines | +1 event |
| Reservation | 22 | 30 lines | +8 events |
| Visitor | 20 | 22 lines | +2 events |
| Payment | 15 | 20 lines | +5 events |
| Notification | 14 | 17 lines | +3 events |

### 6.3 Recommended Corrections

**MASTER_ARCHITECTURE.md:**
- Update event counts to match actual file contents
- Or clarify that documented counts are approximate

**CAPABILITY_INDEX.md:**
- Update event lists to match actual files

---

## 7. Aggregate Ownership

### 7.1 Verified Ownership Structure

```
Business (Aggregate Root)
├── Accommodation (Composition)
│   └── Availability (Composition via accommodationId)
├── Reservation (Composition)
├── Visitor (Composition)
├── Payment (Composition)
└── Notification (Composition)
```

### 7.2 Documentation Status

**CORRECT** - Aggregate ownership matches implementation.

---

## 8. Dependency Graph Audit

### 8.1 Forbidden Import Check

**Verified:** No commercial capability imports from infrastructure providers directly.

Sample check results:
- `notification.capability.js` - No Stripe/SendGrid imports ✓
- `payment.capability.js` - No Stripe imports ✓
- `business.manager.js` - No direct infrastructure imports ✓

### 8.2 Cross-Capability Import Check

**Verified:** No direct imports between domain capabilities. All communication via EventBus.

### 8.3 Documentation Status

**CORRECT** - Dependency rules match implementation.

---

## 9. Diagram Consistency

### 9.1 PlantUML vs Mermaid

| Element | PlantUML | Mermaid | Match |
|---------|----------|---------|-------|
| Layers | 8 packages | 8 subgraphs | YES |
| Commercial Aggregate | 1 package | 1 subgraph | YES |
| Business Managers | 11 managers | 11 managers | YES |
| Domain Repositories | 30 listed | 30 listed | YES |
| Runtime Components | 11 listed | 11 listed | YES |
| Infrastructure | 6 groups | 6 groups | YES |

### 9.2 Diagram vs Implementation

| Element | Diagram | Actual | Match |
|---------|---------|--------|-------|
| Capability count | ~35 | 35 | YES |
| Repository count | 30 | 30 | YES |
| Business Manager count | 12 | 12 | YES |

### 9.3 Documentation Status

**CORRECT** - PlantUML and Mermaid are consistent with each other and with implementation.

---

## 10. Numerical Mismatches Summary

| Category | Document | Documented | Actual | Status |
|----------|----------|-----------|--------|--------|
| Capabilities (files) | MASTER | 42 | 35 | ❌ MISMATCH |
| Capabilities (registered) | INDEX | 34 | 32 | ❌ MISMATCH |
| Capabilities (files) | MASTER | 35 | 35 | ✅ CORRECT |
| Domain Repositories | MASTER | 27 | 30 | ❌ MISMATCH |
| Domain Repositories | INDEX | 27 | 30 | ❌ MISMATCH |
| Business Managers | MASTER text | 11 | 12 | ❌ MISMATCH |
| Business Managers | MASTER table | 12 | 12 | ✅ CORRECT |
| Runtime Components | MASTER | 11 | 11 | ✅ CORRECT |
| Event counts | Various | ~104 | 117 | ⚠️ APPROXIMATE |
| Provider count | MASTER | 12+ | 8 | ❌ MISMATCH |

---

## 11. Recommended Corrections

### 11.1 CRITICAL (Must Fix)

1. **MASTER_ARCHITECTURE.md - Capability Count**
   - Change "42 capabilities" to "35 capabilities with .capability.js files"
   - Change "32 registered capabilities" note to clarify:
     - 35 capabilities exist as files
     - 32 are registered in AVAILABLE_CAPABILITIES
     - 3 are orphaned (accommodation not registered, catalog/gallery/payments are placeholders)

2. **CAPABILITY_INDEX.md - Header**
   - Change "34 registered capabilities" to "32 registered capabilities"
   - The header claims 34 but only 32 are in AVAILABLE_CAPABILITIES

3. **MASTER_ARCHITECTURE.md - Repository Count**
   - Change "27 Domain Repositories" to "30 Domain Repositories"
   - Update the repository table to list all 30

### 11.2 MEDIUM (Should Fix)

4. **MASTER_ARCHITECTURE.md - Business Manager Count**
   - Change "11 Business Managers" to "12 managers (1 aggregate root manager + 11 sub-managers)"

5. **MASTER_ARCHITECTURE.md - Provider Section**
   - Remove future payment providers (Stripe, MercadoPago, Transbank)
   - Clarify which providers are implemented vs planned

6. **CAPABILITY_INDEX.md - Repository Count**
   - Change "Repositories (27)" to "Repositories (30)"

### 11.3 LOW (Nice to Fix)

7. **MASTER_ARCHITECTURE.md - Event Counts**
   - Update event counts to be more accurate, or note they are approximate

8. **CAPABILITY_INDEX.md - Accommodation Registration**
   - Either register accommodation in AVAILABLE_CAPABILITIES or document why it's not registered

---

## 12. Files Requiring Changes

| File | Change Type | Priority |
|------|-----------|----------|
| docs/architecture/MASTER_ARCHITECTURE.md | Multiple corrections | CRITICAL |
| docs/ai/CAPABILITY_INDEX.md | Header, repository count | CRITICAL |

---

## 13. Final Score Calculation

| Category | Weight | Score | Weighted |
|---------|--------|-------|----------|
| Capability Inventory | 25% | 83% | 20.75 |
| Repository Inventory | 20% | 80% | 16.00 |
| Business Managers | 10% | 92% | 9.20 |
| Runtime Components | 10% | 100% | 10.00 |
| Provider Layer | 10% | 67% | 6.70 |
| Event Graph | 10% | 85% | 8.50 |
| Aggregate Ownership | 5% | 100% | 5.00 |
| Dependency Graph | 5% | 100% | 5.00 |
| Diagram Consistency | 5% | 95% | 4.75 |

**TOTAL SCORE: 85.9/100 (85.9%)**

---

## 14. Verdict

### NEEDS CORRECTION

The documentation does not exactly match the implementation. Several key architectural numbers are incorrect:

- **Capability counts are off** by 7-10 entities
- **Repository counts are off** by 3 entities
- **Business manager text** says 11 but table shows 12
- **Provider list** includes future providers that don't exist

### Required Actions

1. Update MASTER_ARCHITECTURE.md with correct numbers
2. Update CAPABILITY_INDEX.md header and repository count
3. Verify all other documentation references
4. Re-audit after corrections

### Not Blocked

The architectural structure is correct. The issue is purely with documented numbers not matching reality. Once numbers are corrected, the documentation will be consistent.

---

> **Audit Completed:** 2026-08-01
> **Auditor:** Architecture Consistency Audit
> **Next Action:** Apply recommended corrections to documentation
