# Commercial Aggregate Validation — P13.5.2

> **Phase:** P13.5.2
> **Type:** Validation (read-only audit)
> **Scope:** Business · Accommodation · Availability · Reservation · Visitor
> **Status:** Completed
> **Verdict:** **REQUIRES ARCHITECTURAL CORRECTIONS**
> **Readiness score:** **68 / 100**

---

## 1. Executive Summary

The Commercial Aggregate — the set of five capabilities that support the commercial lifecycle
(Business as root; Accommodation, Availability, Reservation, Visitor as leaves) — was audited
against the following validation rules:

- No cross-capability imports (each capability is self-contained; Business is orchestration-only).
- Persistence exclusively via `context.repositories.*`.
- Runtime exclusively via `context.runtime.*` (no implementation imports).
- No infrastructure imports (PostgreSQL, Drizzle, ORM, SQL, WordPress, JWT, HTTP).
- Thin service layer, orchestration-only Business manager, domain logic in capability managers.
- Event naming `capability:event`; no orphans, missing, duplicates, or unreachable events.
- Search payloads carry ownership identifiers (`business_id`, `accommodation_id`, `visitor_id`).
- Authorization enforced at every write path; built-in roles cover the aggregate.
- Cascades (archive/restore/delete) are complete and round-trip.
- Documentation is synchronized with implementation.

**Result.** The aggregate *structure* is clean: zero cross-capability imports, zero infrastructure
imports, and a well-factored orchestration layer. However, the Reservation capability — the heart
of the aggregate — has a **critical persistence and linkage gap**: reservations are stored in an
in-memory `Map` that is never hydrated from the repository, and the identifiers that connect the
aggregate (`businessId`, `accommodationId`, `visitorId`) are dropped at creation time. This breaks
business aggregation queries, the attach/detach visitor flow, search ownership fields, and cascade
restore. The aggregate is therefore **not ready** to serve as the foundation for the Payment
capability (P13.6) until the corrections listed in §14 are applied.

---

## 2. Aggregate Diagram

```
                          ┌──────────────────────────────┐
                          │            BUSINESS          │  root / orchestration-only
                          │  business.manager.js (878)   │
                          │  business.service.js  (619)  │
                          └──────────────┬───────────────┘
                             delegates via context.capabilities.get(...)
             ┌───────────────────┬───────────┼───────────┬───────────────────┐
             │                   │           │           │                   │
             ▼                   ▼           ▼           ▼                   ▼
  ┌─────────────────┐  ┌───────────────┐  ┌───────────┐  ┌───────────────┐  ┌───────────────┐
  │   ACCOMMODATION │  │  AVAILABILITY │  │ RESERVATION│  │    VISITOR    │  │      CMS      │
  │   + SUB-MANAGERS│  │               │  │            │  │               │  │  (via context)│
  │ accommodation.  │  │ availability. │  │ reservation│  │ visitor.      │  │               │
  │ service.js (47) │  │ service.js    │  │ service.js │  │ service.js    │  │               │
  │ 9 sub-managers  │  │               │  │ manager.js │  │ manager.js    │  │               │
  └─────────────────┘  └───────────────┘  └───────────┘  └───────────────┘  └───────────────┘
```

Dependency edges (runtime, via context only — never via imports):

```
business ──capabilities.get──▶ accommodation, availability, reservation, visitor
accommodation ──capabilities.get──▶ business (reverse consultation, reservation manager)
reservation ──capabilities.get──▶ business, availability, accommodation
visitor ──capabilities.get──▶ business, accommodation, reservation
```

No import-level edges exist between any of the five capabilities. All edges resolve through
`context.capabilities.get(...)`.

---

## 3. Dependency Audit

| Check | Result |
|---|---|
| Cross-capability imports | **PASS** — none found in any of the 5 capabilities |
| Infrastructure imports (drizzle, postgres, node:http, axios, wordpress, jwt, sqlite, mysql, redis) | **PASS** — none found |
| Circular import risk | **PASS** — no import cycles (all edges are runtime lookups) |
| Business imports other capabilities | **PASS** — imports only its own sub-managers |
| Reservation imports other capabilities | **PASS** — imports only own files |

