# APP_ZONE_TABS_MOBILE_1 — Report

**Status: PHYSICAL_RETEST_PASSED**

> **Milestone history.** Sections 1–7 below are the ORIGINAL `APP-ZONE-TABS-MOBILE-1`
> investigation and are preserved verbatim. Its conclusion was `DISCOVERY_BLOCKED`, and
> **that conclusion was correct given the evidence available at the time**: repository and
> static analysis could not reproduce the device symptom, and refusing to guess was the right
> call. Section 8 onward is the separate `APP-ZONE-TABS-MOBILE-1B` milestone, opened by new
> physical browser evidence. The original report is **not** retracted.

No production code was modified. The root cause of the reported mobile defect
(*"the APP ZONE navigation tabs are not visibly presented as expected"*) could
**not** be proven from the repository at the required baseline, so the
remediation gate was never opened.

---

## 1. Baseline and isolation

| Item | Value |
| --- | --- |
| Baseline commit | `b6c0d3bd00e492faf0813992ac3ebcb6f43749a6` |
| Branch | `app-zone-tabs-mobile-1` |
| Worktree | `C:\Users\casa\Documents\app-zone-tabs-mobile-1` |
| `HEAD` at end | `b6c0d3bd00e492faf0813992ac3ebcb6f43749a6` (verified) |
| `git status --porcelain` at end | empty (clean) |
| Files changed | none |
| Commits / pushes / merges / deploys | none |
| Stage / infra / DB / network / SSH | not touched |

Dirty main worktree and the APP ZONE PWA integration worktree were not touched.
The separate `booking-pricing-1a` worktree was not touched.

---

## 2. Why the outcome is DISCOVERY_BLOCKED

Every CSS rule in the real rendered `/isla-teja` page was enumerated and
analysed. **No rule, at any viewport, can hide the zone navigation tabs.** The
markup is emitted, correctly scoped, uncollapsed, unclipped, unoccluded, and
geometrically visible on a narrow viewport. Therefore the reported symptom is
not reproducible from this baseline, and any code change would be a guess.

### 2.1 Markup is present and correct in real SSR

`web/templates/component.templates.js:704-764` (`renderZoneNavigation`).
Verified in the actual rendered output of the full pipeline
(`ApplicationPresentationRenderer` → `HtmlRenderer`):

```html
<section class="zone-nav zn-valdi-app-isla-teja-isla-teja-main"
         id="zn-valdi-app-isla-teja-isla-teja-main-nav"
         data-zone-nav data-zone-layout="tabs"
         data-zone-scope="valdi.app/isla-teja::isla-teja-main"
         aria-label="Explorar">
  <div class="zone-nav-container">
    <h2 class="zone-nav-title">Explora</h2>
    <div class="zone-nav-rail">
      <ul class="zone-nav-tabs">
        <li><a class="zone-nav-tab is-active" ... data-zone-tab="descubre">Descubre</a></li>
        <li><a class="zone-nav-tab"        ... data-zone-tab="gastronomia">Gastronomía</a></li>
        <li><a class="zone-nav-tab"        ... data-zone-tab="alojamientos">Alojamientos</a></li>
        <li><a class="zone-nav-tab"        ... data-zone-tab="actividades">Actividades</a></li>
        <li><a class="zone-nav-tab"        ... data-zone-tab="servicios">Servicios</a></li>
        <li><a class="zone-nav-tab"        ... data-zone-tab="mapa">Mapa</a></li>
      </ul>
    </div>
    ...
```

All six tabs are present with `is-active` on the first, an `<h2>Explora</h2>`
heading is present, and no `hidden`/`aria-hidden`/`<details>` wrapper exists.

### 2.2 No clipping ancestor

Actual ancestor chain of `.zone-nav`:

```
html > body[data-application-scope] > main#main-content > section.zone-nav
```

* `body` — `margin: 0; padding: 0;` only (`web/rendering/design.tokens.js:177`).
* `html` — font sizing / smoothing only.
* `main#main-content` — **no CSS rule at all**.
* No `overflow: hidden`, `overflow-x`, `contain`, or `clip` on any ancestor.

### 2.3 No global rule hides the tabs

All **244** rules from all **3** `<style>` blocks of the rendered page were
parsed. Every rule whose selector mentions `zone-nav` is scoped to
`.zn-valdi-app-isla-teja-isla-teja-main` and none of them sets `display`,
`visibility`, `opacity`, `transform`, or a hiding `position` on `.zone-nav`,
`.zone-nav-rail`, `.zone-nav-tabs`, or `.zone-nav-tab`.

The complete set of `display: none` rules on the page is:

| Rule | Relevance |
| --- | --- |
| `.mobile-nav-toggle` (base, hidden at ≥768px) | unrelated |
| `.nav-menu` (mobile menu, hidden at ≤767px) | unrelated |
| `.is-enhanced .zone-nav-panel` | hides the 5 **inactive panels**, never tabs |
| `.hidden`, `.md\:hidden`, `.lg\:hidden` | utility classes, not applied here |
| `.quote-status[hidden]`, `.booking-state[hidden]` | unrelated |

