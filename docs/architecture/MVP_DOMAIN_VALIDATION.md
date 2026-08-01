# MVP Domain Validation

> **Phase:** P12.3.0.5 — MVP Domain Validation
> **Status:** Complete
> **Verdict:** REQUIRES ARCHITECTURAL ADJUSTMENTS
> **Validation Date:** 2026-07-29

---

## 1. Reservation Lifecycle Validation

### State Machine Completeness

The reservation lifecycle is **fully modeled** with 10 statuses and explicit valid transitions:

```
REQUESTED → OWNER_PENDING → OWNER_CONFIRMED → PAYMENT_PENDING → CONFIRMED → COMPLETED
    │            │                │                   │               │
    ├→ REJECTED  ├→ REJECTED      ├→ REJECTED         ├→ EXPIRED      └→ CANCELLED
    └→ CANCELLED ├→ NO_RESPONSE   └→ CANCELLED        └→ CANCELLED
                  └→ EXPIRED
```

| Aspect | Status | Evidence |
|---|---|---|
| Status enum | ✅ All 10 defined | `reservation.status.js` |
| Valid transitions | ✅ Explicitly mapped | `reservation.workflow.js` — `VALID_TRANSITIONS` |
| Transition validation | ✅ Guards against invalid | `ReservationWorkflow.transition()` throws |
| Terminal states | ✅ 5 terminal (COMPLETED, REJECTED, EXPIRED, CANCELLED, NO_RESPONSE) | `isTerminalStatus()` in `reservation.status.js` |
| Expiration wiring | ✅ Per-status targets defined | `EXPIRATION_TARGETS` in `reservation.workflow.js` |
| Timer engine | ✅ Exists | `ReservationTimer` — timeouts per status |
| Recovery mechanism | ✅ Exists | `ReservationRecovery` — `recoverPendingReservations()` |

### Event Sequence Completeness

The full lifecycle emits 14 event types:

| Event | Fired by | Side effect |
|---|---|---|
| `reservation:created` | `createRequest()` | Notification to owner, availability block |
| `reservation:validated` | `validateReservation()` | Internal audit |
| `reservation:owner_requested` | `requestOwnerConfirmation()` | WhatsApp to owner |
| `reservation:owner_confirmed` | Owner approval | Moves to payment_pending |
| `reservation:confirmed` | Payment success | Final confirmation |
| `reservation:rejected` | Owner rejection | Notification to visitor |
| `reservation:cancelled` | Either party | Availability release |
| `reservation:expired` | Timer | Cleanup |
| `reservation:completed` | Checkout | Archival |
| `reservation:payment_pending` | Owner confirmed | Payment request |
| `reservation:state_changed` | Any transition | Audit log |
| `reservation:timeout_warning` | Approaching expiry | Escalation |
| `reservation:recovered` | Recovery run | Re-entry to flow |
| `reservation:sync_required` | State mismatch | CMS sync trigger |

**Critical Gaps:**
- ❌ No event persistence — events are fire-and-forget in-memory; recovery relies on manager state (Map) not event replay
- ❌ No `reservation:payment_received` or `reservation:payment_failed` events — payment sub-flow relies on generic PAYMENT_PENDING/CONFIRMED
- ❌ No `reservation:availability_conflict` event for failed double-booking detection
- ❌ No compensation event (e.g., `reservation:compensation_started`) for rollback scenarios

### Manager Method Coverage

| Method | Exists | Delegates to Workflow | Emits Events | Persists |
|---|---|---|---|---|
| `createRequest()` | ✅ | ✅ (starts at REQUESTED) | ✅ CREATED | ✅ (in-memory Map) |
| `validateReservation()` | ✅ | N/A (validation only) | ✅ VALIDATED | ❌ (no-op) |
| `requestOwnerConfirmation()` | ✅ | ✅ REQUESTED→OWNER_PENDING | ✅ OWNER_REQUESTED | ✅ |
| `confirmReservation()` | ✅ | ✅ OWNER_PENDING→OWNER_CONFIRMED | ✅ OWNER_CONFIRMED | ✅ |
| `rejectReservation()` | ✅ | ✅ *→REJECTED | ✅ REJECTED | ✅ |
| `cancelReservation()` | ✅ | ✅ *→CANCELLED | ✅ CANCELLED | ✅ |
| `expireReservation()` | ✅ | ✅ *→EXPIRED | ✅ EXPIRED | ✅ |
| `completeReservation()` | ✅ | ✅ CONFIRMED→COMPLETED | ✅ COMPLETED | ✅ |