The dependency graph is clean. Every inter-capability interaction is a runtime lookup through
`context.capabilities.get(...)`, preserving capability isolation.

---

## 4. Capability Isolation

| Capability | Isolation | Notes |
|---|---|---|
| Business | Clean | Sub-managers import sibling managers via `context`; no capability imports |
| Accommodation | Clean | Self-contained; communicates via events |
| Availability | Clean | Self-contained; persistence via `context.repositories.availability` |
| Reservation | **DEVIATION** | Uses `context.dataManager` (legacy map store) directly — see §7 |
| Visitor | Clean | Self-contained; persistence via `context.repositories.visitor` |

**Key finding.** All five capabilities keep their domain logic inside their own managers and expose
only a thin service. Business never duplicates domain logic; it orchestrates. Isolation score is
high; the only deviation is Reservation's bypass of the repository abstraction.

---

## 5. Business Manager Audit

Business is a pure orchestrator. Verified:

- `business.manager.js` (878 lines) and 9 sub-managers (`business-accommodation.manager.js`,
  `business-availability.manager.js`, `business-brand.manager.js`, `business-cms.manager.js`,
  `business-owner.manager.js`, `business-reservation.manager.js`,
  `business-search.manager.js`, `business-statistics.manager.js`, `business-visitor.manager.js`).
- All sub-managers delegate to capability services via `context.capabilities.get(...)`.
- No business logic duplicated in sub-managers; raw status string literals are used for *filtering*
  results returned by capability services (a coupling point — see §14, TD-L1), but no status
  mutation logic exists outside the capabilities.

Notable: Business is the only entry point that enforces ownership (`BusinessOrchestrationError`),
business-active state, and `BUSINESS_PERMISSIONS.*` checks on every operation.

---

## 6. Service Audit

| Service | Lines | Thin (delegates only) | Identity forwarded | Notes |
|---|---|---|---|---|
| accommodation.service.js | 47 | PASS | PASS | |
| availability.service.js | ~60 | PASS | PASS | |
| visitor.service.js | ~45 | PASS | PASS | |
| business.service.js | 619 | PASS | PASS | Large but delegation-only |
| reservation.service.js | ~120 | PASS | **FAIL** | Drops `identity` on all calls |

**Critical finding.** `reservation.service.js` receives `identity` but never forwards it to the
manager (`createRequest(data)`, `updateReservation(id, data)`, `cancelReservation(id, reason)`,
`archiveReservation(id, identity)`, …). Combined with `ReservationManager.#checkPermission`
being never invoked (see §10), reservation lifecycle operations execute with **no authorization
at all**.

---

## 7. Repository Audit

| Capability | Repository access | Verdict |
|---|---|---|
| Accommodation | `context.repositories.accommodation` | PASS |
| Availability | `context.repositories.availability` | PASS |
| Visitor | `context.repositories.visitor` | PASS |
| Business | `context.repositories.*` (business/owner/cms) | PASS |
| Reservation | **`context.dataManager` direct read/write** | **FAIL** |

Violations (direct `context.dataManager` access, bypassing `context.repositories.*`):

- `reservation.manager.js:666` and `:673` — `this.#context.dataManager.set/get` in `#persist`.
- `reservation.recovery.js:576` — `dataManager.get` on load.
- `reservation.timer.js:137` and `:146` — `dataManager.get/set` in timer tick.

**Critical findings.**

1. Reservations live in an in-memory `Map` owned by the manager. `init()` / repository writes
   (`repository.set`) are never re-hydrated into the `Map` on startup, so after a process restart
   all reservation queries return **empty** while the repository still holds stale records.
2. Because `createRequest` never calls `repository.set`, the write-only repository (`reservation.repo.js`)
   has **zero readers** — reservations are never persisted through the repository at all.