The only unscoped (element-level) rules in the whole document are `a`,
`ul, ol`, `h1…h6`, `p` resets — all benign, none touching overflow or
visibility.

### 2.4 No overlay can cover the rail

The **only** `position: fixed` declaration in the entire CSS + inline JS is the
push-notification FAB (`web/rendering/html.renderer.js:1885`):
`position:fixed; bottom:20px; right:20px; z-index:1000`. It is a small
bottom-right button and cannot cover a full-width tab rail.
`.site-header` is `position: relative` and its dropdown is closed by default.
No `100vh` / `100dvh` / `100svh` / `inset` anywhere.

### 2.5 Mobile geometry proves the first tab is visible

Real token values from the rendered page:
`--spacing-md: 1rem` (16px), `--spacing-lg: 1.5rem` (24px),
`--layout-max-width: 1200px`, viewport meta
`width=device-width, initial-scale=1`.

At a 390px-wide viewport:

1. `.zone-nav` padding = `var(--spacing-section) var(--spacing-md)`
   → 16px per side.
2. `.zone-nav-container` width = 390 − 32 = **358px** (`max-width: 1200px`,
   `margin: 0 auto`, no padding).
3. `.zone-nav-rail` has `margin-left/-right: calc(var(--spacing-md) * -2)`
   (−32px each) **and** `max-width: 100%`. Auto width is
   `358 + 32 + 32 = 422px`, then clamped by `max-width: 100%` to **358px**;
   the resulting over-constrained equation resolves `margin-right` to **+32px**.
   Rail box = `x ∈ [−16, 342]`.
4. Tab content ≈ 828px (≈440px of text across 55 characters + 6 × 50px
   padding/border + 40px gaps + 48px `ul` padding).
5. So at `scrollLeft 0` the rail shows ≈ 43 % of the strip (**≈2.5 tabs**) with
   the first tab fully visible; the remainder is reachable by horizontal
   scroll (`overflow-x: auto`).

The tabs are therefore *available* on mobile. The only genuine mobile
discoverability weakness is that `scrollbar-width: none` and
`.zone-nav-rail::-webkit-scrollbar { display: none }` suppress the scrollbar,
so the horizontal affordance is not visually obvious — which is a
discoverability observation, **not** an absence of tabs.

### 2.6 Progressive enhancement only hides panels

`web/rendering/html.renderer.js:1639-1767` emits the enhancement script only when
`viewModel.zoneNavigation` exists. It enhances each `[data-zone-nav]`
independently, requires a matching tab/panel count and `.zone-nav-tabs`, and
applies `is-enhanced` plus `is-active` on the hash target or the first tab. It
never touches `.zone-nav-rail`, `.zone-nav-tabs`, or tab visibility. With JS
disabled the SSR output keeps all six panels and all six tabs visible.

### 2.7 Rendering is not device-dependent

`web/rendering/html.renderer.js:357-399` (`renderBody`) orders sections
unconditionally: hero → zone nav → categories → featured → services → gallery →
companies → quote → booking → contact. The zone-nav HTML is identical on every
device; only `@media (max-width: 767px)` rules differ.

**Consequence worth flagging:** the reported observation showed *categories*
visible but zone tabs absent. `.categories` renders immediately **after** the
zone nav, so that combination is geometrically impossible in this baseline. The
observation therefore likely came from a different commit/deploy, a different
served asset version, or a mis-attributed screenshot.

---

## 3. Two confirmed adjacent defects (deliberately NOT fixed)

Both are real, generic, and proven — but neither can produce the reported
symptom, and both are out of the stated scope (no zone-nav redesign, no mobile
nav modification). They are reported for an explicit follow-up decision.

### D1 — mobile rail bleed is self-contradictory

`web/rendering/html.renderer.js` — mobile block
(`.zone-nav-rail { margin-left: calc(var(--spacing-md) * -2); margin-right: calc(var(--spacing-md) * -2); }`).

The negative margins are meant to bleed the rail to the section's padding
edges, but the same rule also carries `max-width: 100%` on the base
`.zone-nav-rail` declaration, which clamps the width back to the already-padded
containing block. The bleed therefore never happens: the rail is shifted
**16px left of the viewport** (producing page-level horizontal scroll) with
**48px of dead gutter** on the right. Mobile-only misalignment, not hiding.

### D2 — `--color-text-muted` is never defined

* Authored key: `textMuted` (`web/rendering/design.tokens.js:17`, `:147`).
* Both emitters interpolate the key verbatim:
  `web/rendering/design.tokens.js:90` and
  `web/rendering/html.renderer.js:1606` → `--color-textMuted: #666666`.
* Consumers reference `var(--color-text-muted)`, which is **undefined
  repo-wide** (verified by full-repo search).

