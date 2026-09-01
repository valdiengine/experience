# Push Technical Debt Register

Status:
ACTIVE REGISTER

Baseline:
PUSH-4 PHYSICAL_STAGING_CERTIFIED

Certified commit:
f44988e31b92bb729c8aa3b84c22e2b67931bcc9

Certified tag:
push-4-physical-staging-certified

The main Owner campaign delivery path is certified. The items below do NOT
invalidate that certification unless explicitly marked otherwise.

---

TD-PUSH-001 — Multi-worker campaign cache consistency
--------------------------------------------------

Severity:
MEDIUM / IMPORTANT HARDENING

Evidence:
`web/push-4.2-diagnostic.test.js` = 4/5 scenarios

Problem:
`PushCampaignPersistence` maintains a process-local Map cache. Under
Passenger multi-worker execution, Worker A can retain stale campaign state
after Worker B writes newer state to filesystem.

Current mitigation:
environment + applicationId cache isolation prevents cross-app / cross-environment
cache return.

Remaining issue:
same app/environment stale state across workers.

Potential future remediation:
- persistent storage authoritative reads
OR
- cache invalidation/version checking

Status: NOT REMEDIATED.

---

TD-PUSH-002 — PostgreSQL-dependent PUSH-3 automated coverage
--------------------------------------------------

Severity:
LOW / COVERAGE

Facts:
- `web/push-3.test.js` is versioned in f44988e
- final PUSH-4 closure did not re-execute this test because PostgreSQL
  dependency was unavailable in that test context
- physical real Push delivery was separately certified

Remediation:
run the automated PUSH-3 suite in an environment with the required
PostgreSQL dependency and record results.

---

TD-PUSH-003 — Physical mobile delivery certification
--------------------------------------------------

Severity:
LOW / COVERAGE

Record that broader physical mobile delivery / Level C certification
remains incomplete. Physical mobile delivery was not certified as part of
PUSH-4 closure.

Remediation:
future controlled physical mobile matrix.

No broader device/browser certification is currently recorded.

---

TD-PUSH-004 — Campaign rate limiting / frequency caps
--------------------------------------------------

Severity:
MEDIUM / OPERATIONAL HARDENING

Current state:
no campaign-level rate limiting/frequency cap is certified.

Risk:
an authenticated Owner could generate excessive notification volume
unless higher layers constrain it.

Future remediation candidates:
- per-application send rate
- per-owner rate
- audience frequency cap
- cooldown / duplicate campaign protection
- audit/observability

Status: NOT IMPLEMENTED.

---

TD-PUSH-005 — Delivery record data minimization
--------------------------------------------------

Severity:
LOW / PRIVACY HARDENING

Observation:
`push.adapter.js` internal in-memory delivery record currently contains
subscription endpoint information.

Known facts:
- process-local/in-memory
- no evidence from current audit that it is exposed through public API
  or persisted

Future remediation:
evaluate whether endpoint is actually required in delivery history;
if not, store a non-sensitive identifier/hash instead.

This is a data-minimization hardening item, not a confirmed data leak.

---

NOT TECHNICAL DEBT
==================================================

PUSH-5 Scheduled Campaigns is NOT PUSH-4 technical debt.

It is a future product capability.

Likewise:
templates, recurring campaigns, engagement features, etc.
are future functionality unless required to correct a certified
contract defect.

---

DEBT PRIORITY
==================================================

Before production-scale Push:
1. TD-PUSH-001 (multi-worker cache consistency)
2. TD-PUSH-004 (rate limiting / frequency caps)

Coverage hardening:
3. TD-PUSH-002 (PostgreSQL-dependent PUSH-3 coverage)
4. TD-PUSH-003 (physical mobile delivery matrix)

Privacy/minimization:
5. TD-PUSH-005 (delivery record data minimization)

None currently blocks proceeding to the next Turistic OS product
milestone on staging.

---

CROSS REFERENCES
==================================================

- `docs/push/PUSH_4_CERTIFICATION.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/roadmap/CHANGELOG.md`
- `web/push-4.2-diagnostic.test.js`