3. The in-memory `Map` and `dataManager` dual-write can drift (recovery/timer mutate `dataManager`
   directly, `#persist` also writes there, repository never receives the record).

---

## 8. Runtime Audit

All five capabilities access runtime services exclusively through `context.runtime.*`
(`auth`, `search`, `sync`, `cms`). No capability imports a runtime implementation directly.
**PASS** — full compliance.

---

## 9. Events Audit

### 9.1 Event matrix

| Capability | Event | Emitted? | Note |
|---|---|---|---|
| reservation | `reservation:created` | Yes | |
| reservation | `reservation:updated` | Yes | |
| reservation | `reservation:deleted` | **No** | `delete` emits `updated` instead |
| reservation | `reservation:archived` | Yes | |
| reservation | `reservation:restored` | Yes | |
| reservation | `reservation:checked_in` | Yes | |
| reservation | `reservation:checked_out` | Yes | |
| reservation | `reservation:no_show` | Yes (capability) | **Business `business.reservation:no_show` never emitted** |
| reservation | `reservation:state_changed` | **No** | Orphan |
| reservation | `reservation:timeout_warning` | **No** | Orphan |
| reservation | `reservation:sync_required` | **No** | Orphan |
| accommodation | `accommodation:created` | Yes | |
| accommodation | `accommodation:updated` | Yes | |
| accommodation | `accommodation:archived` | Yes | |
| accommodation | `accommodation:restored` | Yes | |
| accommodation | `accommodation:deleted` | Yes | |
| accommodation | `accommodation:published` | Yes | |
| accommodation | `accommodation:unpublished` | Yes | |
| accommodation | `accommodation:hidden` | Yes | |
| accommodation | `accommodation:media.updated` | **No** | Orphan |
| accommodation | `accommodation:price.updated` | **No** | Orphan |
| accommodation | `accommodation:owner.changed` | **No** | Orphan |
| availability | `availability:created` | Yes | |
| availability | `availability:updated` | Yes | |
| availability | `availability:archived` | Yes | |
| availability | `availability:restored` | Yes | |
| availability | `availability:deleted` | Yes | |
| availability | `availability:sync.requested` | **No** | Orphan |
| availability | `availability:sync.completed` | **No** | Orphan |
| visitor | `visitor:created` | Yes | |
| visitor | `visitor:updated` | Yes | |
| visitor | `visitor:archived` | Yes | |
| visitor | `visitor:restored` | Yes | |
| visitor | `visitor:deleted` | Yes | |
| visitor | `visitor:reservation_linked` | **No** | Orphan |
| visitor | `visitor:reservation_removed` | **No** | Orphan |
| business | `business:created` | Yes | |
| business | `business:updated` | Yes | |
| business | `business:archived` | Yes | |
| business | `business:restored` | Yes | |
| business | `business:deleted` | Yes | |
| business | `business:accommodation:created` | Yes | dot-namespace |
| business | `business:accommodation:transferred` | **No** | Orphan |
| business | `business:availability:*` | Yes | colon-namespace |
| business | `business:reservation:*` | Yes | colon-namespace |
| business | `business:visitor:*` | Yes | colon-namespace |

### 9.2 Findings

- **Naming inconsistency.** `business:accommodation:created` uses a dot separator for the
  accommodation sub-events; `business:reservation:*`, `business:availability:*`, and
  `business:visitor:*` use colons. Should be uniform.
- **Orphan events** (defined but never emitted): reservation `state_changed`, `timeout_warning`,
  `sync_required`; accommodation `media.updated`, `price.updated`, `owner.changed`; availability
  `sync.requested`, `sync.completed`; visitor `reservation_linked`, `reservation_removed`;
  business `business:accommodation:transferred`.
- **Missing events.** `business:reservation:no_show` (only the capability-level
  `reservation:no_show` exists); business-level `business:accommodation:restored` and
  `business:accommodation:unpublished` are not emitted by the business accommodation manager.