Per CSS Custom Properties, those `color` declarations are invalid at
computed-value time, so `color` becomes `unset` and is **inherited**. The 13
affected rules are:

```
.text-muted
.company-location
.gallery-item figcaption
.contact-action-value
.quote-header p
.quote-option-price
.quote-line-item
.booking-header p
.zn-… .zone-nav-panel p
.zn-… .zone-content-lead
.zn-… .zone-content-paragraphs p
.zn-… .zone-content-item-description
.zn-… .zone-content-map-coords
```

The ZonePresentation application scope only overrides
`--color-primary`, `--color-secondary`, `--color-accent`
(`web/rendering/html.renderer.js:1592-1617`), so it never supplies the missing
variable either. Net effect is wrong/inherited muted text colour (a contrast
regression across site-wide components) — never invisibility.

---

## 4. Regression gap

Every zone suite passes at baseline, yet **none of them asserts layout**:
they are string / DOM-shape assertions over SSR output. There is no
browser, DOM, or viewport harness in the repository — `package.json`
dependencies are only `drizzle-orm`, `pg`, `web-push` (no jsdom, Playwright,
Puppeteer, or a CSS layout engine). Consequently:

* the reported visual symptom cannot be reproduced locally, and
* even after a fix, no existing test could guard the mobile geometry.

Any future fix in this area needs a layout-capable harness, which is a
deliberate scope decision, not something to smuggle into a hotfix.

---

## 5. Verification performed

### 5.1 Green suites

| Suite | Result | Exit |
| --- | --- | --- |
| `web/zone-navigation.test.js` | 12/12 passed | 0 |
| `web/zone-navigation.tabs-2.test.js` | 13/13 passed | 0 |
| `web/zone-presentation.test.js` | 11/11 passed | 0 |
| `experience/navigation/zone.navigation.test.js` | 17/17 passed | 0 |
| `experience/content/zone.content.test.js` | 14/14 passed | 0 |
| `experience/presentation/zone.navigation.tabs.test.js` | 9/9 passed | 0 |
| `experience/presentation/zone.presentation.test.js` | 17/17 passed | 0 |
| `web/app-zone-pwa-1.test.js` | 42/42 passed | 0 |
| `web/booking-widget-availability.test.js` | 42/42 passed | 0 |
| `web/mvp-booking-ui-1.test.js` | passed | 0 |
| `web/config-authority.test.js` | 6/6 passed | 0 |

APP ZONE assertion total across the eight zone/PWA suites: **135 passed,
0 failed**.

### 5.2 Suite not runnable

`web/ensueno-booking-1.test.js` — **NOT RUNNABLE** in this worktree:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'pg' imported from
  C:\Users\casa\Documents\app-zone-tabs-mobile-1\database\connection\postgres.connection.js
```

The new worktree has no `node_modules`, and dependency installation is
forbidden by the milestone constraints. The historical 37/37 result for this
suite therefore could not be reproduced or re-verified here.

### 5.3 Historical counts

The briefed historical figures (**APP ZONE 84/84**, **Booking 117/117 =
42 + 37 + 38**) could **not** be reproduced exactly from these files. The
actual per-file counts are tabulated in §5.1/§5.2. The discrepancy is
consistent with the briefing aggregating a different file set, but it was not
resolved within this milestone.

---

## 6. Exact runtime evidence still required

To lift `DISCOVERY_BLOCKED`, please supply:

1. **The mobile screenshot itself** (image or source URL). The described
   observation (categories visible, zone tabs absent) is impossible in this
   baseline because categories render immediately after the zone nav.
2. **The exact commit SHA / deploy id** of the page that was observed.
3. **Confirmation the served HTML matches baseline** — response body of
   `/isla-teja` from the affected environment.
4. **Device viewport width** used for the observation, and whether page-level
   horizontal scrolling was present (predicted by D1).
5. **Whether JS was enabled.** With JS, `is-enhanced` hides the 5 inactive
   panels; without JS, all 6 panels and all 6 tabs show.
6. **A DOM dump from the affected device:**
   * `document.querySelector('.zone-nav').outerHTML`
   * `getComputedStyle` for `.zone-nav-rail`, `.zone-nav-tabs`, and
     `.zone-nav-tab:first-child` (`display`, `visibility`, `opacity`,
     `overflow-x`, `width`, `transform`)
   * `document.scrollingElement.scrollWidth` vs `clientWidth`
   * `document.querySelectorAll('.zone-nav-tab').length`
7. **Whether a service worker / cached stylesheet** was serving stale CSS on
   that device (the app ships a PWA service worker).

---

## 7. Constraint compliance

* No production code modified — remediation gate respected.
* No redesign of the zone navigation or mobile nav; no information-architecture
  or presentation change; no legacy `.categories` change.
* PWA, Booking, Contact, Notifications and install-UI behaviour untouched.
* `docs/ai/CURRENT_STATE.md` not edited.
* No commit, push, merge, deploy, dependency install, network/SSH, database
  access, provisioning, or application bootstrap.
* No files left modified in the worktree.

---

# 8. APP-ZONE-TABS-MOBILE-1B — Physical Browser Evidence & Minimal CSS Remediation

Sections 1–7 above are the **original** `APP-ZONE-TABS-MOBILE-1` investigation and are
preserved unchanged. Their `DISCOVERY_BLOCKED` conclusion **was correct** for the evidence
available at the time: repository and static analysis could not reproduce the device
symptom, so refusing to guess was the right call. This milestone was opened by new physical
browser evidence and does not retract that report.

**Status of this milestone: `PHYSICAL_RETEST_PASSED`.**

Sections 8.1–8.18 are preserved as written at handoff and are **not** edited by the certification
record appended in §8.19. In particular §8.1 still records the pre-remediation FAIL results, which
remain valid history; §8.19 records the post-remediation physical retest that supersedes them.

## 8.1 New physical evidence (authoritative)

Real-device tests against `https://stage.valdi.app/isla-teja`:

| Test | Result | Note |
| --- | --- | --- |
| Desktop browser | PASS | ZoneNavigation tabs visible |
| Desktop browser + mobile viewport emulation | PASS | Visible at multiple mobile viewport sizes |
| Physical Android device | FAIL | Tabs absent |
| Physical Android, private/incognito | FAIL | Still absent |
| Physical Android, cache cleared | FAIL | Still absent |
| Physical Android, "Desktop site" mode | FAIL | Still absent |
| Physical Android, JavaScript disabled | FAIL | **Most significant result** |
| Independent physical iPhone 16 | FAIL | Not device-specific |

Observed visible sequence on the failing Android device: header → PWA/Contact/Notifications
controls → hero → hero subtitle → `Categorías`. No `Explora` heading and no tab rail
(`Descubre`, `Gastronomía`, `Alojamientos`, `Actividades`, `Servicios`, `Mapa`), and no empty
vertical block where `ZoneNavigation` should be.

## 8.2 Server-side response

A request to public Stage with a mobile/iPhone User-Agent returned multiple occurrences of
`zone-nav`, including:

```html
<section class="zone-nav zn-valdi-app-isla-teja-isla-teja-main"
 id="zn-valdi-app-isla-teja-isla-teja-main-nav"
 data-zone-nav
 data-zone-layout="tabs"
 data-zone-scope="valdi.app/isla-teja::isla-teja-main"
 aria-label="Explorar">
  ...
  <h2 class="zone-nav-title">Explora</h2>
```

Real Isla Teja ZoneContent was present in the same response.

**The server delivers ZoneNavigation to a mobile User-Agent.**

## 8.3 Hypotheses now excluded

| Hypothesis | Verdict | Decisive evidence |
| --- | --- | --- |
| Server routing / Application resolution | **Excluded** | SSR contains correctly scoped `zone-nav` |
| Missing ZoneContent | **Excluded** | Real content present in the SSR response |
| Missing SSR | **Excluded** | `zone-nav` and `Explora` present server-side |
| Viewport breakpoint alone | **Excluded** | Desktop responsive emulation **passes** |
| ZoneNavigation enhancement JS | **Excluded** | Physical Android with **JavaScript disabled** still fails |
| Simple browser cache | **Excluded** | Incognito **and** cache clear both still fail |
| Server-side User-Agent omission | **Excluded** | Mobile-UA response contains the markup |

The unresolved boundary is therefore **physical mobile browser CSS / layout / rendering**,
not routing, content, SSR, breakpoints, JavaScript or cache.

## 8.4 Why D1 was selected

D1 (recorded in §3 of the original report) is a **proven** CSS defect. At `max-width: 767px`
`.zone-nav-rail` declared:

```css
margin-left: calc(var(--spacing-md) * -2);
margin-right: calc(var(--spacing-md) * -2);
```

while the base rule declared `max-width: 100%`. With the real tokens
(`--spacing-md: 1rem` = 16px, `--spacing-lg: 1.5rem` = 24px) at a 390px viewport:

1. `.zone-nav` padding = 16px per side → content box = 358px.
2. `.zone-nav-container` width = 358px.
3. The negative margins ask the rail for `358 + 32 + 32 = 422px`; `max-width: 100%`
   (= 358px) clamps it back to **358px**.
4. `margin-left (-32) + width (358) + margin-right (-32) = 294 ≠ 358`: the box is
   **over-constrained**, so per CSS 2.1 §10.3.7 LTR the used `margin-right` becomes **+32px**.
5. Rail border box = **x ∈ [−16, 342]** — 16px outside the left viewport edge, with a
   48px dead gutter on the right.

The declarations are mutually unsatisfiable: the bleed can never happen while `max-width`
clamps the rail back inside the already-padded box.

