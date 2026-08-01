# AI Boot Sequence

> The startup procedure every AI must execute before contributing to Valdi Engine.
> This document is not architecture. It is the sequence that produces an informed AI.
> Complements: MASTER_CONTEXT.md, PROJECT_BOOT.md, CURRENT_STATE.md, AI_OPERATING_MANUAL.md

---

## Purpose

An AI that starts working without reading the project's documentation will make incorrect assumptions. It will suggest features that already exist. It will violate architectural rules it never learned. It will create duplicate capabilities, break dependency graphs, and introduce inconsistencies that accumulate over time.

This document defines the exact sequence an AI must follow to reach an informed state. It is not optional. It is not a recommendation. It is a prerequisite for participation.

Every AI — ChatGPT, Kimi, Claude, Gemini, OpenCode, or any future agent — must execute this boot sequence at the start of every new session. There are no exceptions.

---

## Boot Philosophy

**Every AI starts from the same source of truth.** No AI may assume it already knows the project state. Even if the same AI contributed to the previous session, it must re-read the current state. Sessions are independent. Context does not carry over automatically.

**Never assume.** Do not assume the number of capabilities. Do not assume the current phase. Do not assume what was last modified. Do not assume what the Architect wants. Read the source. The source is always more recent than your training data.

**Read before acting.** No code should be written, no architecture proposed, no documentation modified until the boot sequence is complete. Reading is not a delay — it is the foundation of correct work.

**Architecture first. Code second.** The boot sequence prioritizes architectural understanding over code familiarity. An AI that understands the layer model, the capability contract, and the event system will produce better code than an AI that jumps directly into implementation.

**Completeness is not required on first pass.** The boot sequence has five priority levels. An AI must complete Priority 1 and Priority 2 before starting any work. Priority 3 through 5 can be read on-demand as the task requires. But Priority 1 and Priority 2 are non-negotiable.

---

## Mandatory Reading Order

The following documents must be read in this exact order. Each document builds upon the previous one. Skipping a document creates a gap in understanding that will manifest as incorrect decisions.

### Phase 1: Identity (What is this project?)

**START**

**1. `docs/ai/MASTER_CONTEXT.md`**

This is the single source of truth for the entire platform. It defines what Valdi Engine is, its design system, its architecture layers, its golden rules, its capability contract, and its file structure. Everything else in the documentation ecosystem references this document.

Read this file first. Always. Without exception.

Key information extracted:
- Platform identity (what it is and what it is not)
- Architecture layers (L0-L11)
- Golden rules (14 rules that must never be broken)
- Capability contract (the interface every capability must implement)
- File structure per capability
- Design system tokens

**2. `docs/ai/CURRENT_STATE.md`**

This is the exact snapshot of the project at this moment. It tells you how many phases are complete, how many capabilities exist, what architecture specs have been created, what documents exist, and what was last modified.

Read this file second. It prevents you from suggesting work that is already done.

Key information extracted:
- Phases completed (exact count and list)
- Capabilities registered (exact count and list with versions)
- Architecture specs created
- Consolidation and stabilization documents
- Technical debt items
- Last actions performed
- Next steps

**3. `docs/ai/NEXT_PHASE.md`**

This tells you what the Architect intends to work on next. It provides prioritized options with rationale. Reading this prevents you from proposing work that is not aligned with the project's current direction.

Key information extracted:
- Current priorities
- Recommended next step
- What infrastructure is missing
- What testing is needed

### Phase 2: Structure (How is this project organized?)

**4. `docs/ai/PROJECT_BOOT.md`**

This is the quick-start guide that shows the codebase structure, the rules of engagement, and the common patterns. It is the bridge between documentation and code.

Key information extracted:
- Codebase directory structure
- DO and DON'T rules
- Verification checklist
- Common patterns (capability creation, registration, event emission)

**5. `docs/ai/CAPABILITY_INDEX.md`**

This is the complete registry of all 26 capabilities. It lists every capability's ID, name, version, dependencies, purpose, files, and events. Reading this prevents you from creating duplicate capabilities.

Key information extracted:
- All 26 capability IDs and names
- Dependency relationships
- Event lists per capability
- Which capabilities belong to which layer

### Phase 3: Architecture (How does this project think?)

**6. `docs/architecture/SYSTEM_OVERVIEW.md`**

This provides the high-level architecture diagram and key components. It shows how the layers interact, how data flows, and how the platform is structured.

Key information extracted:
- Architecture diagram
- Key components and their roles
- Multi-tenant isolation model
- Destination hierarchy

**7. `docs/architecture/CAPABILITY_MAP.md`**

This shows how capabilities relate to each other. The dependency graph, the capability groups, and the cross-capability event flows.