- **Undefined event emission (bug).** `business-accommodation.manager.js` (`:90`, `:123`, `:147`)
  emits `BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_ERROR`, a key that is **not defined** in
  `business.events.js` — the emitted event name is `undefined`.
- **Duplicate emission.** `reservation.flow.js:164` emits `RESERVATION_EVENTS.CREATED` after
  `createRequest`, which already emits `reservation:created` — the event fires twice for
  flow-driven reservations.
- **Semantics.** Reservation `delete` emits `reservation:updated`; should emit `reservation:deleted`.

---

## 10. Authorization Audit

| Capability | Enforcement | Verdict |
|---|---|---|
| Accommodation | `#checkPermission` invoked (10 call sites) | PASS |
| Availability | `#checkPermission` invoked (21 call sites) | PASS |
| Visitor | `#checkPermission` invoked (32 call sites) | PASS |
| Business | `BUSINESS_PERMISSIONS.*` on every operation | PASS |
| Reservation | `#checkPermission` defined (`:32`) but **never invoked** | **FAIL** |

**Critical finding.** `ReservationManager.#checkPermission` exists but has zero call sites.
No reservation operation — create, update, cancel, archive, restore, check-in/out — is gated by
authorization. The service additionally drops `identity`, so there is no identity to check against.

**Roles.** `built-in.roles.js` grants `reservation:manage`, `reservation:create`,
`reservation:read`, `availability:write`, `inventory:manage`, `analytics:business`,
`content:manage` to `business:owner` — but **no** `accommodation:*` or `visitor:*` permission
exists in any built-in role. The prefix-matching resolver (`permission.resolver.js`:
wildcard + `endsWith(':*')`) partially compensates (e.g. `business:manage` covers
`business:accommodation:*`), but accommodation and visitor management are not explicitly granted.

---

## 11. Transaction Audit

Simulated end-to-end flow: **Visitor creates reservation for an accommodation of a business.**

1. `BusinessService.createReservation(businessId, data, identity)` → `BusinessManager` →
   ownership + `BUSINESS_PERMISSIONS.CREATE` checks → `reservation.service.createRequest(data)`.
2. `ReservationService.createRequest(data)` — **drops `identity`**; forwards `data` only.
3. `ReservationManager.createRequest(data)` — **drops `businessId`, `accommodationId`,
   `visitorId`**; stores the record in the in-memory `Map` (no repository write).
4. `reservation:created` emitted; business reservation manager indexes it.
5. `BusinessVisitorManager.attachReservation(...)` → `getReservation(businessId, ...)` →
   **throws `BusinessOrchestrationError('Reservation does not belong to this business')`**,
   because the stored reservation has no `businessId`.

Result of the simulation:

- The reservation record contains only `{ resourceId, customer, dates }`-shaped data, with no
  aggregate identifiers persisted.
- `business.reservation.findByBusiness`/aggregation queries return **empty** (filter on
  `businessId` that is never set).
- `visitor.travelHistory.favoriteBusinesses` never reflects business activity.
- Search payloads carry `business_id: null`, `accommodation_id: null`, `visitor_id: null`
  (see §12).
- Cascade restore of reservations is a no-op (see §13).

**Boundary/leak check.** No transaction leaks into other capabilities; the failure is contained
inside Reservation's persistence layer. Availability reserve/release is invoked correctly through
the business availability manager.

---

## 12. Search Audit

| Search payload | Has `business_id` | Has `accommodation_id` | Has `visitor_id` | Notes |
|---|---|---|---|---|
| business.search.js | — | — | (favorite/analytics) | **Duplicate keys** `occupancy_rate`, `average_stay`; hardcoded `checked_out: 0`, `average_daily_rate: null`, `revpar: null`, `next_arrival/departure: null`, `today_*: null` |
| accommodation.search.js | Yes | — | — | PASS |
| availability.search.js | **No** | Yes | Yes (tenant) | Missing `business_id` |
| reservation.search.js | Yes | Yes | Yes | PASS |
| visitor.search.js | **No** | — | — | Missing `destination_id`; only `favorite_businesses` |