D1 is now the **primary minimal remediation experiment** because it is the only *proven*
defect that differs between the passing configuration (desktop / emulation, where the mobile
media query does not apply) and the failing one (physical narrow viewport). D2 is a colour
token defect and cannot remove elements from the layout.

**D1 is a proven CSS defect and the strongest current remediation candidate. It is NOT proven
to be the complete root cause.** Causal status is decided only by the physical Stage retest.

## 8.5 Box-model analysis used to choose the fix

The candidates were weighed against the actual box model rather than applied mechanically:

| Option | Result | Reason |
| --- | --- | --- |
| Keep negative margins, drop `max-width: 100%` | **Rejected** | Rail becomes 422px spanning x ∈ [−16, 406] — overflows **both** sides, directly violating contract item 13 |
| Keep negative margins, reduce them to `-16px` to match parent padding | **Rejected** | Still needs `max-width` removed to work; more moving parts for the same visual result |
| Genuine full-bleed edge-to-edge (margins `-16px`, no `max-width`) | **Rejected** | Meets geometry but is the "clever edge bleed" the brief tells us to avoid; larger diff, no contract benefit |
| **Remove the mobile `.zone-nav-rail` override entirely** | **Chosen** | Smallest change; base rule already yields a valid in-flow box |

Resulting geometry at 390px: `.zone-nav-rail` width = 358px at **x ∈ [16, 374]** — fully
inside the viewport, symmetric 16px insets, no dead gutter, no over-constraint. The tab
strip's own `padding-left: var(--spacing-lg)` (24px) places the first tab at **x = 40px**
instead of the previous x = 8px. The ~828px `min-width: max-content` strip still overflows
the 358px rail and is absorbed by `overflow-x: auto`.

## 8.6 Exact remediation

One file, `web/rendering/html.renderer.js`, inside the ZoneNavigation
`@media (max-width: 767px)` block:

```diff
 @media (max-width: 767px) {
-  .${s} .zone-nav-rail {
-    margin-left: calc(var(--spacing-md) * -2);
-    margin-right: calc(var(--spacing-md) * -2);
-  }
+  /* APP-ZONE-TABS-MOBILE-1B: .zone-nav-rail deliberately has no rule here
+     anymore. It used to add margin-left/-right: calc(var(--spacing-md) * -2)
+     on top of the base max-width: 100%, and those two cannot both hold. The
+     negative margins ask for 422px of width inside a 358px content box;
+     max-width then clamps the rail back to 358px, and because the block is
+     over-constrained CSS resolves it by dropping margin-right to +32px. The
+     rail's left edge therefore landed 16px OUTSIDE the viewport (x = -16) with
+     a 48px dead gutter at the right.
+     With no override, the base rule alone applies: an ordinary in-flow block
+     that exactly fills the container, and the rail remains the single scroll
+     container (overflow-x: auto). Horizontal overflow stays inside the rail,
+     the first tab always starts inside the viewport, and the rail introduces
+     no page-level horizontal scrolling. */

   .${s} .zone-nav-tabs {
     padding-left: var(--spacing-lg);
     padding-right: var(--spacing-lg);
   }
```

`1 file changed, 13 insertions(+), 4 deletions(-)` — 4 deleted lines are the rule selector
plus the two margin declarations and the blank separator; 13 added lines are the
explanatory comment. **No other declaration in the entire stylesheet was touched.** The base
`.zone-nav-rail` rule (including `max-width: 100%`) is deliberately left in place: with
`width: auto` and no margins it is non-binding, and it remains a guard against the rail ever
exceeding its container.

## 8.7 Why this is browser-safe

* **No new layout primitives.** Only two declarations were deleted. No `position`,
  `transform`, `absolute`, `content-visibility`, containment, or device/User-Agent detection
  was introduced. No JavaScript layout measurement. No new dependency.
* **No over-constrained box remains.** `width: auto` with `margin-left/right: 0` and
  `max-width: 100%` resolves unambiguously in every engine — there is no implementation-
  dependent tie-break left to disagree about, which is precisely what made the original rule
  risky across Chrome/Safari/Android WebView.
* **The rail stays the single scroll container.** `overflow-x: auto` and
  `-webkit-overflow-scrolling: touch` are untouched on the base rule. All horizontal overflow
  is contained inside the rail; the page never gains a horizontal scrollbar.
* **Progressive enhancement untouched.** The enhancement script, `is-enhanced` panel hiding,
  `aria-selected`, and hash routing were not modified. The remediation is pure CSS in one
  media query.
* **No hiding technique introduced.** Verified by test: no `display:none`,
  `visibility:hidden`, `opacity:0`, transform shift, absolute positioning, zero height, or
  `hidden`/`aria-hidden`/`inert` wrapper anywhere in the rail/tab chain.
* **Generic, not destination-specific.** Every `.zone-nav*` selector remains qualified by the
  Application scope `zn-valdi-app-isla-teja-isla-teja-main`. No `isla-teja-main` class, no
  mobile-specific scope.

## 8.8 Mobile CSS contract after remediation