---

## 2. Accommodation Lifecycle Validation

### Entity Model (from DATABASE-BLUEPRINT)

| Entity | Repository | Capability | Manager |
|---|---|---|---|
| Accommodation | ✅ `accommodation.repository.js` | ❌ **MISSING** | ❌ **MISSING** |
| AccommodationUnit | ❌ No repository | ❌ No capability | ❌ No manager |
| AccommodationPricing | ❌ No repository | ❌ No capability | ❌ No manager |
| AccommodationCalendar | ❌ No repository | ❌ No capability | ❌ No manager |
| AccommodationAmenity | ❌ No repository | ❌ No capability | ❌ No manager |

**Critical Gap:** Accommodation is referenced as a dependency by reservation and availability repositories, but has **no capability** and **no manager**. Accommodation data is implicitly managed through the reservation and availability flows. There is no:
- `AccommodationCapability`
- `AccommodationManager`
- CRUD lifecycle for accommodation entities
- Pricing or unit management

The accommodation repository exists but is **orphaned** — no capability loads or manages it.

---

## 3. Availability Lifecycle Validation

### State Model

The `AvailabilityCapability` (v1.0.0) uses a natural-language-first approach where owners communicate availability via text messages that get parsed by `AvailabilityParser`. The DB blueprint defines 5 entities:

| Entity | Repository | Capability Coverage |
|---|---|---|
| AvailabilitySlot | ✅ `availability.repository.js` | ✅ Managed by AvailabilityManager |
| AvailabilityRule | ❌ No repository | ❌ Not modeled |
| AvailabilityException | ❌ No repository | ❌ Not modeled |
| AvailabilityBlock | ❌ No repository | ❌ Not modeled |
| AvailabilityCalendar | ❌ No repository | ❌ Not modeled |

**Critical Gaps:**
- ❌ AvailabilityManager stores availability as simple date-range objects in-memory — only `AvailabilitySlot` equivalent is covered
- ❌ Recurring rules, exceptions, block dates, and calendar views are defined in the blueprint but **not implemented**
- ❌ No conflict detection during concurrent availability modifications
- ❌ No integration with ReservationManager to automatically hold/release availability slots during the reservation flow

### Current Availability Flow

```
Owner sends message → CommunicationCapability receives → AvailabilityParser parses text
→ AvailabilityManager updates in-memory Map → emits availability:updated
```

The `OwnerManager` exposes `blockDates()`, `openDates()`, and `writeAvailabilityNaturalLanguage()` which all delegate to `AvailabilityManager`.

---

## 4. Aggregate Validation

### Aggregate Root Analysis

| Aggregate Root | Repository | Entity | Capability | Consistent Boundary |
|---|---|---|---|---|
| `reservation` | ✅ `reservation.repository.js` | Reservation + LineItem + Payment + Communication + Cancellation + Refund + History | ✅ ReservationCapability (depends on booking, availability, communication, notifications) | ⚠️ LineItem, Cancellation, Refund, History entities exist in blueprint but not in domain code |
| `tenant` | ✅ `tenant.repository.js` | Tenant + Config + Plan + Subscription + Billing + Invoice + PaymentMethod + User + Role + Permission | ❌ No dedicated capability (cross-cutting) | ✅ |
| `destination` | ✅ `destination.repository.js` | Destination + Config + PWA + SEO + Region + Commune + Locality + Place | ✅ PublicCapability references | ⚠️ Partial |
| `business` | ✅ `business.repository.js` | BusinessTenant + Profile + Config + Verification + Certification + Review + Response | ❌ No dedicated capability | ⚠️ Partial |
| `community` | ✅ `community.repository.js` | CommunityMember + Memory + Review + Interaction + Follow + Report + Moderation + Flag | ❌ No dedicated capability | ⚠️ Partial |
| `governance` | ✅ `governance.repository.js` | Governance entities | ❌ No dedicated capability | ⚠️ Partial |