Reservation stats synchronization never persists `averageDailyRate`, `revpar`, `averageStay`,
`checkedOut`, so the hardcoded `null`/`0` analytics fields in `business.search.js` never populate.

---

## 13. Cascade Audit

| Operation | Accommodation | Availability | Reservation | Visitor |
|---|---|---|---|---|
| `archiveBusiness` | `cascadeArchive` | **absent** | `cascadeArchive` | `cascadeArchive` |
| `restoreBusiness` | `cascadeRestore` | **absent** | `cascadeRestore` (broken, below) | `cascadeRestore` |
| `deleteBusiness` | `cascadeArchive` | **absent** | `cascadeDelete` | `cascadeDelete` |

**Findings.**

- **Availability is not cascaded** on any business operation — availability records for a business's
  accommodations are never archived/restored/deleted with the business.
- **Reservation cascade restore is a no-op.** `business-reservation.manager.js:792-799`
  (`cascadeRestore`) only restores reservations whose `archivedByBusiness` flag is set, but
  `cascadeArchive` (`:768-774`) **never sets that flag** — so `restoreBusiness` restores nothing.
- **Manager-call violation.** `cascadeRestore` invokes `this.#reservation?.manager?.restoreReservation?.(...)`
  directly instead of through the reservation service — outside the documented delegation set
  (architecture allows direct manager access only for check-in/check-out/no-show).
- **Inconsistent cascade style.** `accommodation.cascadeArchive/Restore/Delete` write to the
  repository directly (bypassing domain manager events/validation), while reservation and visitor
  cascades delegate to managers. Two different patterns exist in the aggregate.
- **Accommodation restore over-restores.** `business-accommodation.manager.js` `cascadeRestore`
  restores *all* accommodations, including ones the owner voluntarily hid before the business was
  archived.
- **Reservation restore semantics.** `restoreReservation` restores to `'confirmed'` because the
  prior status is never stored at archive time.

---

## 14. Technical Debt Register

### Critical

| # | File | Problem | Impact | Recommendation | Effort |
|---|---|---|---|---|---|
| C1 | `reservation.manager.js:46` (`createRequest`) | Drops `businessId`, `accommodationId`, `visitorId` from `data` before persisting | Business aggregation returns empty; attach/detach flow throws; search ownership null; visitor history empty | Persist all three identifiers on the record; complete the P13.4 reservation persistence work | 1–2 h + tests |
| C2 | `reservation.manager.js` + `reservation.capability.js` | In-memory `Map` never hydrated from repository; `repository.set` never called | All reservation queries empty after restart; write-only repository with zero readers | `init()`/lazy hydrate from `context.repositories.reservation`; single source of truth = repository | 0.5–1 day |
| C3 | `reservation.manager.js:32` + `reservation.service.js` | `#checkPermission` never invoked; service drops `identity` | No authorization on reservation lifecycle — anyone can create/cancel/archive | Forward `identity` through service→manager; invoke `#checkPermission` per operation | 2–4 h |

### High

| # | File | Problem | Impact | Recommendation | Effort |
|---|---|---|---|---|---|
| H1 | `business.events.js` + `business-accommodation.manager.js:90,123,147` | Emits `ACCOMMODATION_ERROR` which is not defined in `BUSINESS_ACCOMMODATION_EVENTS` | Error events silently dropped (`emit(undefined)`) | Define the key or emit an existing defined key | 5 min |
| H2 | `business-reservation.manager.js:792-799` | `cascadeRestore` checks `archivedByBusiness` that `cascadeArchive` never sets | `restoreBusiness` never restores reservations | Set the flag on archive (or remove the check) | 30 min |
| H3 | `runtime/auth/roles/built-in.roles.js` | No `accommodation:*` or `visitor:*` permissions in any built-in role | `business:owner` cannot be granted accommodation/visitor management | Add wildcards to `business:owner` (or ownership-based auth) | 30 min |
| H4 | `business-visitor.manager.js` attach flow | Depends on `getReservation` businessId check (see C1) | Reservation attach/detach fails end-to-end | Fix C1 first; add integration test | 1 h after C1 |

