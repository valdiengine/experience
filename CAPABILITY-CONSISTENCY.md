# CAPABILITY-CONSISTENCY.md — Lifecycle & Contract Audit

## Overview

26 registered capabilities audited against BaseCapability contract.
Each capability must expose: `id`, `name`, `version`, `dependencies`, `init()`, `activate()`, `deactivate()`, `destroy()`

## Capability Lifecycle Matrix

| # | Capability | ID | Version | Dependencies | init() | activate() | deactivate() | destroy() | README | Pattern |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | booking | booking | v1.0.0 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 2 | notifications | notifications | v2.0.0 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 3 | pwa | pwa | v1.0.0 | — | ✅ | ✅ | ✅ | ✅ | ❌ | ESM+default |
| 4 | cms | cms | v1.0.0 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 5 | communication | communication | v1.0.0 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 6 | availability | availability | v1.0.0 | communication | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 7 | intelligence | intelligence | v1.0.0 | NOT DECLARED | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 8 | reservation | reservation | v2.0.0 | booking, availability, communication, notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 9 | scheduler | scheduler | v2.0.0 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 10 | observability | observability | v1.0.0 | scheduler | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 11 | onboarding | onboarding | v1.0.0 | — | ✅ | ✅ | ❌ | ✅ | ✅ | ESM+default |
| 12 | owner | owner | v1.0.0 | reservation, availability, communication, observability | ✅ | ✅ | ✅ | ✅ | ❌ | ESM+default |
| 13 | engagement | engagement | v1.0.0 | communication, availability, reservation, intelligence, notifications, scheduler, observability | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 14 | conversion | conversion | v1.0.0 | communication, engagement, reservation, availability, intelligence, observability | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 15 | public | public | v1.0.0 | cms, pwa, reservation, communication, engagement | ✅ | ✅ | ✅ | ✅ | ✅ | PlainObject |
| 16 | seo-intelligence | seo-intelligence | v1.0.0 | cms, public, observability, intelligence | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 17 | pwa-engine | pwa-engine | v1.0.0 | notifications, communication, public, observability | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 18 | admin | admin | v1.0.0 | onboarding, reservation, availability, cms, seo-intelligence, pwa-engine, observability | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 19 | saas | saas | v1.0.0 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 20 | billing | billing | v1.0.0 | saas | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 21 | lifecycle | lifecycle | v1.0.0 | saas, billing, communication, engagement, observability | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 22 | community | community | v1.0.0 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ESM+default |
| 23 | exploration | exploration | v1.1.0 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 24 | governance | governance | v1.0.0 | NOT DECLARED | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 25 | destination-operations | destination-operations | v1.0.0 | NOT DECLARED | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |
| 26 | destination-identity | destination-identity | v1.0.0 | NOT DECLARED | ✅ | ✅ | ✅ | ✅ | ✅ | ESM-named |

> **Pattern key:**
> - **ESM+default** — extends BaseCapability, has `export default`
> - **ESM-named** — extends BaseCapability, named export only
> - **PlainObject** — does NOT extend BaseCapability

---

## Lifecycle Issues

### CRITICAL: Missing `deactivate()` — onboarding

- onboarding capability has no `deactivate()` override
- Relies entirely on BaseCapability base class behavior
- **Risk:** May not properly clean up event listeners or internal state

### CRITICAL: Missing Dependencies Declaration — 4 capabilities

| Capability | Issue |
|---|---|
| intelligence | No `static dependencies = []` declared |
| governance | No `static dependencies = []` declared |
| destination-operations | No `static dependencies = []` declared |
| destination-identity | No `static dependencies = []` declared |

- **Risk:** Activation order may be incorrect; dependencies may not be loaded when needed

### CRITICAL: `public` capability does NOT extend BaseCapability

- Uses plain object literal `export default { id, name, version, ... }`
- Cannot use `this.on()`, `this.emit()`, `this.eventBus` from base class
- Uses private fields (`#manager`, `#context`) in non-class syntax
- **Risk:** Inconsistent lifecycle behavior; no base class protections

---