**Key Finding:** `reservation` is the only aggregate root that has a corresponding capability. The reservation aggregate boundary in the domain code is narrower than the blueprint — the code manages a single `Reservation` object with status field, while the blueprint defines 8 entities under the Reservation cluster.

### Cross-Aggregate References

| Reference | Source Aggregate | Target | Validated? |
|---|---|---|---|
| reservation → tenant | reservation | tenant | ✅ Repository dependency declared |
| reservation → destination | reservation | destination | ✅ Repository dependency declared |
| reservation → business | reservation | business | ✅ Repository dependency declared |
| reservation → accommodation | reservation | accommodation | ✅ Repository dependency declared BUT accommodation has no capability |
| availability → accommodation | availability | accommodation | ✅ Same dependency pattern |

---

## 5. Repository Validation

### Complete Repository Inventory

| Entity | Repository | Extends | Aggregate | Dependencies |
|---|---|---|---|---|
| tenant | ✅ | BaseRepository | ✅ | — |
| destination | ✅ | BaseRepository | ✅ | tenant |
| business | ✅ | BaseRepository | ✅ | tenant, destination |
| reservation | ✅ | BaseRepository | ✅ | tenant, destination, business, accommodation |
| community | ✅ | BaseRepository | ✅ | tenant, destination |
| governance | ✅ | BaseRepository | ✅ | tenant, destination |
| accommodation | ✅ | BaseRepository | ❌ | tenant, destination, business |
| availability | ✅ | BaseRepository | ❌ | tenant, destination, business, accommodation |
| visitor | ✅ | BaseRepository | ❌ | tenant, destination |
| identity | ✅ | BaseRepository | ❌ | tenant |
| notification | ✅ | BaseRepository | ❌ | tenant, identity |
| payment | ✅ | BaseRepository | ❌ | tenant, business, subscription |
| audit | ✅ | WriteRepository | ❌ | tenant |
| analytics | ✅ | ReadRepository | ❌ | tenant, destination |
| badge | ✅ | BaseRepository | ❌ | tenant, destination |
| campaign | ✅ | BaseRepository | ❌ | tenant, destination |
| challenge | ✅ | BaseRepository | ❌ | tenant, destination |
| habitat | ✅ | BaseRepository | ❌ | tenant, destination |
| media | ✅ | BaseRepository | ❌ | tenant |
| memory | ✅ | BaseRepository | ❌ | tenant, destination, visitor, community |
| observation | ✅ | BaseRepository | ❌ | tenant, destination, species, visitor |
| operations | ✅ | BaseRepository | ❌ | tenant, destination |
| partner | ✅ | BaseRepository | ❌ | tenant, destination, business |
| route | ✅ | BaseRepository | ❌ | tenant, destination |
| species | ✅ | BaseRepository | ❌ | tenant, destination |
| story | ✅ | BaseRepository | ❌ | tenant, destination |
| subscription | ✅ | BaseRepository | ❌ | tenant, business |

### Critical Gaps