| # | Requirement | Result |
| --- | --- | --- |
| 1 | `.zone-nav` in normal document flow | held — untouched |
| 2 | `.zone-nav-container` bounded by viewport | held — untouched |
| 3 | Rail creates no page-level horizontal overflow | held — over-constraint removed |
| 4 | Rail may scroll its own contents | held — `overflow-x: auto` retained |
| 5 | First tab begins inside the visible rail | improved — x 8px → 40px |
| 6 | All six tabs reachable by horizontal scroll | held — `min-width: max-content` + `nowrap` |
| 7 | `.zone-nav-tabs` may keep `min-width: max-content` | held |
| 8 | Touch targets ≥ 44px high | held — `min-height: 44px` untouched |
| 9 | No tab depends on JavaScript for base visibility | held — SSR-only usable |
| 10 | No hiding technique introduced | held — asserted by test |
| 11 | SSR without JavaScript usable | held — asserted by test |
| 12 | Progressive enhancement usable | held — asserted by test |
| 13 | No page-level horizontal scrollbar from ZoneNavigation | held |
| 14 | Desktop ≥768px preserves centred/wrapped behaviour | held — block untouched, asserted |

## 8.9 Files modified

| File | Git state | Change |
| --- | --- | --- |
| `web/rendering/html.renderer.js` | modified, tracked | mobile `.zone-nav-rail` margins removed + comment |
| `web/zone-navigation.mobile-rail.test.js` | **new, untracked** | 9 focused mobile CSS-contract tests |
| `docs/ai/APP_ZONE_TABS_MOBILE_1_REPORT.md` | untracked | original report + this section |

Explicitly **not** touched: `push.api.js`, the service worker, the manifest,
`pushNotifications`, `installableApp`, the notification-permission flow, Contact, the PWA
install flow, `package.json`/`package-lock.json`, any Booking code, any booking CSS/JS,
`database/`, `docs/ai/CURRENT_STATE.md`, and the `booking-pricing-1a` worktree.

## 8.10 Regression coverage

New file `web/zone-navigation.mobile-rail.test.js` (**untracked**), framework-free and
matching the existing suite style. It renders the real `/isla-teja` page through the full
pipeline, extracts the ZoneNavigation stylesheet (located by its unique banner comment),
strips CSS comments so assertions cannot hide inside one, and locates media blocks by brace
matching **and** by selector containment.

The stylesheet contains **two** `@media (max-width: 767px)` blocks — `zoneContentStyles`
contributes its own. An earlier revision of this test matched only the first and passed
vacuously; that flaw was found and fixed, and the tests now assert exactly one matching block.

| Test | Guards |
| --- | --- |
| `testMobileRailHasNoNegativeBleedMargins` | the proven contradictory geometry is gone |
| `testMobileRailKeepsNoOverconstraint` | `max-width` never coexists with a margin on the mobile rail |
| `testRailRemainsHorizontallyScrollable` | `overflow-x: auto` + touch scrolling retained, desktop `overflow: visible` |
| `testTabStripStaysAHorizontallyReachableStrip` | flex row, `nowrap`, `min-width: max-content`, strip inset padding |
| `testNoHidingTechniqueOnRailOrTabs` | no `display:none` / `visibility:hidden` / `opacity:0` / transform / absolute / zero-height / `content-visibility` |
| `testTabsAndRailSurviveWithoutJavaScript` | all six tabs, the `Explora` heading and the rail are in SSR with no `hidden`/`aria-hidden`/`inert` wrapper |
| `testDesktopBehaviourIsUntouched` | centred, wrapped, `min-width: 0`, no rail margins at ≥768px |
| `testScopeStaysApplicationSpecific` | every `.zone-nav` selector stays Application-scoped; no destination-specific or mobile-specific class |
| `testProgressiveEnhancementContractIntact` | `data-zone-nav`, `is-enhanced`, `aria-selected`, tablist semantics |

**Negative control.** D1 was deliberately reintroduced and the suite re-run: it failed with
`Mobile .zone-nav-rail must not declare margin-left (D1)` (8/9, exit 1). The reintroduction
was then reverted and the suite returned to 9/9. The test genuinely detects the defect rather
than passing by construction.

**These are string/declaration-level assertions. They do NOT prove physical browser
rendering. FINAL CAUSAL CERTIFICATION REQUIRES A PHYSICAL STAGE RETEST.**

## 8.11 Exact test results

| Suite | Result | Exit |
| --- | --- | --- |
| `web/zone-navigation.test.js` | 12 / 12 | 0 |
| `web/zone-navigation.tabs-2.test.js` | 13 / 13 | 0 |
| `web/zone-presentation.test.js` | 11 / 11 | 0 |
| `experience/navigation/zone.navigation.test.js` | 17 / 17 | 0 |
| `experience/content/zone.content.test.js` | 14 / 14 | 0 |
| `experience/presentation/zone.navigation.tabs.test.js` | 9 / 9 | 0 |
| `experience/presentation/zone.presentation.test.js` | 17 / 17 | 0 |
| `web/app-zone-pwa-1.test.js` | 42 / 42 | 0 |
| `web/config-authority.test.js` | 6 / 6 | 0 |
| `web/zone-navigation.mobile-rail.test.js` (new) | 9 / 9 | 0 |
| `web/booking-widget-availability.test.js` | 42 / 42 | 0 |
| `web/mvp-booking-ui-1.test.js` | 9 pass / 0 fail | 0 |