## Contract Compliance

### BaseCapability Contract Requirements

| Requirement | Status | Details |
|---|---|---|
| `static id` | ✅ | All 26 declare an id |
| `static name` | ✅ | All 26 declare a name |
| `static version` | ✅ | All 26 declare a version |
| `static dependencies` | ❌ | 4 missing (intelligence, governance, operations, identity) |
| `init(context)` | ✅ | All 26 implement init() |
| `activate()` | ✅ | All 26 implement activate() |
| `deactivate()` | ❌ | 1 missing (onboarding) |
| `destroy()` | ✅ | All 26 implement destroy() |
| `export default` | ❌ | 11 capabilities use named export only |
| README.md | ❌ | 2 registered capabilities missing (pwa, owner) |

---

### Manager Creation Patterns

| Pattern | Count | Capabilities |
|---|---|---|
| Single Manager | 14 | booking, availability, intelligence, reservation, observability, onboarding, owner, engagement, conversion, public, seo-intelligence, pwa-engine, admin, community |
| Multiple Managers | 8 | notifications(4), cms(2), communication(4), scheduler(6), saas(7), billing(5), lifecycle(12), governance(6) |
| No Managers (internal maps) | 2 | pwa(2 internal), exploration(8) |
| Mixed | 2 | operations(5), identity(6) |

---

### Event Listener Registration Patterns

| Pattern | Count | Capabilities |
|---|---|---|
| `this.on()` in `activate()` | 7 | booking, cms, availability, reservation, observability, onboarding, seo-intelligence |
| `_setupEventListeners()` with `bus.on()` | 4 | intelligence, governance, operations, identity |
| Delegated to manager | 8 | notifications, communication, engagement, conversion, public, pwa-engine, admin, community |
| None | 7 | pwa, scheduler, owner, saas, billing, lifecycle, exploration |

---

### Anomalies Detected

1. **observability** — `activate()` references module-level `config()` function instead of init config
2. **scheduler** — uses `this.#context?.eventBus?.emit()` directly instead of `this.emit()`
3. **lifecycle** — mutates shared context: `context.lifecycle = this` in `init()`
4. **exploration** — version is 1.1.0 (all others are 1.0.0 or 2.0.0)
5. **intelligence** — uses `_listeners` pattern with `bus.on`/`bus.off` instead of `this.on()`
6. **governance** — uses default imports for managers (inconsistent with named imports elsewhere)
7. **operations** — imports `CampaignManager` from `./campaigns/` but no `campaigns/` folder exists in glob
8. **seo-intelligence** — has TWO event files (`seo-intelligence.events.js` and `seo/seo.events.js`)

---

## Unregistered Capabilities (3)

| Folder | ID | Status | Issue |
|---|---|---|---|
| catalog | catalog | Placeholder | Single file, empty lifecycle, not registered |
| gallery | gallery | Placeholder | Single file, empty lifecycle, not registered |
| payments | payments | Placeholder | Single file, empty lifecycle, redundant with billing |

---

## Recommendations

| Priority | # | Action |
|---|---|---|
| **CRITICAL** | 1 | Refactor `public` capability to extend BaseCapability |
| **CRITICAL** | 2 | Add `static dependencies = []` to intelligence, governance, operations, identity |
| **CRITICAL** | 3 | Add `deactivate()` to onboarding capability |
| **HIGH** | 4 | Standardize all capabilities to use `export class + export default` |
| **HIGH** | 5 | Add README.md to pwa and owner capabilities |
| **MEDIUM** | 6 | Rename folders to match registered IDs (`operations` → `destination-operations`, `identity` → `destination-identity`) OR change registered IDs to match folder names |
| **MEDIUM** | 7 | Remove or register the 3 unregistered placeholder capabilities (catalog, gallery, payments) |
| **LOW** | 8 | Standardize event listener pattern to `this.on()`/`this.off()` in `activate()`/`deactivate()` |
| **LOW** | 9 | Standardize manager import style to named imports |

---

*Generated by P11.5 Ecosystem Core Consolidation — Capability Consistency Audit*