| Missing Repository | Impacted Capability | Severity |
|---|---|---|
| **owner.repository.js** | **OwnerCapability** | **🔴 HIGH** — OwnerCapability is a first-class MVP capability with 20+ methods, but its data has no persistence contract. Owner configuration, preferences, settings, and dashboard all rely on in-memory state. |
| accommodation.unit | ReservationCapability | 🟡 MEDIUM — Units are defined in the blueprint but not in domain code |
| accommodation.pricing | ReservationCapability | 🟡 MEDIUM — Pricing is part of the reservation flow but no repository exists |
| accommodation.calendar | AvailabilityCapability | 🟡 MEDIUM — Calendar is core to availability management |
| accommodation.amenity | ReservationCapability | 🟢 LOW — Nice-to-have metadata |
| reservation.line_item | ReservationCapability | 🟡 MEDIUM — Line items exist in blueprint, not in domain code |
| reservation.payment | PaymentCapability | 🟡 MEDIUM — Payment records tracked via generic payment.repository |
| reservation.communication | ReservationCapability | 🟢 LOW — Communication audit trail |
| reservation.cancellation | ReservationCapability | 🟢 LOW — Cancellation records |
| reservation.refund | PaymentCapability | 🟡 MEDIUM — Refund tracking |
| reservation.history | ReservationCapability | 🟡 MEDIUM — Audit trail for state changes |
| availability.rule | AvailabilityCapability | 🟡 MEDIUM — Recurring availability rules |
| availability.exception | AvailabilityCapability | 🟢 LOW — One-off exceptions |
| availability.block | AvailabilityCapability | 🟢 LOW — Blocked dates |
| availability.calendar | AvailabilityCapability | 🟡 MEDIUM — Calendar aggregation |

### Duplication

| Path | Issue |
|---|---|
| `repositories/payment.repository.js` | Duplicate of `repositories/payment/payment.repository.js` with different base classes |
| `repositories/accommodation.repository.js` | Duplicate of `repositories/accommodation/accommodation.repository.js` |

---

## 6. Runtime Validation

### Persistence Engine

| Component | Status | Notes |
|---|---|---|
| `RepositoryEngine` | ✅ Implemented (75 lines) | Orchestrates registry, factory, transaction manager |
| `RepositoryRegistry` | ✅ Exists | Registers and resolves repositories |
| `RepositoryFactory` | ✅ Exists | Instantiates repositories with dependencies |
| `TransactionManager` | ✅ Implemented (235 lines) | Savepoints, timeouts, isolation levels, event emission |
| `UnitOfWork` | ✅ Implemented (230 lines) | Change tracking (new/dirty/deleted), nesting (3 levels), topological sort, commit/rollback |
| `EventBus` | ✅ Implemented (25 lines) | Simple pub/sub with error isolation |
| **Persistence Providers** | **❌ NOT IMPLEMENTED** | README placeholder — no PostgreSQL, SQLite, or any database adapter exists |

### Transaction Flow

```
RepositoryEngine.beginTransaction()
  → TransactionManager.begin({ timeout, isolation })
    → UnitOfWork.create() — starts tracking changes
      → Repository operations register changes in UoW
    → TransactionManager.commit()
      → UnitOfWork.commit() — topological sort → execute in order
        → RepositoryAdapter → Provider → Database (NOT WIRED)
    → TransactionManager.rollback()
      → UnitOfWork.rollback() — discard tracked changes
```

**Critical Finding:** The persistence engine is fully designed but **completely disconnected** from any actual database. The `Repository` classes have no adapter layer to a provider. The system operates entirely in-memory via capability-level Maps. The blueprint says "no database technology chosen" but this means the MVP has **zero durable persistence**.

### Authorization Validation

| Role | Permissions for MVP | Coverage |
|---|---|---|
| `visitor` | `reservation:create/read` | ✅ Visitor can create and view own reservations |
| `visitor:verified` | inherits visitor + `experience:book` | ✅ Can book experiences |
| `business:owner` | inherits visitor:verified + `reservation:manage`, `availability:write` | ✅ Owner can manage reservations and write availability |
| `platform:admin` | `*` | ✅ Full access |

**Gap:** There is no explicit `reservation:read` permission scoped to the business owner's own accommodations only — `reservation:manage` implies full management but the permission granularity for owner-scoped reads vs. admin-scoped reads is implicit rather than explicit.

### CMS Sync

The CMS sync engine is fully implemented (327 lines with strategy, conflict resolution, checkpoint, history, retry). However:
- All `CmsRuntime` contract methods return `null` or `[]`
- The WordPress provider is a directory placeholder
- `reservation:sync_required` event is emitted but no handler connects it to the sync engine

### WhatsApp Communication

Two WhatsApp providers exist (notifications vs. communication), both are `console.log` stubs. Neither connects to the WhatsApp Business API.

### Payment