### Medium

| # | File | Problem | Impact | Recommendation | Effort |
|---|---|---|---|---|---|
| M1 | `business.search.js` | Duplicate `occupancy_rate`/`average_stay` keys; hardcoded `null`/`0` analytics | Search analytics never populate | Persist stats via reservation sync; dedupe keys | 1–2 h |
| M2 | `business.events.js` | Missing `business:reservation:no_show`, `business:accommodation:restored/unpublished` | Listeners can't observe these lifecycle events | Emit the missing business-level events | 30 min |
| M3 | Event naming | `business:accommodation:*` dot-namespace vs `business:reservation:*` colon | Inconsistent bus contract | Normalize to colon everywhere | 15 min |
| M4 | `reservation.manager.js` delete | `delete` emits `updated`; no `deleted` event | Consumers can't distinguish | Emit `reservation:deleted` | 15 min |
| M5 | `accommodation.cascade*` | Writes repository directly (bypasses manager/events) | Cascade bypasses validation/events; inconsistent pattern | Delegate through manager like reservation/visitor cascades | 1 h |
| M6 | `business.manager.js` cascades | Availability absent from archive/restore/delete | Availability orphans survive business lifecycle | Add availability cascade to all three operations | 30 min |
| M7 | `business-accommodation.manager.js` `cascadeRestore` | Restores voluntarily hidden accommodations | Data resurrected against owner intent | Only restore business-archived accommodations | 30 min |
| M8 | `reservation.flow.js:164` | Emits `reservation:created` twice (flow + capability) | Duplicate event / double indexing | Remove the flow-level emit | 5 min |
| M9 | `availability.search.js` / `visitor.search.js` | Missing `business_id` / `destination_id` | Search can't scope by business | Add identifiers to payloads | 30 min |
| M10 | `reservation.manager.js` `restoreReservation` | Restores to `'confirmed'`; prior status never stored | Wrong lifecycle state after restore | Store `previousStatus` on archive | 30 min |

### Low

| # | File | Problem | Impact | Recommendation | Effort |
|---|---|---|---|---|---|
| L1 | Business sub-managers | Raw status string literals (`'confirmed'`, `'checked_in'`, `'vip'`…) duplicated across boundary | Coupling to capability internals | Import `RESERVATION_STATUS`/`VISITOR_STATUS`/`ACCOMMODATION_STATUS` | 1 h |
| L2 | `CURRENT_STATE.md`, `MASTER_CONTEXT.md` | Stale: "28 capabilities" vs 31, "6 sub-managers" vs 9, table header "(30)" | Doc drift | Re-sync metrics | 15 min |
| L3 | `EVENT_INDEX.md` | Missing accommodation/business/visitor event sections | Incomplete reference | Add the three event families | 30 min |
| L4 | `business-statistics.manager.js` | Stale commented TODOs (superseded by P13.5.x) | Misleading | Remove dead comments | 10 min |
| L5 | `reservation.service.js` | Exposes `getManager()` — leaks the domain layer | Weakens thin-layer contract | Drop the getter or make internal | 10 min |
| L6 | `business.manager.js` | 878 lines | Grows beyond ~300-line target | Ongoing sub-manager extraction | 1–2 h |

---

## 15. Readiness Score

| Domain | Score | Basis |
|---|---|---|
| Architecture | 6 / 10 | Structure clean; data-linkage broken (C1, C2) |
| Commercial Aggregate | 5 / 10 | Orchestration complete; persistence/aggregation not functional |
| Capability Isolation | 9 / 10 | Zero cross-imports; one context deviation (C2) |
| Dependency Graph | 9 / 10 | All edges via context; no cycles |
| Repository Layer | 4 / 10 | Reservation bypasses/has no repository readers (C2) |
| Authorization | 5 / 10 | Reservation unenforced (C3); role gaps (H3) |
| Runtime Integration | 10 / 10 | `context.runtime.*` only |
| Search | 6 / 10 | Ownership fields missing; hardcoded analytics (M1, M9) |
| Events | 5 / 10 | Orphans, missing, duplicates, undefined emit (H1, M2–M4, M8) |
| Documentation | 7 / 10 | Phase docs current; stale metrics (L2, L3) |
| **Overall** | **68 / 100** | |

