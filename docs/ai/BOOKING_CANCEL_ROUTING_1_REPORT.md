# BOOKING-CANCEL-ROUTING-1 — Cancellation routing

**Base:** `6a8e516` on `booking-pricing-1a` (parent: `fix(booking): make mock reservation cancellation atomic`)
**Scope:** production change + focused tests + this report. Nothing staged, committed or pushed.

## Problem

`ReservationManager.cancelReservation` chose its branch from
`config.persistenceProvider === 'postgres'` instead of from the repository it held.
The repository picks its own adapter internally, so any config/adapter
disagreement selected the wrong branch: a real repository plus a non-PostgreSQL
config string took a **status-only** path, leaving `reserved_count` held while the
caller was told the reservation was cancelled. The repo-less branch also called
`availability.updateAvailability`, and `BusinessReservationManager.cancelReservation`
ran a **second** range-based release after the delegated cancellation.

## Changes

`capabilities/reservation/reservation.manager.js`

- Routing now keys on `this.#repo` presence. `config.persistenceProvider` is no
  longer read on this path; the repository's own adapter gate selects mock or
  PostgreSQL.
- Repository-backed cancellation requires `cancelReservationWithRelease`; a
  missing method throws instead of degrading to status-only persistence.
- A falsy/`null` result throws: no cache write to cancelled, no success result,
  no `reservation:cancelled` event, no notification.
- Repository rejections propagate; nothing is caught, no fallback attempted.
- The result is only a success signal. Mock resolves the stored row, PostgreSQL a
  `{ reservation, release }` wrapper; the cache keeps the domain object `updated`.
- The dead `availability.updateAvailability` call is removed from this branch
  only; other lifecycle branches are untouched.
- Repo-less cache cancellation is preserved via `#persist(updated)`, still
  succeeding without a repository.
- `#loadReservation`, permission check, transition, notes/reason and
  `cancelledAt` are unchanged.

`capabilities/business/manager/business-reservation.manager.js`

- `cancelReservation` no longer performs the second `releaseReservation`. Release
  is delegated to the reservation repository through
  `cancelReservationWithRelease`, which releases exactly the recorded occupied
  nights and marks the lines released. The legacy policy for a record-less
  `DATE_RANGE` line is unchanged.
- The removed pass ran `checkIn..checkOut` with check-out inclusive — one night
  wider than any occupied-night set — and could mark a night `available` without
  decrementing `reserved_count`, exposing held inventory. Its bare `catch { }`
  also swallowed every failure.
- Business-active check, `BUSINESS_PERMISSIONS.UPDATE`, ownership check,
  delegation and `business.reservation:cancelled` are unchanged.
- `expireReservation` keeps its release and its `catch`: out of scope.

Hold release for a line-less hold is unchanged and remains the supported path:
`business.service.js` → `business.manager.js` →
`business-availability.manager.js#releaseReservation` → `availability.service.release`,
still emitting `business.availability:day_released`. `reserveAccommodation` is
likewise intact.

## Tests

New `capabilities/reservation/reservation.manager.cancel-routing.test.js`
(26 cases) exercises the real `ReservationManager`, real `ReservationRepository`
and real writable `InMemoryRepositoryAdapter`. No production logic is
reimplemented; no source-text assertion is used. The `pg` double is installed
before the repository is imported and asserted to be in place.

Covered: mock config reaches the repository; PostgreSQL config reaches it; a
PostgreSQL-configured context with a Map repository; a mock-configured context
with a PostgreSQL-shaped repository (the regression); a manager-driven
cancellation against the real Map repository asserting status, `cancelled_at`,
notes, `reserved_count`, availability `status` and line `released_at` together;
the terminal-state second cancellation releasing nothing; a repository without
the release method; null and rejected results with zero notification calls and a
positive control proving the notification path is reachable; a real repository
whose stored row is missing; repo-less cache cancellation with and without an
availability capability; business cancellation with and without a wired
availability manager; delegate failure, ownership rejection (biz-2 active,
reservation owned by biz-1) and unknown-business rejection; the
`BusinessAvailabilityManager` reserve and release delegations; denied and granted
permissions; unknown reservation; invalid transition; and forwarding of the
reservation's tenant id rather than the context's.

| Command (cwd `C:\Users\casa\Documents\booking-pricing-1a`) | Result |
| --- | --- |
| `node capabilities/reservation/reservation.manager.cancel-routing.test.js` | 26/26, exit 0 |

Earlier in this slice the same worktree also ran the atomic cancellation suite
(26/26), the occupied-nights suite (101/101) and the reservation and business
lifecycle suites (22/22, 37/37); those results predate this final comment and
report correction and were not re-run.

`git diff --check` reports no whitespace errors.

## Limitations

- The `pg` double intercepts the bare `pg` specifier only; it is not a network
  sandbox. No real `Pool.connect`, socket, bootstrap, provisioning, HTTP request
  or Stage access occurred, and no configuration or credential was printed.
- The PostgreSQL-shaped test doubles one adapter read (`findOne`) because the
  shared support double deliberately refuses `pool.query()`. The repository's real
  `findById`/`findOne` orchestration, adapter gate, `transaction()` and all write
  statements are real.
- Nothing certifies a PostgreSQL server: no SQL parsing, constraints, JSONB round
  trips, row locking, isolation, cross-process concurrency or physical rollback.
- The Map cancellation path is synchronously atomic for store-write failures
  within one process. That is a synchronous unwind, not a physical database
  transaction, and it buys no crash durability or cross-process isolation.
- The suite is invoked standalone; it is not wired into a repository-wide
  runner, and this slice did not run the full repository suite.
- Tenant forwarding is not tenant isolation: the test proves which tenant id
  reaches the repository, nothing about cross-tenant enforcement.
- The hold-release coverage is `BusinessAvailabilityManager` delegation only, not
  the full HTTP/API chain.
- Event policy is unchanged: store-write failures roll back; a synchronous
  subscriber error after publication can still reject with committed stores.
- A manager with no repository and a `postgres` config string still fails via the
  pre-existing `#persist` guard; that shape has no release contract to honour.
- Manager-external callers of the business release path are unaffected; only the
  duplicate release inside cancellation is gone.

## Pending gates

- Policy decision for record-less historical `DATE_RANGE` lines: whether the
  legacy range-based release stays, or historical lines are backfilled with
  occupied-night records before the slice that removes it.
- Real PostgreSQL verification of routing plus atomic cancellation, including
  rollback on a case C line and on capacity shortfall.
- Deployment readiness for expiration and recovery, which still carry their own
  release behaviour and are pending here.
- Event semantics: whether a post-publication subscriber error should reject the
  caller.

## Final Git state

```
branch booking-pricing-1a   HEAD 6a8e51612e4c830ee1815259fb61016feaf32bd4
 M capabilities/business/manager/business-reservation.manager.js
 M capabilities/reservation/reservation.manager.js
?? capabilities/reservation/reservation.manager.cancel-routing.test.js
?? docs/ai/BOOKING_CANCEL_ROUTING_1_REPORT.md
```

`git diff --cached` is empty. Nothing committed, staged, pushed or deployed; no
dependency changes and no database access.