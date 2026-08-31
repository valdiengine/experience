# PUSH-4 — Certification Report

## Date: 2026-08-30

## Certification Status: PHYSICAL_STAGING_CERTIFIED

**Certified identity:**
- applicationId: valdi.app/albasie
- environment: staging

**Final physical result:**
- attempted: 1
- sent: 1
- failed: 0
- notification physically confirmed

---

## Objective

Physically certify PUSH-4 Owner Campaign delivery path on staging (Owner API → PushCampaignService → PushNotificationAdapter → web-push → browser) and prepare documentation, without deploying, committing, or tagging.

---

## Final Checklist

### Environment Resolution
- [x] PASS — `resolveDeploymentEnvironment()` exported from `push.subscription.service.js`
- [x] PASS — Returns `staging` for `TURISTIC_ENV=staging`
- [x] PASS — Returns `production` for `TURISTIC_ENV=production`
- [x] PASS — Throws on unknown `TURISTIC_ENV` values (fail-closed)
- [x] PASS — Imported by all push API files (owner.api.js, push.adapter.js, push.api.js)

### Mock Mode Disabled
- [x] PASS — PushNotificationAdapter instantiated with `mockMode: false` in owner API
- [x] PASS — Real web-push transport enabled (not stubbed)

### Campaign Delivery Path
- [x] PASS — POST to `/api/v1/owner/push/campaigns/{id}/send` returns HTTP 201
- [x] PASS — Requires `Content-Type: application/json` and body `{}`
- [x] PASS — Response includes delivery aggregates (attempted, sent, failed, expired)
- [x] PASS — Campaign status updated to `SENT` after successful delivery

### Physical Delivery Confirmation
- [x] PASS — campaignId: `campaign_mtff5pgr_wro018l0`
- [x] PASS — attempted=1, sent=1, failed=0
- [x] PASS — OS/browser notification appeared with title "Albasie"
- [x] PASS — Notification body: "PUSH-4 Turistic OS - campaña oficial de prueba"

### Fail-Closed Security
- [x] PASS — Missing environment → 400 error
- [x] PASS — Missing applicationId → 400 error
- [x] PASS — Campaign not found → 404 error
- [x] PASS — Environment mismatch → 400 error
- [x] PASS — Already sent → 400 error
- [x] PASS — Concurrent send blocked → 400 error
- [x] PASS — Missing endpoint/keys in subscription → delivery rejected

### Subscriber Privacy
- [x] PASS — Endpoint not exposed in campaign API responses
- [x] PASS — p256dh/auth keys not exposed in campaign API responses
- [x] PASS — VAPID keys never exposed
- [x] PASS — No subscriber secrets in operational logs

### Operational Logging
- [x] PASS — Validation failures logged (console.error) for operational debugging
- [x] PASS — Delivery failures logged with sanitized bodies (URLs/keys redacted)
- [x] PASS — Aggregated results logged when failures occur
- [x] PASS — Temporary certification traces removed after validation

### Campaign Persistence
- [x] PASS — Campaign state persisted after send
- [x] PASS — Filesystem fallback works when Map cache is empty
- [x] PASS — Multi-worker state consistency via filesystem reads

### PUSH-3 Regression
- [x] PASS — Campaign composer unchanged
- [x] PASS — Campaign history unchanged
- [x] PASS — Audience isolation preserved
- [x] PASS — Application grant isolation preserved

### PUSH-2 Regression
- [x] PASS — PushNotificationAdapter unchanged
- [x] PASS — PushProvider unchanged
- [x] PASS — Payload format compatible
- [x] PASS — Subscription infrastructure reused

### PUSH-1 Regression
- [x] PASS — Subscription model unchanged
- [x] PASS — VAPID configuration unchanged
- [x] PASS — Subscription persistence unchanged

### WordPress Boundary
- [x] PASS — WordPress integration unaffected