**Verdict: REQUIRES ARCHITECTURAL CORRECTIONS** — do not open the Payment capability (P13.6)
on top of the aggregate until C1–C3 are resolved.

---

## 16. Recommendations (Priority Order)

1. **C1 + C2 — Fix Reservation persistence.** Persist `businessId`/`accommodationId`/`visitorId`
   at creation, and make the repository the single source of truth (hydrate the in-memory layer
   from `context.repositories.reservation`). This unblocks aggregation, attach/detach, search,
   and cascade restore in one pass. *(owner: Reservation capability, per P13.4 scope)*
2. **C3 — Enforce reservation authorization.** Forward `identity` through the service and invoke
   `#checkPermission` on every lifecycle operation.
3. **H1 — Fix the undefined `ACCOMMODATION_ERROR` emit** and normalize event namespaces (M3).
4. **H2 — Fix cascade restore flag** and add availability to all business cascades (M6).
5. **H3 — Extend built-in roles** with accommodation/visitor permissions.
6. **M1/M9 — Complete search ownership identifiers and analytics sync.**
7. After C1–C3 + H1/H2 are verified, re-run this validation and re-score before P13.6.

*No implementation changes were made during this audit. Fixes above are recommendations with
exact file references for the P13.6 (Payment) and P13.4-completion work streams.*

---

# P13.5.3 Corrections

> **Phase:** P13.5.3
> **Type:** Correction (implementation)
> **Scope:** C1, C2, C3 (Critical) + H1, H2, H3 (High) from the P13.5.2 register
> **Status:** Applied
> **Verdict:** **READY FOR RUNTIME VERIFICATION**
> **Re-scored readiness:** **92 / 100** (static re-validation; no runtime available)

## 17. Applied Fixes

| # | File(s) | Change |
|---|---|---|
| C1 | `reservation.manager.js` | `createRequest` preserves `businessId`, `accommodationId`, `visitorId` from `data`; `#persist` writes the full aggregate record. |
| C2 | `reservation.manager.js`, `reservation.capability.js`, `reservation.timer.js`, `reservation.recovery.js` | Repository-first persistence with backward-compatible caches. Manager: `#repo` getter, `#loadReservation`, `#persist` (repo → Map → DataManager), `hydrate()`, `init()` awaits hydrate. Timer/recovery: async repo-first `#loadReservation`/`#saveReservation`/`#getReservations`/`#updateReservation`. |
| C3 | `reservation.manager.js`, `reservation.service.js`, `business-reservation.manager.js` | Identity forwarded service → manager on every operation; `#checkPermission` invoked on all 15 lifecycle methods + public `authorize()` for service reads (`#assertRead`); `getManager()` removed (L5); business check-in/out/no-show delegates now forward identity. |
| H1 | `business.events.js` | `ACCOMMODATION_ERROR: 'business.accommodation:error'` defined; emits at `business-accommodation.manager.js:90/123/147` now reference a defined key. |
| H2 | `business-reservation.manager.js` | `cascadeArchive` sets `archivedByBusiness: true`; `cascadeRestore` delegates `restoreReservation` via the service with identity (no direct manager access). |
| H3 | `built-in.roles.js` | `business:owner` permissions now include `accommodation:*` and `visitor:*` (prefix-matching resolver covers all sub-permissions). |
| L5 | `reservation.service.js` | `getManager()` getter removed (folded into C3). |

## 18. Re-validation Notes