**APP ZONE zone/PWA total: 135 passed, 0 failed — unchanged from baseline. Plus 9 new mobile
contract tests (144 overall).** Booking: 42/42 and 9/9, unchanged. All nine zone/PWA suites
were run **before** the change as well and returned identical counts, so no pre-existing
failure was masked.

`node --check web/rendering/html.renderer.js` → exit 0.

### 8.11.1 Suite not runnable

`web/ensueno-booking-1.test.js` — **NOT RUNNABLE**, identical to §5.2 of the original report:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'pg' imported from
  C:\Users\casa\Documents\app-zone-tabs-mobile-1\database\connection\postgres.connection.js
```

The worktree has no `node_modules` and dependency installation is forbidden by the milestone
constraints. No junction, junction-style reuse, or install was attempted, so no dependency
state and no other worktree was mutated. The historical 37/37 result for this suite is
therefore **not** re-verified here. This is a pre-existing environment limitation, **not** a
regression introduced by this change.

## 8.12 Deferred — D2

`--color-text-muted` is never defined; both emitters write `--color-textMuted` while 13
consumers read `var(--color-text-muted)` (see §3 D2). This is a real defect and produces
wrong/inherited muted text colour — a site-wide contrast regression — but it **cannot** remove
elements from the layout, and there is no evidence connecting it to the disappearance of the
tabs.

**Deliberately not fixed.** The Stage experiment must change one meaningful variable only;
bundling a colour-token fix would make the result uninterpretable. Recorded as follow-up
technical debt.

## 8.13 Deferred — Push / PWA observations

| Observation | Context | Action |
| --- | --- | --- |
| "Push no soportado" | physical iPhone 16 | recorded only |
| Browser install prompt appeared with JS disabled | physical Android | recorded only |

Neither is treated as a cause of the ZoneNavigation defect: there is no evidence connecting
either to it, and the tabs are absent **with JavaScript disabled**, which removes the
enhancement path entirely. `push.api.js`, the service worker, the manifest,
`pushNotifications`, `installableApp`, the notification-permission flow, Contact and the PWA
install flow were **not modified**. They require a separate compatibility/certification
milestone after ZoneNavigation is resolved.

## 8.14 Booking non-regression

Booking is certified and developed independently in `booking-pricing-1a`, which was not
touched. `web/rendering/html.renderer.js` is shared, so the diff was kept to a single CSS
media-query block: no reformatting, no Booking CSS or JS, no change to booking pricing,
reservation totals, availability semantics, reservation write behaviour, booking APIs,
PostgreSQL, or `BOOKING-DATE-SEMANTICS-1`. `web/booking-widget-availability.test.js` (42/42)
and `web/mvp-booking-ui-1.test.js` (9/9) both pass after the change.

## 8.15 Physical certification requirement

This milestone cannot produce `MOBILE_DEFECT_FIXED` or `ROOT_CAUSE_CERTIFIED`. Repository
tests establish only that the contradictory geometry is gone and the rest of the mobile
contract is intact. **Final causal certification requires a physical Stage retest** on:

1. the original physical Android device, in a normal private window;
2. the independent physical iPhone 16;
3. ideally one device with JS disabled, to confirm SSR-only usability.

Acceptance for the retest: the `Explora` heading and all six tabs visible and reachable, no
page-level horizontal scrollbar attributable to ZoneNavigation, and no visual regression to
the desktop centred/wrapped rail. **If the tabs are still absent after this change, D1 is
exonerated and the next step is the on-device DOM/computed-style dump already listed in §6
items 6–7 of the original report** — that dump remains the highest-value missing evidence.

## 8.16 Recommended micro-deploy

Only **one** production file needs to ship:

| File | Deploy? |
| --- | --- |
| `web/rendering/html.renderer.js` | **yes** |
| `web/zone-navigation.mobile-rail.test.js` | no (test only) |
| `docs/ai/APP_ZONE_TABS_MOBILE_1_REPORT.md` | no (documentation) |

No migration, no config change, no dependency change, no asset rebuild. Passenger/restart
and database steps are none.

## 8.17 Rollback scope

Single-file, single-block. Revert the `.zone-nav-rail` removal inside
`@media (max-width: 767px)` in `web/rendering/html.renderer.js` and redeploy. No data,
schema, config or dependency rollback, and no other file is involved. Rolling back restores
the exact baseline geometry.

## 8.18 Git state at handoff

```
HEAD:   b6c0d3bd00e492faf0813992ac3ebcb6f43749a6   (unchanged)
staged: (none)

 web/rendering/html.renderer.js | 17 +++++++++++++----
 1 file changed, 13 insertions(+), 4 deletions(-)

 M web/rendering/html.renderer.js