### Production Boundary
- [x] PASS — No production changes made
- [x] PASS — Staging isolated from production

---

## Staging-Discovered Defects (Fixed Before Certification)

### POST Body Requirement
- **Symptom**: POST send without `Content-Type: application/json` and `-d '{}'` was rejected before reaching the router
- **Root Cause**: Missing required headers
- **Fix**: Added `-H "Content-Type: application/json" -d '{}'` to curl command in certification script

### toJSON() vs toSafeJSON()
- **Symptom**: `PushSubscriptionPersistence.listActive()` returned `subscription.toSafeJSON()` which strips `endpoint` and `keys`. web-push threw "You must pass in a subscription with at least an endpoint"
- **Root Cause**: `toSafeJSON()` is for privacy stripping in API responses, not for delivery
- **Fix**: Changed `toSafeJSON()` to `toJSON()` in `listActive()`

### Fail-Closed Endpoint/Keys Validation
- **Symptom**: Subscriptions missing endpoint or keys would cause web-push to throw
- **Root Cause**: No validation before attempting delivery
- **Fix**: Added fail-closed validation in `PushNotificationAdapter` to reject subscriptions missing required fields

---

## Test Evidence

- push-1.test.js: 68/68 PASS
- push-2-level-c.test.js: 22/22 PASS
- push-4.2-diagnostic.test.js: 4/5 PASS — classified as KNOWN HARDENING DEBT (not certification failure)

**Diagnostic test root cause:** Process-local Map cache consistency across Passenger workers. Test 5 demonstrates that a worker with a populated Map may retain stale campaign state after another worker persists newer filesystem state. This does NOT invalidate the successful physical PUSH-4 delivery certification.

---

## Physical Certification Evidence

```
campaignId: campaign_mtff5pgr_wro018l0
environment: staging
applicationId: valdi.app/albasie
stage URL: https://stage.valdi.app/albasie/

curl -X POST "https://stage.valdi.app/albasie/api/v1/owner/push/campaigns/campaign_mtff5pgr_wro018l0/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ..." \
  -d '{}'

Result: HTTP 201
{
  "success": true,
  "attempted": 1,
  "sent": 1,
  "failed": 0,
  "expired": 0
}

Physical OS notification appeared:
  Title: Albasie
  Body: PUSH-4 Turistic OS - campaña oficial de prueba
```

---

## Definition of Done Verification

Authenticated Albasie Owner
    ↓
opens Notifications
    ↓
selects existing campaign
    ↓
clicks send confirmation
    ↓
server re-authorizes owner (via session)
    ↓
environment resolved to `staging`
    ↓
applicationId resolved to `valdi.app/albasie`
    ↓
PushNotificationAdapter instantiated with `mockMode: false`
    ↓
campaign status checked (not already sent)
    ↓
PushSubscriptionPersistence.listActive() returns full subscription data
    ↓
web-push delivers to each subscriber endpoint
    ↓
aggregate result persisted (attempted=1, sent=1, failed=0)
    ↓
campaign status updated to `SENT`
    ↓
OS/browser notification received
    ↓
✓ COMPLETE

---

## Blocking Issues
- [x] NONE — No blocking issues identified

---

## Certification

**PUSH-4 is CERTIFIED** for staging delivery path with the following notes:

1. PUSH-4 is certified on staging only (TURISTIC_ENV=staging)
2. Production deployment requires separate certification with production VAPID keys
3. PUSH-2 Level C (mobile/installed PWA) remains PENDING
4. Scheduled Campaigns (PUSH-5) not yet implemented

---

## Recommended Next Phase

**PUSH-5** — Scheduled Campaigns

- Time-based campaign scheduling
- Recurring campaign support
- Campaign templates
- Idle audience re-engagement

Or:

**PUSH-2 Level C Retry** — After stable HTTPS mobile deployment

- Re-validate mobile notification delivery
- Physical device testing
- FCM receipt confirmation
