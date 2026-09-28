# APP-ZONE-PWA-1 — Implementation Report

**Status:** READY (code-level, with two documented environment limitations)
**Worktree:** `C:\Users\casa\Documents\app-zone-pwa-1`
**Branch:** `app-zone-pwa-1-overnight`
**Base commit:** `4b2fc99ce9522d74aa8b6622fa856ac47544cd3d`
**Changes:** uncommitted and unstaged, awaiting review. No commit, push, merge, deploy, or tag was performed.

---

## 1. What was delivered

Generic, declarative support for the two **already existing** Engine capabilities
(`installableApp`, `pushNotifications`) on Zone Applications, with
`valdi.app/isla-teja` as the first consumer.

The whole feature is a declaration. There is no new PWA, Service Worker, push,
persistence, or VAPID implementation, and no Zone-specific Engine branch. Every
new behavior is routed through the existing composition pipeline:
`route declaration → ConfigurationLoader → ApplicationResolver → CapabilityComposer → CapabilityValidator → presentation → existing PWA/push infrastructure`.

### 1.1 The root problem

Zone routes previously had **no way to declare capabilities**. `ApplicationResolver#buildRouteData`
only read capabilities from a company config, and fell back to untrusted `request.capabilities`:

```js
capabilities: Object.keys(companyData.capabilities).length > 0
  ? companyData.capabilities
  : (request.capabilities || {}),
```

A Zone has no company config, so the first consumer could only obtain these capabilities from
request input — i.e. the identity and availability of the capability were client-controlled.
That is precisely what the milestone forbids.

### 1.2 The fix: a generic route-level capability seam

`web/application/application.resolver.js` gained `#loadRouteCapabilities(domain, path)`, which reads
`ROUTE_CONFIG.routes[].capabilities` and merges it into the normal composition path. The returned
map is **not interpreted** — the existing loader, composer and validator still decide what is
enabled and still fail closed.

The merge preserves the previous precedence exactly:

| Company caps | Request caps | Result |
| --- | --- | --- |
| present | — | `{ ...routeCaps, ...companyCaps }` |
| absent | present | `{ ...routeCaps, ...requestCaps }` |
| absent | absent | `{ ...routeCaps }` |

Mirrors the existing zone declarative contract (`zoneNavigation`, `zoneContent`, `zonePresentation`),
so **any** Application type can now declare existing capabilities without Engine changes.

---

## 2. Files changed

| File | Change |
| --- | --- |
| `web/application/application.resolver.js` | Generic `#loadRouteCapabilities` seam + precedence-preserving merge |
| `web/routing/route.config.js` | `installableApp` + `pushNotifications` declaration for `/isla-teja` |
| `web/application/application.presentation.adapter.js` | Zone PWA identity derived from the resolved Application; removed the `company.slug \|\| 'albasie'` fallback |
| `web/middleware/pwa.middleware.js` | Capability-gated, fail-closed manifest/SW; resilient precache |
| `web/rendering/html.renderer.js` | Push UI gated on `pushNotifications`; removed `/sw-albasie.js` + `/albasie/` fallbacks |
| `web/business/push/push.api.js` | Server-side push capability gate (403 `PUSH_NOT_ENABLED`) on subscribe/unsubscribe/status |
| `companies/cl/los-rios/valdivia/albasie/config.js` | Explicit `pushNotifications` declaration (behavior preservation, see §5) |
| `public/offline.html` | **New** generic dependency-free offline fallback |
| `web/app-zone-pwa-1.test.js` | **New** focused suite, 34 tests |
| `web/config-authority.test.js` | One assertion updated to the new fail-closed contract (see §4.1) |

`push.subscription.service.js`, the persistence layer, the capability registry, and every Booking
file are **unmodified**.

---

## 3. Behavior delivered

### 3.1 Zone PWA identity (was a foreign identity)

Previously a Zone produced `company.slug || 'albasie'`, so a Zone page advertised Albasie's
Service Worker URL and scope. Now:

- appId: `valdi.app/isla-teja`
- manifest: `/pwa/valdi__DOT__app__SLASH__isla-teja/manifest.json`
- Service Worker: `/sw-isla-teja.js`
- scope / start URL: `/isla-teja/`
- cache prefix: `app-cache-valdi_app_isla_teja-`
- theme `#3a7d66` (reuses the existing `zonePresentation` token — no new visual identity)

If no slug can be derived at all, the adapter returns `enabled: false` rather than inventing one.

### 3.2 Fail closed instead of fabricating identity

`pwa.middleware.js` now resolves the owning Application and requires
`installableApp.enabled === true` for both the manifest and the Service Worker. Without that it
returns 404. It no longer falls back to a synthesized Valdi manifest. Scope, offline fallback,
icons and identity all come from the resolved configuration.

**Side effect fixed:** the Service Worker precache used `cache.addAll([...])`. `/isla-teja/index.html`
does not exist, so a single 404 rejected the whole `install` event, the worker never activated, and
the Application was **not installable**. Precache now uses `Promise.allSettled`, so an individual miss
cannot prevent activation. The precache list still contains only `APP_SCOPE`,
`APP_SCOPE + 'index.html'` and `OFFLINE_URL` — no API, reservation, or other Application's URLs.

### 3.3 Push is a separate capability

Push was previously granted implicitly to any installable Application, so the activation button was
gated by the wrong capability. It is now gated on `pushNotifications`, and the endpoints enforce it
server-side:

- `handleSubscribe`, `handleUnsubscribe`, `handleGetStatus` → 403 `PUSH_NOT_ENABLED` unless the
  resolved Application declares `pushNotifications.enabled === true`
- `GET /api/v1/push/public-key` deliberately left unchanged (it is global config, not identity-scoped)
- Client Application identity is no longer sent in the body; the payload is `{ endpoint, keys }`
- Dead `resolveApplicationId()` removed — it resolved identity without the loader or the capability
  check and was reachable by future callers

---

## 4. Findings and deliberate deviations

### 4.1 `web/config-authority.test.js` — updated assertion (behavior change, intentional)

Test 6, *"Domain mismatch in encoded slug safely fails"*, asserted the **fail-open** contract: for
`/pwa/valdi__DOT__app__SLASH__albasie/manifest.json` on host `malicious.app` it expected a fabricated
manifest (`name === 'Valdi App' || 'Albasie'`).