?? web/zone-navigation.mobile-rail.test.js
?? docs/ai/APP_ZONE_TABS_MOBILE_1_REPORT.md
```

No commit, push, merge, deploy, SSH, database access, Passenger change, or application
bootstrap. The dirty main worktree and `booking-pricing-1a` were not touched.

## 8.19 Physical certification — D1 remediation PASSED

The §8.15 requirement has been met. The D1 remediation from §8.6 was deployed to public Stage and
retested on real hardware.

### 8.19.1 What was deployed

| Item | Value |
| --- | --- |
| Production file shipped | `web/rendering/html.renderer.js` (D1 block only) |
| Deployment type | micro-deploy, exactly the §8.16 scope |
| Deployment integrity | verified **before** Passenger restart |
| Additional production changes | **none** — no further fix, workaround or adjustment was required |
| Tests shipped | none (test-only file not deployed) |
| Migrations / config / dependencies | none |

### 8.19.2 Stage health after Passenger restart

`GET https://stage.valdi.app/health`

```
HTTP_STATUS=200

{
  "status":"ok",
  "environment":"staging",
  "persistence":{
    "status":"up",
    "provider":"postgres",
    "physical":true,
    "entityName":"unknown",
    "latency":81
  }
}
```

Stage health remained **HTTP 200** and PostgreSQL remained **physical / up**
(`provider: postgres`, `physical: true`) throughout the retest.

### 8.19.3 Physical retest results — PASSED

Tested on **three independent physical mobile devices**, one of which was an **iPhone**:

| # | Device | Result | Note |
| --- | --- | --- | --- |
| 1 | physical mobile device 1 | **PASS** | APP ZONE tabs visible and functional |
| 2 | physical mobile device 2 | **PASS** | APP ZONE tabs visible and functional |
| 3 | physical **iPhone** | **PASS** | APP ZONE tabs visible and functional |

The physical APP ZONE navigation now exposes, on real mobile browsers:

`Explora` · `Descubre` · `Gastronomía` · `Alojamientos` · `Actividades` · `Servicios` · `Mapa`

The tab rail is usable on real mobile browsers. These devices had all returned the FAIL results
recorded in §8.1 before the D1 change, so the before/after contrast is direct.

### 8.19.4 Stale-session observation on the operator device

The original operator device initially retained the old failing behaviour immediately after
deployment. It rendered the tabs correctly after opening a **new browsing session**. This is
recorded as a client-side cache/session artefact of the transition, not as a second defect and not
as a change in the production code — the deployed bytes were already correct, as the three
independent devices demonstrated against the same build. It is noted here so the observation is
not later mistaken for an intermittent rendering failure.

### 8.19.5 What this certification does and does not establish

Established:

- Physical Stage retest: **PASSED**.
- Three independent physical mobile devices passed; one was an **iPhone**.
- APP ZONE tabs are **visible and functional**, and the rail is usable on real mobile browsers.
- Stage health remained **HTTP 200**; PostgreSQL remained **physical / up**.
- The **D1 remediation is now physically validated** — the §8.15 causal gate is closed.
- **No additional production changes were required** beyond the single D1 block.

Not established, and deliberately not claimed:

- This is **not** a claim that every mobile/browser combination in existence is certified. It is a
  bounded pass on three real devices against one Stage build at one point in time.
- The §8.15 item 3 "device with JavaScript disabled" SSR-only confirmation was **not** re-performed
  in this retest and remains outstanding. Note that the D1 change is CSS-only and the
  `ZoneNavigation` markup is server-rendered, so the fix is structurally JS-independent — but that
  is reasoning, not a measured result, and no JS-disabled pass is claimed here.
- D2 and the Push/PWA observations were not part of this remediation and are unchanged (§8.12,
  §8.13).

### 8.19.6 Deferred items — preserved, not addressed

These remain **separate follow-up items**, explicitly **not** part of the D1 remediation:

| Deferred item | Section | State |
| --- | --- | --- |
| D2 — `--color-text-muted` / `--colorMuted` token mismatch (site-wide contrast regression) | §3, §8.12 | open, deliberately not fixed |
| iPhone — "Push no soportado" | §8.13 | recorded only, not investigated |
| JavaScript-disabled browser install-prompt observation | §8.13 | recorded only, not investigated |

No production code, test file or `CURRENT_STATE.md` was modified for any of these.

---

**Milestone status: `PHYSICAL_RETEST_PASSED`.** D1 was remediated minimally in §8.6 and is now
physically validated on Stage across three independent real mobile devices including an iPhone
(§8.19). D2 and the Push/PWA observations remain open follow-ups and were not part of this change.