| Component | Status |
|---|---|
| `PaymentsCapability` | ❌ **Placeholder** — all lifecycle methods are stubs |
| `PaymentManager` (billing) | ✅ Basic implementation (create, complete, fail, cancel) |
| `PaymentService` | ✅ Thin orchestration layer |
| `PaymentRuntime` | ❌ **Stub** — all methods return null/[] |
| `PaymentRepository` | ✅ Exists (cacheable, searchable, softDeletable) |

---

## 7. Events Validation

### Event Bus Architecture

```
createEventBus()
  → on(event, handler) — subscribe, returns unsubscribe function
  → emit(event, data) — publish, catches handler errors
  → once(event, handler) — one-shot subscription
  → off(event, handler) — manual unsubscribe
  → clear() — remove all listeners
```

### Event Coverage by Capability

| Capability | Events Defined | Producer | Consumer |
|---|---|---|---|
| Reservation | 14 events | ✅ ReservationManager | ⚠️ NotificationCapability subscribes to created/confirmed/cancelled/expired |
| Availability | 6+ events | ✅ AvailabilityManager | ℹ️ Unknown consumers |
| Booking | 5 events | ✅ BookingManager | ℹ️ Unknown consumers |
| Owner | 5+ events | ✅ OwnerManager | ℹ️ Unknown consumers |
| Communication | CHANNEL_REGISTERED, SENT, FAILED | ✅ CommunicationCapability | ℹ️ Unknown |
| Notifications | SENT, FAILED, RETRY_SCHEDULED, RETRY_EXHAUSTED | ✅ NotificationManager | ℹ️ Unknown |

### Event Gaps

| Gap | Impact | Severity |
|---|---|---|
| No dead letter queue | Events that fail to be handled are silently lost | 🟡 MEDIUM |
| No event persistence | Event replay for recovery is impossible | 🔴 HIGH |
| No event versioning | Schema evolution over time is not supported | 🟡 MEDIUM |
| No saga/orchestrator | Multi-step flows (reservation→payment→notification) have no compensation mechanism | 🔴 HIGH |
| No event ordering guarantee | Bus uses Set for listeners — handler execution order is undefined | 🟢 LOW |

---

## 8. Authorization Validation

### Permission Mapping

| Action | Required Permission | Granted To | Validated? |
|---|---|---|---|
| Create reservation | `reservation:create` | visitor, business:owner, platform:admin | ✅ |
| Read own reservation | `reservation:read` | visitor, business:owner, platform:admin | ✅ |
| Read any reservation | `reservation:manage` | business:owner (scoped), platform:admin | ⚠️ Scope not enforced in domain code |
| Confirm reservation | `reservation:manage` | business:owner, platform:admin | ✅ |
| Reject reservation | `reservation:manage` | business:owner, platform:admin | ✅ |
| Cancel reservation | `reservation:manage` / `reservation:cancel` | business:owner, platform:admin, visitor (own) | ⚠️ Visitor cancellation not in role definition |
| Write availability | `availability:write` | business:owner, platform:admin | ✅ |
| Manage accommodation | `business:manage` | business:owner | ⚠️ No accommodation capability to enforce |

### Authorization Check Integration

The `AuthorizationEngine.authorize()` method is available (`throws PermissionDeniedError` if denied). However, it's unclear whether individual capability methods actually call `authorize()` before performing actions — the engine exists but its **invocation points** in the MVP domain capabilities are not visible from the code examined.

---

## 9. Transaction Validation

### Current Transaction Boundary

```
ReservationManager.createRequest()
  → Unit of work starts (implicit via RepositoryEngine)
  → Create reservation in Map
  → Mark availability as blocked (via AvailabilityManager)
  → Emit reservation:created event
  → Unit of work commits
```

### Transaction Gaps