That is the untrusted-identity path, so the assertion now expects the fail-closed contract
(404, no other Application's manifest, no fabricated manifest). The test's stated intent — *"not
crash"* — is preserved. Flagging explicitly because it changes an existing expectation.

### 4.2 Zone composition works through `experience.type`, not identity type

`isla-teja` is composed via `experience.type === 'tourism-destination'`, and both capabilities list
`tourism-destination` in `compatibleApplicationTypes`. Therefore **no change to the capability
registry was needed or made** — in particular `'zone'` was deliberately **not** added. Verified:

```
pushNotifications: ["company-profile","tourism-destination","accommodation","restaurant",
                    "tour","real-estate","boat","professional-service"]
installableApp:    (identical list)
```

`'zone'` is absent from both, and the `tourism-destination` entry is what makes the Zone compose.

### 4.3 Test wiring must inject `ConfigurationLoader`

`createApplicationResolver()` without a loader never reads company capabilities. Production
(`web.server.js`) injects one, so the focused tests mirror that wiring; otherwise the Albasie
preservation assertions would silently test nothing.

### 4.4 Only pre-existing icon assets exist

`/icons/icon-192.png` and `/icons/icon-512.png` (the generic defaults) do not exist in the repo. The
only served icons are `/apps/valdi/albasie/icons/`. Isla Teja therefore reuses that existing set, as
the task permitted ("use only existing icons/colors/shared app icon set"). This is a reused shared
asset set, not a new or derived visual identity.

### 4.5 Pre-existing cross-app defaults left alone (out of scope)

`html.renderer.js` still contains pre-existing quote/Booking bootstrap defaults
(`apiConfig.company || 'albasie'`, `apiConfig.applicationId || 'valdi.app/albasie'`). These belong to
the quote/Booking subsystems, are unrelated to PWA/push, and the task requires Booking behavior to be
preserved exactly. They are recorded here rather than changed. They should be tracked separately.

### 4.6 Client-supplied `Origin`/`Referer` is not unforgeable

The push endpoints derive the Application target from the request `Origin`/`Referer` and then
verify the capability server-side. Capability gating means a caller can only reach an
**enabled** Application — an undeclared Application is unresolvable for push. But this is not
authentication: a non-browser client can still target any *enabled* Application ID and can
cross-subscribe. This is a limitation, not a claim of identity proof.

---

## 5. Albasie behavior preservation

Albasie already served the push activation button — but only *because* it was installable, not
because it declared push. Gating push on its own capability would have silently removed that
existing UI, so `pushNotifications: { enabled: true }` is now declared explicitly.

Net effect: identical rendered behavior, but the surface is now authorized by the correct
capability. Verified by the Albasie preservation tests in the new suite.

---

## 6. Test results

### 6.1 New focused suite — `web/app-zone-pwa-1.test.js`

**34 passed, 0 failed** *(count at milestone completion; superseded by §10.1 — the focused suite now
runs 42 after the offline-serving remediation. The original 34 did **not** include serving evidence,
which is the gap §10 records.)* Covers declaration, composition, Zone identity, manifest/SW fail-closed
behavior, cached-asset/offline-page presence, resilient precache, precache scope containment,
renderer push gating, and the three push API capability gates.

### 6.2 Required regressions — all green

| Suite | Result |
| --- | --- |
| `web/app-zone-pwa-1.test.js` | 34 / 34 |
| `web/pwa-1.test.js` | 22 / 22 |
| `web/push-2-level-c.test.js` | PASSED |
| `web/config-authority.test.js` | 6 / 6 |
| `web/zone-presentation.test.js` | 11 / 11 |
| `web/zone-navigation.test.js` | 12 / 12 |
| `web/zone-navigation.tabs-2.test.js` | 13 / 13 |
| `experience/content/zone.content.test.js` | 14 / 14 |
| `experience/presentation/zone.presentation.test.js` | 17 / 17 |
| `experience/navigation/zone.navigation.test.js` | 17 / 17 |
| `web/visual-identity.test.js` | 27 / 27 |
| `web/owner-1.test.js` | 40 / 40 |
| `web/mvp-first-visual-1.test.js` | 22 / 22 |
| `web/mvp-booking-ui-1.test.js` | 9 / 9 |
| `web/booking-widget-availability.test.js` | 42 / 42 |
| `web/ensueno-booking-1.test.js` | 37 / 37 |
| `web/mvp-availability-reservation-1.test.js` | 38 / 38 |

### 6.3 PUSH-1 registry contracts verified out-of-band

`web/push-1.test.js` **cannot run in this worktree** — it imports `web/admin/admin.auth.js`, which
is **absent from git `HEAD` (a pre-existing baseline gap)**, not from these changes. That file exists
only as uncommitted foreign work in the main tree, and copying it in was not done.

`web/push-1.test.js` tests the capability registry, the push models, and `push.subscription.service.js`
— **not** `pushAPI`. Since it cannot run, those four registry contracts were verified directly
against the registry (6/6 pass, §4.2): the capability exists, is distinct from `installableApp`,
has no required dependencies, and is compatible with every pilot type with `'zone'` correctly absent.
`push.subscription.service.js` — the layer PUSH-1 exercises most — is unmodified by this work.

### 6.4 BLOCKED: `web/push-3.test.js`

Requires a **physical PostgreSQL** instance; it attempts `connect ECONNREFUSED 127.0.0.1:5432` and
dies without producing a result. No real database was used, as required. Not runnable locally.

---

## 7. Verification limitations (environment, not code)

- **No browser installability audit.** Installability was verified structurally (manifest content,
  SW registration, scope, precache resilience, icon reachability) — not with Chrome DevTools or
  Lighthouse. The `addAll` → `allSettled` fix addresses a real activation blocker that only a live
  browser would otherwise have exposed.
- **No real push delivery.** No VAPID keys, no push provider, no network sends. The push work is
  limited to authorization and payload identity.
- **No physical database** (see §6.4). No migrations or seed data.
- **Dependencies:** installed with `npm ci --offline` inside the isolated worktree (32 packages from
  the local cache). `package.json` and `package-lock.json` are **unmodified** — confirmed via
  `git status --porcelain`.
- The dirty main tree `C:\Users\casa\Documents\desarrollo dronesss` was never touched, and
  `docs/ai/CURRENT_STATE.md` was not edited.

---

## 8. Proposed `CURRENT_STATE` entry (not applied)

> **APP-ZONE-PWA-1** — `installableApp` and `pushNotifications` are now declarable on Zone
> Applications. `ApplicationResolver` reads `ROUTE_CONFIG.routes[].capabilities` into the existing
> loader→composer→validator pipeline (`valdi.app/isla-teja` is the first consumer; no registry
> change was needed because Zones compose as `tourism-destination`). PWA identity is derived from the
> resolved Application — the `company.slug || 'albasie'` fallback is gone — and the PWA middleware now
> fails closed (404) instead of fabricating a manifest, with a `Promise.allSettled` precache so one
> missing URL cannot block Service Worker activation. Push UI and the subscribe/unsubscribe/status
> endpoints are gated on `pushNotifications`; Albasie declares it explicitly to preserve its existing
> UI. Generic `public/offline.html` added. Focused suite 34/34; 17 required suites green including
> all Booking regressions. Not verifiable locally: browser install audit, real push delivery, and
> `push-3` (needs a physical DB). `push-1` cannot run — `web/admin/admin.auth.js` is missing from
> `HEAD` at baseline, unrelated to this work; its registry contracts were verified directly.

---

## 9. Recommended follow-ups (not in scope here)

1. Resolve the pre-existing `web/admin/admin.auth.js` gap in git so `push-1` is runnable.
2. Track the pre-existing quote/Booking `albasie` bootstrap defaults (§4.5) in their own milestone.
3. Consider real per-zone icon assets; §4.5's shared set is a reuse, not a Zone identity.
4. Run a Lighthouse/Chrome installability audit and an authenticated push delivery test in an
   environment that has a browser, VAPID keys, and PostgreSQL.

---

## 10. Offline fallback serving remediation (post-review)

Surgical follow-up to the milestone above. The milestone was **not** restarted or redesigned; PWA
architecture, capability declarations, and the generated Service Worker are unchanged.

### 10.1 The certification gap that was discovered

Manual review found the milestone asserted something it had not proven.

Isla Teja declares `offlineFallback: '/offline.html'`, the generated worker correctly emits
`OFFLINE_URL = '/offline.html'`, and `public/offline.html` exists. **But no middleware served
`/offline.html` over HTTP.** `web/web.server.js` mounted only:

- `createStaticMiddleware` — `public/static` under `/static`
- `createFaviconMiddleware` — `/favicon.ico`, `/favicon.png`
- `createManifestMiddleware` — `/manifest.json`

`public/` was never mounted as a general static root, so the worker's precached `OFFLINE_URL` would
have returned 404 in production. The offline document existed on disk and was unreachable.

The original test **§6.1 "declared offline fallback exists on disk"** only asserted
`fs.existsSync('./public/offline.html')`. That is disk presence, not HTTP serving — the test passed
while the capability was broken. This violated the requirement that the offline resource be
**actually servable**.

Note this interacted with the `allSettled` precache fix from the milestone: because install tolerates
individual misses, a 404 on `OFFLINE_URL` would **not** fail install. The worker would activate and
cache nothing for the offline route, so the regression was silent.

### 10.2 Root cause

The milestone added the offline **asset** and the worker **reference** to it, but the delivery layer
step — exposing the platform resource at its declared path — was never implemented. The gap was
invisible to the test suite because no test drove the middleware contract for this route.

### 10.3 Exact remediation

Four files, all inside the isolated worktree. No new subsystem, no architecture change.

| File | Change |
| --- | --- |
| `web/middleware/static.middleware.js` | Added `createOfflineMiddleware` (+71) and exported it from the module's default export object |
| `web/index.js` | Added `createOfflineMiddleware` to the public web-delivery re-export |
| `web/web.server.js` | Imported and mounted `createOfflineMiddleware({ root: this.#config.publicRoot, maxAge: 3600 })` between the favicon and manifest middleware |
| `web/app-zone-pwa-1.test.js` | Added §5 "served, not merely present on disk" (8 tests) with a local mock `Writable`; renumbered the following sections 6 and 7 |

`createOfflineMiddleware` contract:

- default root `resolve(process.cwd(), 'public')`, matching `createFaviconMiddleware` / `createManifestMiddleware`
- handles **exactly one route**, `/offline.html`; every other path returns `next()`
- resolves **only** `public/offline.html`. The filename is a module constant
  (`OFFLINE_FILENAME`) with no path separators, so **no user-controlled value ever reaches the
  filesystem**; a `normalize` + containment check is retained as defence in depth
- a query string is stripped before the literal comparison (it is only ever compared, never joined
  into a path), so `/offline.html?v=1` is still served
- `!existsSync` → `next()`; `stat.isFile()` is required, otherwise `next()`
- `200` with `Content-Type: text/html; charset=utf-8`, reused from the existing
  `mimeTypes['.html']` contract in `web/middleware/mime.types.js` — **no new MIME subsystem**
- `Content-Length` from `stat.size`; `X-Content-Type-Options: nosniff`
- `Cache-Control: public, max-age=3600` — deliberately **not** the one-year `immutable` asset policy
  used by `createStaticMiddleware`, because this is a runtime fallback, not a fingerprinted artifact
- streamed with `createReadStream(...).pipe(res)`, the same framework-free pattern as the static and
  favicon middleware
- a stream `error` handler returns a generic 500 (or closes the response if headers are already
  sent), so a filesystem detail can never reach the client; synchronous setup failures fall through
  to `next()`

**`public/` was deliberately not exposed as a generic static root.** The pre-existing generic mount
is untouched (`root: this.#config.staticRoot`, `prefix: '/static'`). The new mount declares no
`prefix` and handles one fixed path. A test asserts both facts against the real `web.server.js`
source (§10.4).

### 10.4 Serving evidence — the new tests

The disk-existence test remains; it is simply no longer the whole claim. The new tests drive the
real middleware against a real streamed file, using a purpose-built mock `Writable` defined **in the
test file** — production code was not modified to make the test easier.

Focused suite: **42 passed, 0 failed** (was 34; +8).

| Test | Proves |
| --- | --- |
| `/offline.html` is handled and returns 200 with HTML content | handled (not `next()`), `200`, `text/html`, `nosniff`, non-empty streamed body, contains `<!DOCTYPE html>`, **streamed text is byte-equal to `public/offline.html`**, `Content-Length` matches the real file size |
| the served offline document stays generic | served body contains neither `isla-teja` nor `albasie` |
| short-lived cache policy | `Cache-Control` set, **not** `immutable`, **not** `max-age=31536000` |
| query string does not break the route | `/offline.html?v=1` still served |
| **the `OFFLINE_URL` the worker precaches is the URL actually served** | extracts `OFFLINE_URL` from the real generated `sw-isla-teja.js`, feeds that exact URL to the middleware, asserts `200` and not `next()` — this is the end-to-end contract that was previously unproven |
| an unrelated public-root file that exists on disk is NOT served | `public/apps/valdi/albasie/icons/icon-192.png` (verified to exist) falls through with no headers and no body |
| the middleware is not a generic public directory server | 14 paths fall through, including `/`, `/index.html`, `/offline.htm`, `/offline.html.bak`, `/OFFLINE.HTML`, `/apps/…`, `/favicon.ico`, `/manifest.json`, `/static/style.css`, `/../package.json`, `/..%2fpackage.json`, `/offline.html/../../package.json` |
| server mount uses `publicRoot` without a generic static root | offline mount block contains `root: this.#config.publicRoot` and no `prefix:`; the generic `createStaticMiddleware` block still uses `root: this.#config.staticRoot` + `prefix: '/static'` and does **not** reference `publicRoot` |

### 10.5 Regression results after the remediation

All suites below were executed in this worktree after the fix. No Stage, no SSH, no PostgreSQL, no
real push sends.

| Suite | Result |
| --- | --- |
| `web/app-zone-pwa-1.test.js` | **42 / 42** (was 34) |
| `web/pwa-1.test.js` | 22 / 22 |
| `web/config-authority.test.js` | 6 / 6 |
| `web/zone-presentation.test.js` | 11 / 11 |
| `web/zone-navigation.test.js` | 12 / 12 |
| `web/zone-navigation.tabs-2.test.js` | 13 / 13 |
| `web/push-2-level-c.test.js` | PASSED (0 failed) |
| `web/visual-identity.test.js` | 27 / 27 |
| `web/owner-1.test.js` | 40 / 40 |
| `web/mvp-first-visual-1.test.js` | 22 / 22 |
| `web/mvp-first-visual-2.test.js` | PASSED (0 failed) |
| `web/mvp-first-visual-3.test.js` | PASSED (0 failed) |
| `web/mvp-first-visual-4.test.js` | PASSED (0 failed) |
| `web/booking-widget-availability.test.js` | 42 / 42 |
| `web/ensueno-booking-1.test.js` | 37 / 37 |
| `web/mvp-availability-reservation-1.test.js` | 38 / 38 |
| `web/mvp-booking-ui-1.test.js` | 9 / 9 |

The shared-Product-file Booking suites are green, so `web/rendering/html.renderer.js` and the
Booking delivery path remain safe.

### 10.6 Service Worker contract — unchanged

`web/middleware/pwa.middleware.js` was **not modified** by this remediation. Verified still intact,
and re-asserted by the focused suite:

- Isla Teja scope `/isla-teja/`; Albasie scope `/albasie/` unchanged
- offline fallback remains `/offline.html`; `OFFLINE_URL` unchanged
- cache prefix remains Application-scoped: `app-cache-{appIdNorm}-`, `CACHE_NAME = APPLICATION_CACHE_PREFIX + 'v1'`
- cache cleanup remains prefix-scoped (`name.startsWith(APPLICATION_CACHE_PREFIX) && name !== CACHE_NAME`)
- install resilience unchanged: `Promise.allSettled` precache, `skipWaiting()`, `clients.claim()`
- precache list still exactly 3 resolved entries, all Application-scoped or the platform offline resource

### 10.7 Remaining limitations

Unchanged from §7 — the remediation did not close these:

- **No browser installability audit** and no live offline-navigation test. The serving path is proven
  at the middleware/HTTP-contract level, not through a real Service Worker fetch in a browser.
- **No real push delivery**; unchanged.
- **`web/push-1.test.js` still cannot run** — re-confirmed in this pass: `ERR_MODULE_NOT_FOUND` for
  `web/admin/admin.auth.js`, absent from `HEAD` at the pinned baseline. Pre-existing; not introduced
  here, and no unrelated architecture was changed to make it pass.
- **`web/push-3.test.js` still cannot run** — re-confirmed: `ECONNREFUSED` against local PostgreSQL
  (`::1:5432`). No physical database was used.
- Because the worker's install uses `allSettled`, a future regression that made `/offline.html`
  unserveable would **still** not fail install. The new serving test is the guard for that; a
  browser-level assertion would be the stronger long-term guard.
- `web/mvp-booking-ui-1.test.js` runs **9 tests** in this worktree while `docs/ai/CURRENT_STATE.md`
  records **52 / 52** for the same filename. Unresolved discrepancy, noted read-only; not investigated
  here and not caused by this remediation.
- Git still warns that `web/config-authority.test.js` will be CRLF-normalized on next checkout.
  Pre-existing, unrelated to this remediation, and worth settling before any commit.
- `docs/ai/CURRENT_STATE.md` was **not** edited. §8 remains a proposal only.