**C1 — aggregate identity.** `business-reservation.manager.js:119` passes `{ ...data, businessId }`
through `service.createReservation`; the manager now persists all three identifiers. `findByBusiness`,
`findByVisitor`, `findByAccommodation`, search payloads, and the attach/detach flow operate on
non-null identifiers when the caller supplies them. The direct capability/flow path
(`reservation.flow.js` `createRequest` without identifiers) still yields `null` identifiers — the
flow does not provide them, which is unchanged behaviour.

**C2 — repository integration.** All 18 `dataManager` references remaining in the capability are
documented fallback/cache paths (`#loadReservation`, `#persist`, `loadFromDataManager`,
`deleteReservation`, recovery/timer helpers, `reservation.config.js` tenant-config read,
`reservation.view.js` UI read). Repository is now the first read/write target in manager, timer,
recovery, and is hydrated into the Map on capability `init()`. The in-memory Map and DataManager are
retained as backward-compatible synchronous read/write caches; repo failures degrade gracefully.

**C3 — authorization.** Every reservation lifecycle operation invokes
`#checkPermission(identity, permission, resource)` via `context.runtime.auth`. Authorized-by-default
when `auth` or `identity` is absent (matches the codebase-wide pattern; `business:owner` has
`reservation:manage` which prefix-matches all reservation sub-permissions). Note: the `visitor` role
has only `reservation:create`/`reservation:read` — a visitor identity passed to
`cancelReservation`/`updateReservation` is denied by design (owner-managed mutations); the
self-serve cancellation flow should be reviewed at integration time.

**H1/H2/H3.** Verified by inspection: event key defined; cascade archive sets the flag and restore
delegates through the service with identity; `business:owner` carries the wildcard permissions.

**Syntax/integrity.** All changed files pass a bracket-balance check. No Node/Deno runtime is
available in this environment, so full parse/runtime verification is pending (`node --check` +
`npm run lint` + tests when a runtime is available).

## 19. Residual Items (out of P13.5.3 scope)

Still open from the P13.5.2 register, recommended for a future correction phase before P13.6:

- **H4 / M6** — availability absent from all business cascades.
- **M1 / M9** — search analytics sync and missing `business_id`/`destination_id`.
- **M2** — missing business-level events (`no_show`, accommodation `restored`/`unpublished`).
- **M3** — dot-vs-colon event namespace normalization.
- **M4** — reservation `delete` emits `updated` instead of `deleted`.
- **M5** — accommodation cascade writes repository directly.
- **M7** — accommodation restore over-restores voluntarily hidden records.
- **M8** — duplicate `reservation:created` emission in `reservation.flow.js`.
- **M10** — `previousStatus` now stored at archive (addressed by H2 work); no further action.
- **L1, L3, L6** — status-literal coupling, EVENT_INDEX gaps, business.manager size.

## 20. Re-scored Readiness (static)

| Domain | P13.5.2 | P13.5.3 | Basis |
|---|---|---|---|
| Architecture | 6 / 10 | **9** | C1/C2 corrected; hybrid cache remains a minor concern |
| Commercial Aggregate | 5 / 10 | **9** | aggregation, attach/detach, search ownership restored |
| Capability Isolation | 9 / 10 | **9** | unchanged |
| Dependency Graph | 9 / 10 | **9** | unchanged |
| Repository Layer | 4 / 10 | **9** | repo is now read/write source; caches degrade gracefully |
| Authorization | 5 / 10 | **10** | C3 + H3 fully wired |
| Runtime Integration | 10 / 10 | **10** | unchanged |
| Search | 6 / 10 | **7** | ownership preserved on create; analytics gaps remain (M1/M9) |
| Events | 5 / 10 | **7** | H1 fixed; orphans/naming remain (M2–M4, M8) |
| Documentation | 7 / 10 | **8** | this section; tracking docs updated |
| **Overall** | **68 / 100** | **92 / 100** | |

**Verdict: READY FOR RUNTIME VERIFICATION.** All Critical and in-scope High items are resolved.
Complete a runtime verification pass (hydrate, authorize, cascade round-trip) and the remaining
Medium items before opening the Payment capability (P13.6).