| Requirement | Status | Notes |
|---|---|---|
| Atomic reservation + availability update | ❌ Not guaranteed | Reservation Map update and AvailabilityManager Map update are separate operations with no 2PC |
| Payment transaction | ❌ Not wired | PaymentManager exists but has no transactional integration with ReservationManager |
| Compensation on failure | ❌ Missing | No saga/compensation mechanism — if payment fails after owner confirms, the reservation stays in PAYMENT_PENDING forever |
| Eventual consistency timeout | ⚠️ Partial | ReservationTimer handles per-status timeouts, but no timeout for the OWNER_CONFIRMED→PAYMENT_PENDING→CONFIRMED path |
| Nested transaction support | ✅ Implemented | UnitOfWork supports 3-level nesting |
| Isolation levels | ✅ Defined | TransactionManager supports READ_COMMITTED, REPEATABLE_READ, SERIALIZABLE (not enforced without database) |

---

## 10. Failure Simulation

### Current State

No failure simulation infrastructure exists.

| Scenario | Testable? | Mechanism |
|---|---|---|
| Reservation creation failure | ❌ | No fault injection |
| Owner confirmation timeout | ⚠️ Partial | ReservationTimer exists but relies on real time |
| Payment failure recovery | ❌ | No simulated payment gateway |
| Availability double-booking | ❌ | No concurrent access simulation |
| Network partition (WhatsApp down) | ❌ | No provider failure simulation |
| Event handler exception | ⚠️ Partial | EventBus catches handler errors but provides no recovery |
| Database connection failure | ❌ | No database connected |

### Recommended Additions

- Fault injection middleware for RepositoryEngine
- Configurable provider failure rates for WhatsApp, Payment, CMS
- Concurrent reservation race condition tests
- Timer-based scenario simulation (expiration, timeout)

---

## 11. Missing Infrastructure

### Summary of Gaps

| # | Gap | Component | Severity | Blocking MVP? |
|---|---|---|---|---|
| 1 | **No Owner repository** | Persistence | 🔴 HIGH | YES — OwnerCapability data has no persistence contract |
| 2 | **No Accommodation capability** | Domain | 🔴 HIGH | YES — Core MVP entity has no lifecycle management |
| 3 | **No persistence providers** | Infrastructure | 🔴 HIGH | YES — System cannot survive restart |
| 4 | **No event persistence/replay** | Events | 🔴 HIGH | YES — Recovery relies on in-memory state only |
| 5 | **No saga/compensation** | Transactions | 🔴 HIGH | YES — Failed multi-step flows cannot roll back |
| 6 | **Payment is placeholder** | Domain | 🟡 MEDIUM | YES — Payment is MVP scope but not implemented |
| 7 | **WhatsApp providers are stubs** | Integrations | 🟡 MEDIUM | YES — Owner communication is core to MVP flow |
| 8 | **No availability rules/recurrence** | Domain | 🟡 MEDIUM | PARTIAL — Basic date blocking works, no recurring rules |
| 9 | **No reservation payment events** | Events | 🟡 MEDIUM | PARTIAL — Payment sub-flow lacks granular events |
| 10 | **Blueprinted entities not in domain** | Domain | 🟡 MEDIUM | PARTIAL — 14+ entities defined in blueprint have no domain code |
| 11 | **No authorization enforcement** | Security | 🟡 MEDIUM | PARTIAL — Engine exists but invocation in capabilities unclear |
| 12 | **No dead letter queue** | Events | 🟢 LOW | NO — Acceptable for MVP |
| 13 | **Duplicate repositories** | Code Quality | 🟢 LOW | NO — Cleanup item |
| 14 | **CMS runtime is stub** | Integrations | 🟢 LOW | NO — CMS sync is basic MVP scope |

---

## 12. Readiness Score

### Scoring Rubric

| Category | Weight | Score (0-10) | Weighted |
|---|---|---|---|
| Reservation Lifecycle | 20% | 9 | 1.80 |
| Accommodation Lifecycle | 15% | 2 | 0.30 |
| Availability Lifecycle | 15% | 6 | 0.90 |
| Aggregate Model | 10% | 6 | 0.60 |
| Repository Layer | 10% | 5 | 0.50 |
| Runtime (Persistence Engine) | 10% | 7 | 0.70 |
| Authorization Coverage | 5% | 7 | 0.35 |
| Events Coverage | 5% | 6 | 0.30 |
| Transaction Support | 5% | 5 | 0.25 |
| Failure Simulation | 5% | 1 | 0.05 |
| **Total** | **100%** | | **5.75 / 10** |

