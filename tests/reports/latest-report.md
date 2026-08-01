# Capability Test Report (P13.5.7)

Generated: 2026-08-01T08:49:12.248Z

## Summary

| Metric | Value |
| --- | --- |
| Suites | 8 |
| Checks | 95 |
| Passed | 88 |
| Failed | 7 |
| Crashed suites | 3 |
| Total time | 1099ms |
| Quality gate | RED |

## Suites

| Suite | Passed | Failed | Total | Time |
| --- | --- | --- | --- | --- |
| runtime.bootstrap | 8 | 0 | 8 | 38ms OK |
| runtime.health | 15 | 0 | 15 | 4ms OK |
| runtime.smoke | 6 | 0 | 6 | 539ms OK |
| business.lifecycle | 30 | 6 | 36 | 25ms FAIL |
| availability.lifecycle | 29 | 1 | 30 | 19ms FAIL |
| visitor.lifecycle | 0 | 0 | 0 | 0ms CRASHED |
| reservation.lifecycle | 0 | 0 | 0 | 0ms CRASHED |
| commercial.aggregate | 0 | 0 | 0 | 0ms CRASHED |

## Failures

- [business.lifecycle] `business.lifecycle:baseline:runtime-healthy` — runtime healthy after setup — health: {"database":"healthy","repository":"healthy","runtime":"healthy","authentication":"healthy","authorization":"healthy","cms":"healthy","providers":"healthy","application":"ready"}
- [business.lifecycle] `business.lifecycle:visitor-cascade-archived` — visitor cascade archived
- [business.lifecycle] `business.lifecycle:visitor-cascade-archive-event` — visitor cascade archive event emitted — event "business.visitor:archived" not found (emitted 0 times)
- [business.lifecycle] `business.lifecycle:visitor-cascade-restored` — visitor cascade restored to inactive
- [business.lifecycle] `business.lifecycle:visitor-cascade-deleted` — visitor cascade archived on delete
- [business.lifecycle] `business.lifecycle:reservation-cascade-event` — reservation cascade archive event emitted — event "business.reservation:archived" not found (emitted 0 times)
- [availability.lifecycle] `availability.lifecycle:baseline:runtime-healthy` — runtime healthy after setup — health: {"database":"healthy","repository":"healthy","runtime":"healthy","authentication":"healthy","authorization":"healthy","cms":"healthy","providers":"healthy","application":"ready"}

## Crashed suites

- [visitor.lifecycle] Cannot read properties of null (reading 'id')
- [reservation.lifecycle] availability.isAvailable is not a function
- [commercial.aggregate] Invalid status transition: draft -> published

Report written by tests/reports/generate.js (total 1099ms).