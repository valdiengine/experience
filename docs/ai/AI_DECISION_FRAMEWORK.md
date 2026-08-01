# AI Decision Framework

> Standardized decision trees for architectural, code, and documentation decisions.
> Every AI must follow this framework when making decisions that affect the platform.
> Complements: MASTER_CONTEXT.md, ARCHITECTURAL-INVARIANTS.md, ENGINEERING-STANDARDS.md, AI_OPERATING_MANUAL.md

---

## Purpose

Decisions accumulate. A single incorrect decision — the wrong layer for a new module, the wrong name for an event, the wrong approach to a dependency — seems small in isolation. But compounded over hundreds of decisions across dozens of AI sessions, inconsistencies become systemic. The platform becomes a mosaic of incompatible patterns.

This document exists to prevent that. It provides standardized decision trees that produce consistent, architecture-compliant outcomes regardless of which AI makes the decision or when it is made.

Decision trees are not suggestions. They are the protocol. When a decision falls within the scope of a defined tree, follow the tree. When a decision falls outside the scope of any defined tree, flag it to the Architect for a new tree to be created.

---

## How Decision Trees Work

Every decision tree has a trigger condition, a sequence of questions, and an outcome. Follow the sequence in order. Each answer narrows the decision space. The final answer is the correct architectural choice.

Decision trees do not cover every possible situation. They cover the most common and most consequential decisions. When a decision is ambiguous, when two trees conflict, or when no tree covers the situation, escalate to the Architect. Do not improvise.

---

## Decision Tree 1: Where Does New Code Belong?

This is the most frequent decision. Every new file, every new module, every new capability requires choosing the correct location. An incorrect location creates layer violations, import problems, and architectural debt.

**Trigger:** Creating a new file or module.

**Q1: Is this code business-agnostic?**
- Does it define platform contracts, shared utilities, or infrastructure foundations?
- Would it be useful in a completely different platform?
- Does it reference no specific capability, workflow, or tenant?