### Score Justification

| Category | Score | Reasoning |
|---|---|---|
| Reservation Lifecycle | 9/10 | State machine is production-quality. Only gaps: no event persistence, no payment-specific events. |
| Accommodation Lifecycle | 2/10 | Repository exists but is orphaned. No capability, no manager, no CRUD lifecycle. Blueprint defines 5 entities; zero implemented in domain. |
| Availability Lifecycle | 6/10 | Basic availability collection works. No recurring rules, no exceptions, no calendar aggregation. Natural language parser is innovative but fragile. |
| Aggregate Model | 6/10 | Reservation is properly modeled as aggregate root. But aggregate boundary in code is narrower than blueprint. 5 other aggregates have no capabilities. |
| Repository Layer | 5/10 | 27 repositories defined with proper metadata. Critical missing: Owner repository. Duplicate files. Many blueprinted entities unreachable. |
| Runtime (Persistence Engine) | 7/10 | Engine, TransactionManager, UnitOfWork are well-designed. But no providers connected — zero durable persistence. |
| Authorization Coverage | 7/10 | Roles cover MVP permissions. Engine is full-featured. Concern: invocation points unclear. |
| Events Coverage | 6/10 | 14 reservation events cover the lifecycle well. But no persistence, no DLQ, no versioning, no ordering guarantee. |
| Transaction Support | 5/10 | Atomicity for single Map operations only. No cross-capability atomicity. No saga/compensation. Design is solid but implementation is in-memory only. |
| Failure Simulation | 1/10 | No infrastructure for fault injection, scenario testing, or chaos experiments. |

---

## Verdict

### ❌ REQUIRES ARCHITECTURAL ADJUSTMENTS

**The MVP domain logic (reservation state machine, events, workflows) is well-designed and production-ready. However, the infrastructure and data layers have critical gaps that must be resolved before database implementation can begin.**

### Must-Resolve Before Database Implementation

| Priority | Action | Component |
|---|---|---|
| P0 | Create `OwnerRepository` | Persistence — OwnerCapability has no data contract |
| P0 | Create `AccommodationCapability` | Domain — Core MVP entity has no lifecycle |
| P0 | Wire persistence providers (at minimum: PostgreSQL adapter) | Infrastructure — System has zero durable storage |
| P0 | Implement event persistence for replay | Events — Recovery cannot rely on in-memory state |
| P0 | Implement saga/compensation for reservation→payment→notification flow | Transactions — Multi-step rollback is impossible |
| P1 | Implement payment flow (beyond placeholder) | Domain — Payment is MVP-scope but non-functional |
| P1 | Wire WhatsApp providers to real API | Integrations — Owner communication is core to MVP |

### Recommended Architectural Decisions

1. **Owner is a projection of BusinessTenant + Identity**, not a separate entity. Model OwnerRepository as a facade over identity.repository + business.repository.
2. **Accommodation should be split** from the Experience cluster into its own capability with full CRUD lifecycle before database implementation.
3. **Availability should use explicit calendar slots** (not natural-language parsing) for the database-backed version; keep NL parsing as a UX layer on top.
4. **Event store should be implemented** as a simple append-only log before adding any database provider — it's the foundation for recovery, projections, and audit.
5. **Payment should be designed as a saga** with the reservation state machine driving compensation (if payment fails → revert reservation to REQUESTED or CANCELLED).

### What Works (Deployable)

- ✅ Reservation state machine (10 statuses, valid transitions, guards)
- ✅ Event model (14 events covering full lifecycle)
- ✅ Authorization roles (visitor, business:owner, admin cover MVP)
- ✅ Timer and recovery mechanisms
- ✅ Persistence engine design (TransactionManager, UnitOfWork, RepositoryEngine)
- ✅ CMS sync engine architecture
- ✅ Owner capability facade (orchestration layer)
- ✅ Basic availability management
- ✅ Notification delivery with retry, rate-limiting, and templates
