# TECHNICAL_DEBT.md

> Known architectural limitations and areas for improvement.

---

## Critical Debt

### TD-001: No Real API Providers
- **Description:** Platform uses mock JSON providers. No real backend integration.
- **Impact:** Cannot deploy to production. No real data.
- **Resolution:** P12 — Real API Provider Layer
- **Priority:** Critical

### TD-002: No Authentication
- **Description:** No user authentication or session management.
- **Impact:** No security. No user identity. No multi-user support.
- **Resolution:** P12.1 — Authentication & Authorization
- **Priority:** Critical

### TD-003: No Automated Tests
- **Description:** Zero automated tests across the entire platform.
- **Impact:** No quality assurance. Regressions undetected. Refactoring risky.
- **Resolution:** P13 — Testing Foundation
- **Priority:** Critical

---

## High Debt

### TD-004: No Error Boundaries
- **Description:** Error handling is inconsistent across capabilities.
- **Impact:** Unhandled errors can crash the entire platform.
- **Resolution:** Implement global error boundary pattern
- **Priority:** High

### TD-005: No TypeScript
- **Description:** Platform uses vanilla JavaScript without type checking.
- **Impact:** Runtime errors that could be caught at compile time. IDE support limited.
- **Resolution:** Consider TypeScript migration or JSDoc type annotations
- **Priority:** High

### TD-006: No Build System
- **Description:** No bundling, minification, or tree-shaking.
- **Impact:** Large bundle sizes. No code splitting. Slow initial load.
- **Resolution:** Add Vite or similar build tool
- **Priority:** High

### TD-007: Orphan Capabilities
- **Description:** 3 capabilities exist in `capabilities/` but are not registered.
- **Impact:** Dead code. Confusion about what's active.
- **Resolution:** Register or remove: catalog, gallery, payments
- **Priority:** High

---

## Medium Debt

### TD-008: No CSS Architecture
- **Description:** CSS is scattered without clear organization.
- **Impact:** Style conflicts. Difficult to maintain. No design system enforcement.
- **Resolution:** Implement CSS custom properties system or CSS Modules
- **Priority:** Medium

### TD-009: No Linting
- **Description:** No ESLint or Prettier configuration.
- **Impact:** Inconsistent code style across files.
- **Resolution:** Add ESLint + Prettier with project config
- **Priority:** Medium

### TD-010: No Documentation Site
- **Description:** Documentation exists in markdown files but no browsable site.
- **Impact:** Hard to navigate. Not searchable. Not shareable.
- **Resolution:** P16 — Documentation Site (VitePress or Docusaurus)
- **Priority:** Medium

### TD-011: Event Naming Inconsistency
- **Description:** Some events use `domain:entity.action`, others use `entity.action`.
- **Impact:** Harder to filter events. Inconsistent patterns.
- **Resolution:** Standardize all events to `domain:entity.action`
- **Priority:** Medium

### TD-012: No i18n
- **Description:** No internationalization support.
- **Impact:** Platform only works in Spanish/English. Cannot serve global destinations.
- **Resolution:** Implement i18n framework
- **Priority:** Medium

---

## Low Debt

### TD-013: Architecture Specs Without Code
- **Description:** 6 architecture specifications have no corresponding code implementation.
- **Impact:** Designed but not built. May become outdated.
- **Resolution:** P11.3.10-P11.3.13 — Implement remaining code
- **Priority:** Low

### TD-014: No Accessibility Audit
- **Description:** No WCAG compliance testing.
- **Impact:** May not be accessible to users with disabilities.
- **Resolution:** Accessibility audit and remediation
- **Priority:** Low

### TD-015: No Performance Monitoring
- **Description:** No real-time performance metrics.
- **Impact:** Cannot detect performance degradation.
- **Resolution:** P14.2 — Monitoring & Observability
- **Priority:** Low

### TD-016: No Offline Conflict Resolution
- **Description:** Offline sync has basic conflict resolution but needs improvement.
- **Impact:** Data conflicts when multiple devices edit offline.
- **Resolution:** Implement CRDT or operational transform
- **Priority:** Low

---

## Debt Summary

| Priority | Count | Status |
|----------|-------|--------|
| Critical | 3 | Planned (P12, P12.1, P13) |
| High | 4 | Partially planned |
| Medium | 5 | Not planned |
| Low | 4 | Not planned |
| **Total** | **16** | |

---

## See Also

- [ROADMAP.md](./ROADMAP.md) — Master roadmap
- [RELEASE_PLAN.md](./RELEASE_PLAN.md) — Release planning
- `docs/ai/CURRENT_STATE.md` — Current implementation state