**If YES → L0: shared/**
- Is it a contract or interface? → `shared/contracts/`
- Is it a utility? → `shared/utils/`
- Is it a base class? → `shared/base/`
- Is it platform configuration? → `shared/config/`
- Is it a shared event schema? → `shared/events/`

**If NO → Continue to Q2.**

**Q2: Is this code defining a capability?**
- Does it implement a capability lifecycle (init, activate, deactivate, destroy)?
- Does it register itself with the EventBus?
- Does it follow the capability contract?

**If YES → Which layer does the capability belong to?**
- Core platform? → `capabilities/` (register in `engine/core/register.js`)
- Public widget? → `public/capabilities/`
- Destination-specific? → `destinations/[name]/capabilities/`
- Tenant-specific? → `tenants/[id]/capabilities/`

**If NO → Continue to Q3.**

**Q3: Is this code engine infrastructure?**
- Does it manage the application lifecycle?
- Does it handle routing, rendering, or state management?
- Does it communicate with external services?

**If YES → Which engine component?**
- Application shell? → `engine/app/`
- Core engine? → `engine/core/`
- State management? → `engine/state/`
- UI framework? → `engine/ui/`
- Cross-cutting? → `engine/cross/`
- Platform logic? → `engine/platform/`
- Service connections? → `providers/`

**If NO → Continue to Q4.**

**Q4: Is this code for a specific tenant?**
- Does it serve only one tenant's business logic?
- Is it not reusable across tenants?

**If YES → `tenants/[id]/`**
- Business logic? → `tenants/[id]/business/`
- Custom capabilities? → `tenants/[id]/capabilities/`
- Custom workflows? → `tenants/[id]/workflows/`
- Tenant config? → `tenants/[id]/config/`

**If NO → Continue to Q5.**

**Q5: Is this code for the destination ecosystem?**
- Does it serve the municipality layer?
- Does it serve the ecosystem layer?

**If YES → `destinations/[name]/`**
- Municipality level? → `destinations/[name]/municipality/`
- Ecosystem level? → `destinations/[name]/ecosystem/`
- Cross-cutting? → `destinations/[name]/cross/`

**If NO → This code may not belong in the platform. Flag to Architect.**

---

## Decision Tree 2: Does This Already Exist?

Before creating anything, verify it does not already exist. Duplication is technical debt. It creates maintenance burdens, inconsistency risks, and confusion about which version is canonical.

**Trigger:** Creating any new capability, module, manager, event, or document.

**Q1: Has this exact thing been registered before?**
- Check `engine/core/register.js` for capabilities
- Check `docs/ai/CAPABILITY_INDEX.md` for capabilities
- Check `docs/ai/EVENT_INDEX.md` for events
- Check `docs/ai/CURRENT_STATE.md` for documents

**If YES → Do not create it. Use the existing one.**

**If NO → Continue to Q2.**

**Q2: Is there something functionally equivalent?**
- Does a capability serve the same business purpose?
- Does an event communicate the same type of information?
- Does a document describe the same domain?
- Does a module perform the same function under a different name?

**If YES → Consider extending, renaming, or consolidating the existing one. Do not create a duplicate.**

**If NO → Continue to Q3.**

**Q3: Is this a variation of an existing thing?**
- Is it the same concept applied to a different domain?
- Is it the same pattern applied to a different context?
- Is it the same structure with different data?

**If YES → Can the existing thing be generalized?**
- If generalization is clean and non-breaking → Generalize the existing thing
- If generalization would break existing consumers → Create the new thing, but document the relationship
- If generalization is unclear → Flag to Architect for decision

**If NO → Create the new thing. Follow the appropriate creation checklist (Capability Creation Checklist in ENGINEERING-STANDARDS.md).**

---

## Decision Tree 3: What Event System to Use?

Cross-capability communication is the nervous system of the platform. Choosing the wrong communication mechanism creates tight coupling, makes capabilities untestable, and breaks the isolation model.

**Trigger:** Two capabilities need to communicate, or a capability needs to react to a state change.

**Q1: Is this communication within a single capability?**
- Are both the sender and receiver inside the same capability module?
- Is this internal state management, not cross-capability communication?

**If YES → Use internal functions or local state. Do not use the EventBus.**

**If NO → Continue to Q2.**

**Q2: Does a canonical event already exist?**
- Check `docs/ai/EVENT_INDEX.md`
- Is there an event with the exact semantic meaning?
- Is there an event in the same namespace that could be extended?

**If YES → Use the existing event. Do not create a new one.**

**If NO → Continue to Q3.**

**Q3: Is this a notification (fire-and-forget) or a request-response?**
- Does the sender need a response?
- Does the sender need to wait for the receiver to complete?

**If notification → Use EventBus.emit()**
- Follow event naming convention: `{capability}.{entity}.{action}.{detail?}`
- Example: `booking.workflow.created`
- Register the event in `docs/ai/EVENT_INDEX.md`

**If request-response → Use a direct import**
- Import the target capability's API
- Call the method directly
- Handle the response synchronously
- This creates a dependency — document it in `docs/ai/CAPABILITY_INDEX.md`

**If unsure → Default to EventBus notification.** Loose coupling is always preferred over tight coupling.

**Q4: Should this event be cross-engine or local?**
- Does the event need to be published to external consumers (WordPress, third parties)?
- Does the event affect state that other engines need to observe?

**If YES → Register in `engine/core/events.js` cross-engine namespace**
- Use `crossEngine.emit()` and `crossEngine.on()`

**If NO → Register in the capability's own events file**
- Use `EventBus.emit()` and `EventBus.on()`

---

## Decision Tree 4: How to Handle a New Dependency?

Dependencies are relationships. Every relationship has a cost. Dependencies create coupling, reduce testability, increase build complexity, and create failure propagation paths. They are sometimes necessary, but they must always be deliberate.

**Trigger:** A capability needs to use another capability, a shared module, or an external library.

**Q1: Is this dependency within the same layer?**
- Are both modules at the same architectural layer?
- Does the dependency follow the allowed import direction?

**If YES → Continue to Q2.**
**If NO → This creates a layer violation. Do not proceed. Flag to Architect.**

**Q2: Is this dependency in `dependencies` or `peerDependencies` in the manifest?**
- Is the dependency declared in the capability's manifest?
- Or is it being imported without declaration?

**If NOT declared → Add it to the manifest before importing.**

**If declared → Continue to Q3.**

**Q3: Is this dependency necessary, or can it be avoided?**
- Can the functionality be achieved without this dependency?
- Can the shared code be moved to `shared/`?
- Can the communication happen through the EventBus instead?
- Can the data be passed as a parameter instead of accessed directly?

**If avoidable → Avoid it. Prefer loose coupling.**
**If necessary → Continue to Q4.**

**Q4: Is this a circular dependency?**
- Does the target capability already depend on this capability?
- Would adding this dependency create a cycle?

**If YES → This is forbidden. Use EventBus for cross-communication instead.**
**If NO → Add the dependency to the manifest and continue.**

---

## Decision Tree 5: When to Create a New Capability vs. Extend an Existing One?

Capabilities are the building blocks of the platform. Creating too many creates fragmentation. Creating too few creates monolithic capabilities that are hard to maintain. The balance is critical.

**Trigger:** A new business function needs to be implemented.

**Q1: Does a capability with this exact responsibility already exist?**
- Check `docs/ai/CAPABILITY_INDEX.md`
- Is there a capability whose purpose matches the new function?

**If YES → Extend the existing capability. Add new files within its structure.**

**If NO → Continue to Q2.**

**Q2: Does the new function belong to an existing capability's domain?**
- Is it a sub-function of an existing capability's responsibility?
- Would it naturally fit within an existing capability's structure?
- Would users of the existing capability expect this function to be there?

**If YES → Extend the existing capability.**

**If NO → Continue to Q3.**

**Q3: Is this a new domain that no existing capability covers?**
- Does it represent a distinct business concept?
- Does it have its own lifecycle?
- Does it need its own events?
- Does it have dependencies that are different from existing capabilities?

**If YES → Create a new capability. Follow the Capability Creation Checklist.**

**If NO → This may not warrant a capability. Consider a manager, utility, or shared module instead.**

---

## Decision Tree 6: What Documentation to Update?

Documentation decay is the gradual process by which documentation becomes inaccurate. It happens when code changes but documentation is not updated. This decision tree ensures that all affected documentation is identified before any change is made.

**Trigger:** Any code change, architecture change, or capability modification.

**Q1: Did this change affect a capability's interface, events, or dependencies?**

**If YES → Update these files:**
- `docs/ai/CAPABILITY_INDEX.md` (interface changes)
- `docs/ai/EVENT_INDEX.md` (event changes)
- `ROADMAP.md` (phase or capability changes)
- The capability's own documentation (if it exists)
- Any document that references the changed capability

**If NO → Continue to Q2.**

**Q2: Did this change affect the architecture?**

**If YES → Update these files:**
- `docs/architecture/SYSTEM_OVERVIEW.md` (if layer model changed)
- `docs/architecture/CAPABILITY_MAP.md` (if dependency graph changed)
- `docs/architecture/LAYER_MODEL.md` (if layer rules changed)
- `ARCHITECTURAL-INVARIANTS.md` (if invariants were affected)
- `docs/ai/MASTER_CONTEXT.md` (if golden rules changed)

**If NO → Continue to Q3.**

**Q3: Did this change affect the project state?**

**If YES → Update these files:**
- `docs/ai/CURRENT_STATE.md` (phase, capability count, event count, last actions)
- `docs/ai/NEXT_PHASE.md` (if priorities changed)
- `ROADMAP.md` (if phase completion changed)

**If NO → Continue to Q4.**

**Q4: Did this change resolve, create, or modify technical debt?**

**If YES → Update these files:**
- `UPDATED-TECHNICAL-DEBT.md` (debt status changes)
- `docs/roadmap/TECHNICAL_DEBT.md` (known issues)
- `docs/ai/CURRENT_STATE.md` (debt item count)

**If NO → No documentation updates required.**

---

## Decision Tree 7: Multi-Tenant Compliance Check

Every piece of code in the platform must be multi-tenant compliant. A single hardcoded value, a single hardcoded path, a single assumed state can break isolation for all tenants. This decision tree prevents that.

**Trigger:** Any code that will run in a tenant context.

**Q1: Does this code contain any hardcoded values?**
- Hardcoded tenant IDs?
- Hardcoded paths?
- Hardcoded URLs?
- Hardcoded configuration?

**If YES → Replace with context-provided values. Flag as violation.**

**If NO → Continue to Q2.**

**Q2: Does this code access state outside the current tenant?**
- Does it read another tenant's data?
- Does it write to another tenant's storage?
- Does it access shared state without going through proper isolation?

**If YES → This is a security violation. Do not proceed. Flag immediately.**

**If NO → Continue to Q3.**

**Q3: Does this code work in isolation?**
- Can it function without external services?
- Can it degrade gracefully when dependencies are unavailable?
- Does it have fallback behavior for offline scenarios?

**If YES → Multi-tenant compliant. Proceed.**
**If NO → Add offline fallback. The platform must work without external services.**

---

## Decision Tree 8: Code Quality Gate

Before any code is committed, it must pass this quality gate. Every item must be verified. A single failed item prevents commitment.

**Trigger:** Before completing any code task.

**Q1: Does the code follow existing patterns?**
- Have you read neighboring files for code style?
- Does the code use the same frameworks and libraries as the rest of the codebase?
- Does the code follow the same naming conventions?

**If NO → Refactor to match existing patterns.**

**Q2: Is the code free of sensitive information?**
- No API keys?
- No passwords?
- No tokens?
- No internal URLs that should not be exposed?

**If ANY sensitive information is found → Remove immediately.**

**Q3: Does the code have appropriate error handling?**
- Are edge cases handled?
- Are errors logged with context?
- Are failures graceful?

**If NO → Add error handling before proceeding.**

**Q4: Does the code have appropriate logging?**
- Are significant actions logged?
- Are errors logged?
- Is logging at the correct level (debug, info, warn, error)?

**If NO → Add logging before proceeding.**

**Q5: Is the code documented where necessary?**
- Are complex algorithms explained?
- Are non-obvious decisions documented?
- Are public APIs documented?

**If NO → Add documentation where the code is not self-explanatory.**

---

## Escalation Protocol

Not every decision has a pre-defined tree. When a decision falls outside the scope of the defined trees, follow this escalation protocol.

**Step 1: Check if the decision is documented in DECISION_LOG.md**
- Past decisions may have addressed this situation
- Follow established precedent when it exists

**Step 2: Check if the decision is covered by an invariant**
- ARCHITECTURAL-INVARIANTS.md may prohibit certain approaches
- If an invariant applies, the decision is already made

**Step 3: Check if the decision is covered by a design principle**
- DESIGN_PRINCIPLES.md may guide the approach
- Principles are not rules, but they indicate the correct direction

**Step 4: Flag to the Architect**
- Describe the decision that needs to be made
- Present the options with pros and cons
- State your recommendation with rationale
- Wait for the Architect's decision before proceeding

**Never improvise. Never assume. Never guess. When in doubt, ask.**

---

## Decision Tree Index

| ID | Name | Trigger |
|----|------|---------|
| DT-01 | Code Location | Creating a new file or module |
| DT-02 | Existence Check | Creating any new thing |
| DT-03 | Event System | Cross-capability communication needed |
| DT-04 | Dependency Handling | New dependency identified |
| DT-05 | Capability Scope | New business function to implement |
| DT-06 | Documentation Update | Any code or architecture change |
| DT-07 | Multi-Tenant Compliance | Code running in tenant context |
| DT-08 | Code Quality Gate | Before completing any code task |

---

*AI Decision Framework — Valdi Engine*
*Complements: MASTER_CONTEXT.md, ARCHITECTURAL-INVARIANTS.md, ENGINEERING-STANDARDS.md, AI_OPERATING_MANUAL.md*
*Status: Active — Required procedure for all architectural and code decisions*