Key information extracted:
- Capability dependency graph
- Capability groups (Core, Business, Public, Destination)
- Cross-capability event flows

**8. `docs/architecture/LAYER_MODEL.md`**

This defines all 12 layers (L0-L11) with their paths, purposes, contents, rules, and import restrictions. This is critical for preventing layer violations.

Key information extracted:
- Layer definitions
- Import rules per layer
- What each layer contains
- What each layer must not contain

### Phase 4: Rules (What must never be violated?)

**9. `ARCHITECTURAL-INVARIANTS.md`**

The 14 immutable rules. These must never be violated. Read this before any architectural decision.

Key information extracted:
- All 14 invariants with rationale and evidence
- Amendment process
- What constitutes a violation

**10. `ENGINEERING-STANDARDS.md`**

The engineering handbook. File organization, capability creation checklist, manager design, event naming, dependency rules, documentation requirements, versioning strategy, error handling, logging, performance, testing, and code review.

Key information extracted:
- File organization rules
- Capability creation checklist
- Manager design guidelines
- Event naming conventions
- Dependency rules

**11. `docs/knowledge/DESIGN_PRINCIPLES.md`**

The 14 immutable design principles. These guide all design decisions.

Key information extracted:
- All 14 design principles
- The philosophical foundation of the platform
- Why certain decisions were made

### Phase 5: Deep Context (On-demand)

**12. `ROADMAP.md`**

What phases are complete, what comes next, what capabilities exist, and the platform's trajectory.

**13. `docs/ai/EVENT_INDEX.md`**

All ~425 events cataloged with their producers and consumers.

**14. `docs/ai/DECISION_LOG.md`**

Past architectural decisions with context, rationale, and consequences.

**15. `docs/knowledge/PLATFORM_GLOSSARY.md`**

Official vocabulary. Use the correct terms.

**16. `docs/knowledge/WHY.md`**

Why the platform exists. The fundamental purpose.

**17. `docs/knowledge/PLATFORM_MANIFESTO.md`**

The visionary declaration.

**18. `docs/vision/2030_VISION.md`**

Where the platform is headed.

**19. `docs/api/DATA_CONTRACTS.md`**

Entity schemas and data structures.

**20. `docs/roadmap/TECHNICAL_DEBT.md`**

Known issues and their priority.

**READY**

---

## Bootstrap Checklist

Before writing any code, proposing any architecture, or modifying any documentation, the AI must verify the following. Every item must be confirmed. A single unverified item can lead to incorrect work.

**Project State:**
- [ ] I know the exact number of completed phases (from CURRENT_STATE.md)
- [ ] I know the exact number of registered capabilities (from CURRENT_STATE.md)
- [ ] I know the current phase and its objectives (from NEXT_PHASE.md)
- [ ] I know what was last modified (from CURRENT_STATE.md "Last Actions")
- [ ] I know the total event count (from CURRENT_STATE.md)

**Architecture:**
- [ ] I understand the layer model (L0-L11) and import rules
- [ ] I understand the capability contract (id, name, version, dependencies, lifecycle)
- [ ] I understand the event system and naming convention
- [ ] I understand the 14 architectural invariants
- [ ] I understand the 14 design principles

**Capabilities:**
- [ ] I can list all 26 capabilities by ID
- [ ] I understand the dependency graph
- [ ] I know which capabilities belong to which layer
- [ ] I know which capabilities have events and which do not
- [ ] I understand the capability registration process

**Technical Debt:**
- [ ] I know how many debt items exist (from CURRENT_STATE.md)
- [ ] I know the priority distribution (CRITICAL, HIGH, MEDIUM, LOW, FUTURE)
- [ ] I know which items are resolved and which are active

**Documentation:**
- [ ] I know where each type of information lives (source of truth for each domain)
- [ ] I understand the cross-reference system
- [ ] I know which documents must be updated when changes are made

---

## Session Initialization

When starting a new conversation, follow this sequence. Each step builds upon the previous one.

**Step 1: Understand the Task**

Before reading any documentation, understand what the Architect is asking for.
- What is the specific request?
- Is it code generation, analysis, documentation, or architectural review?
- What domain does it affect? (Which capability? Which layer?)

**Step 2: Execute Boot Sequence (Priorities 1-2)**

Read MASTER_CONTEXT.md, CURRENT_STATE.md, NEXT_PHASE.md, PROJECT_BOOT.md, and CAPABILITY_INDEX.md. This takes approximately 2-3 minutes but prevents hours of incorrect work.

**Step 3: Locate the Affected Area**

Based on the task, identify:
- Which capability is affected?
- Which layer does the change belong to?
- What existing code is relevant?
- What events are involved?
- What dependencies are affected?

**Step 4: Review Dependencies**

Before modifying any file, understand its context:
- What imports this file?
- What does this file import?
- What events does this file emit or consume?
- What other capabilities does this file interact with?

**Step 5: Check EventBus**

If the task involves cross-capability communication:
- What events already exist for this domain?
- Are there dead events that could be reused?
- What is the correct event naming convention?
- Who will consume the new events?

**Step 6: Review Documentation**

If the task will affect documentation:
- What documents reference the affected files?
- What documents must be updated?
- Are there cross-references that will break?

**Step 7: Verify Architecture**

Before implementing:
- Does the proposed change respect the layer model?
- Does it follow the capability contract?
- Does it violate any architectural invariant?
- Is it multi-tenant compatible?
- Does it work offline?

**Step 8: Code**

Only after all previous steps are complete should code be written. By this point, the AI has the full context needed to produce correct, consistent, architecture-compliant code.

---

## Recovery Procedure

Sometimes the boot sequence cannot be completed fully. Context may be incomplete. Documentation may conflict. The conversation may have been compacted. The following procedures handle these situations.

### Incomplete Context

If some documents are unavailable or unreadable:
1. Proceed with what is available
2. Explicitly state which documents were not read
3. Do not make assumptions about unavailable information
4. Ask the Architect for clarification on missing context
5. Flag the gap in your output so it can be addressed

### Documentation Conflicts

If two documents contradict each other:
1. The more recently updated document takes precedence (check "Last updated" headers)
2. MASTER_CONTEXT.md takes precedence over all other documents
3. ARCHITECTURAL-INVARIANTS.md takes precedence over design suggestions
4. CURRENT_STATE.md takes precedence over ROADMAP.md for current state
5. If the conflict cannot be resolved, flag it to the Architect

### Context Compaction

If the conversation has been compacted (see AI_CONTEXT_COMPACTION.md for the standard compaction format):
1. Read the compaction summary
2. Identify the current objective
3. Identify what has been completed
4. Identify what remains
5. Identify any open decisions or blockers
6. Resume from the compaction state, not from the beginning

### Roadmap Changed

If the roadmap has been updated since the last session:
1. Read the updated ROADMAP.md
2. Check CURRENT_STATE.md for the current phase
3. Check NEXT_PHASE.md for current priorities
4. Do not assume the previous session's roadmap is current

### Capability Not Found

If a capability that should exist cannot be located:
1. Check CAPABILITY_INDEX.md for the exact folder name
2. Check register.js for the registration entry
3. Check if the capability was renamed or moved
4. If it genuinely does not exist, flag it as a documentation inconsistency

---

## AI Startup Validation

The final checklist before beginning work. Every item must be verified. If any item cannot be verified, the AI must explicitly state the uncertainty.

**Identity Verification:**
- [ ] I have read MASTER_CONTEXT.md
- [ ] I understand what Valdi Engine is (and what it is not)
- [ ] I understand the 14 golden rules

**State Verification:**
- [ ] I have read CURRENT_STATE.md
- [ ] I know the exact project state (phases, capabilities, events)
- [ ] I know what was last modified

**Architecture Verification:**
- [ ] I understand the layer model
- [ ] I understand the capability contract
- [ ] I understand the event system
- [ ] I understand the 14 architectural invariants

**Task Verification:**
- [ ] I understand the specific request
- [ ] I have identified the affected area
- [ ] I have reviewed relevant dependencies
- [ ] I have checked for existing events
- [ ] I have verified architecture compliance

**Documentation Verification:**
- [ ] I know which documents will need updating
- [ ] I understand the cross-reference system
- [ ] I know the source of truth for each information domain

If all items are verified, the AI is bootstrapped and ready to contribute. If any item is not verified, the AI must either complete the verification or explicitly state the gap before proceeding.

---

## Time Budget

The boot sequence is an investment, not a delay. The following time budgets apply:

| Phase | Documents | Estimated Time |
|-------|-----------|---------------|
| Phase 1: Identity | 3 files | 2 minutes |
| Phase 2: Structure | 2 files | 1 minute |
| Phase 3: Architecture | 3 files | 2 minutes |
| Phase 4: Rules | 3 files | 2 minutes |
| Phase 5: Deep Context | 8+ files | On-demand |
| **Total (Phase 1-4)** | **11 files** | **~7 minutes** |

Seven minutes of reading prevents hours of incorrect work. Every time.

---

*AI Boot Sequence — Valdi Engine*
*Complements: MASTER_CONTEXT.md, PROJECT_BOOT.md, CURRENT_STATE.md, AI_OPERATING_MANUAL.md*
*Status: Active — Required procedure for all AI assistants*
