# AI Context Compaction

> The standard format for compacting AI session context into a portable handoff document.
> When a conversation grows too long, this format preserves all critical state for the next session.
> Complements: AI_BOOT_SEQUENCE.md, AI_DECISION_FRAMEWORK.md, MASTER_CONTEXT.md, CURRENT_STATE.md

---

## Purpose

AI sessions are finite. Context windows have limits. Conversations grow long. When a session reaches its practical limit — or when the Architect wants to start a fresh session with accumulated context — the current state must be compressed into a portable format that the next session can read and resume from.

This document defines that format. It is not a summary. It is a structured handoff that preserves everything the next session needs to continue correctly.

Without a standard compaction format, context is lost. Decisions are forgotten. Progress is duplicated. Inconsistencies are introduced. The compaction format prevents this by ensuring that every session handoff contains the same essential information in the same predictable structure.

---

## When to Compact

Compaction should happen when any of the following conditions are true:

**Context saturation.** The conversation has grown long enough that earlier messages are being truncated or forgotten. The AI is repeating questions that were already answered. The AI is suggesting work that was already completed.

**Natural break point.** A phase, sub-phase, or significant unit of work has been completed. The next phase requires fresh context focused on new objectives.

**Architect request.** The Architect explicitly asks to compact the session and start fresh.

**Decision accumulation.** Many small decisions have been made that the next session needs to be aware of, but the raw conversation is too long to parse.

**AI session ending.** The current AI session is about to end, and the work will continue in a new session.

---

## Compaction Format

The compaction document follows a rigid structure. Every section must be present. If a section has no content, write "None" rather than omitting the section. The structure is the contract. Omitting sections breaks the contract and risks information loss.

### Section 1: Session Metadata

This section identifies the session and its temporal context.

```
## Session Metadata
- **Session Date:** [YYYY-MM-DD]
- **Session Duration:** [Approximate duration]
- **AI Model:** [Model name if known]
- **Architect:** [Name or identifier]
- **Session Number:** [Sequential number if tracked]
```

### Section 2: Objective

This section states the original objective of the session. It must be written from the Architect's perspective — what they wanted to accomplish.

```
## Objective
[What the Architect set out to accomplish in this session. Written as a clear, specific statement. Not a summary of what was done — that comes later. This is the "why" of the session.]
```

### Section 3: Completed Work

This section lists everything that was accomplished during the session. Each item must be specific enough that the next session can verify it independently.

```
## Completed Work
### [Category 1]
- [Specific item 1]: [Brief description of what was done]
- [Specific item 2]: [Brief description of what was done]

### [Category 2]
- [Specific item 1]: [Brief description of what was done]
- [Specific item 2]: [Brief description of what was done]
```

Categories should be chosen based on the work type. Common categories include:
- Code changes (files created, modified, deleted)
- Documentation (files created, modified)
- Architecture (decisions made, specs created)
- Testing (tests written, results)
- Fixes (bugs fixed, issues resolved)

### Section 4: In-Progress Work

This section describes work that was started but not finished. It must include enough context that the next session can pick up where this one left off without re-reading the entire conversation.

```
## In-Progress Work
### [Task 1]
- **Status:** [What has been done so far]
- **Remaining:** [What still needs to be done]
- **Files involved:** [List of files being worked on]
- **Dependencies:** [What this task depends on]
- **Blockers:** [Any obstacles preventing completion]

### [Task 2]
- **Status:** [What has been done so far]
- **Remaining:** [What still needs to be done]
- **Files involved:** [List of files being worked on]
- **Dependencies:** [What this task depends on]
- **Blockers:** [Any obstacles preventing completion]
```

### Section 5: Open Decisions

This section lists decisions that were discussed but not finalized, or decisions that were made but not yet implemented. These are the choices the next session needs to be aware of.

```
## Open Decisions
### [Decision 1]
- **Question:** [What needs to be decided]
- **Options considered:** [List of options]
- **Recommendation:** [What was recommended, if any]
- **Status:** [Awaiting Architect input / Decided but not implemented / Deferred]

### [Decision 2]
- **Question:** [What needs to be decided]
- **Options considered:** [List of options]
- **Recommendation:** [What was recommended, if any]
- **Status:** [Awaiting Architect input / Decided but not implemented / Deferred]
```

### Section 6: Modified Files

This section lists every file that was created, modified, or deleted during the session. This is critical for the next session to know what the current state of the codebase looks like.

```
## Modified Files
### Created
- [path/to/file1.js]: [Purpose of the file]
- [path/to/file2.md]: [Purpose of the file]

### Modified
- [path/to/file3.js]: [What changed and why]
- [path/to/file4.md]: [What changed and why]

### Deleted
- [path/to/file5.js]: [Why it was deleted]
```

### Section 7: Key Architectural Decisions

This section captures significant architectural decisions made during the session. These are decisions that affect the platform's structure, not just individual files.

```
## Key Architectural Decisions
### [Decision 1]
- **Context:** [Why this decision was needed]
- **Decision:** [What was decided]
- **Rationale:** [Why this approach was chosen]
- **Consequences:** [What this means for future work]
- **Invariants affected:** [Any invariants that were created, modified, or validated]

### [Decision 2]
- **Context:** [Why this decision was needed]
- **Decision:** [What was decided]
- **Rationale:** [Why this approach was chosen]
- **Consequences:** [What this means for future work]
- **Invariants affected:** [Any invariants that were created, modified, or validated]
```

### Section 8: Technical Debt Changes

This section tracks changes to the technical debt inventory. New items, resolved items, and modified items.

```
## Technical Debt Changes
### New Items
- [TD-XXX]: [Description] [Priority: CRITICAL/HIGH/MEDIUM/LOW/FUTURE]

### Resolved Items
- [TD-XXX]: [Description] [Resolution: How it was resolved]

### Modified Items
- [TD-XXX]: [Description] [Change: What changed about this item]
```

### Section 9: Next Steps

This section provides clear guidance for what the next session should focus on. It must be specific, actionable, and prioritized.

```
## Next Steps
### Priority 1 (Immediate)
- [Specific task with clear acceptance criteria]

### Priority 2 (After Priority 1)
- [Specific task with clear acceptance criteria]

### Priority 3 (When time permits)
- [Specific task with clear acceptance criteria]
```

### Section 10: Verification State

This section documents what has been verified and what has not. This prevents the next session from assuming verification was done when it was not.

```
## Verification State
### Verified
- [What was verified and how]
- [What was verified and how]

### Not Verified
- [What was not verified and why]
- [What was not verified and why]
```

### Section 11: Blockers and Risks

This section documents anything that is preventing progress or creating risk.

```
## Blockers and Risks
### Blockers
- [Description of blocker] [Impact: What this prevents] [Mitigation: How to work around it]

### Risks
- [Description of risk] [Probability: High/Medium/Low] [Impact: What could happen] [Mitigation: How to reduce the risk]
```

### Section 12: Context for Next Session

This section provides any additional context that the next session needs but that does not fit into the other sections. This is a catch-all for important information.

```
## Context for Next Session
- [Any additional context the next session needs]
- [Any corrections to assumptions the next session might make]
- [Any warnings about pitfalls encountered]
```

---

## Compaction Quality Standards

A compaction document must be:

**Specific.** "Updated documentation" is not specific. "Updated CAPABILITY_INDEX.md to add locality capability with 3 events" is specific. The next session must be able to verify your claims independently.

**Actionable.** "Continue with the next phase" is not actionable. "Create the database schema for the bookings table with fields: id, tenant_id, service_id, customer_id, date, status, notes" is actionable. The next session must know exactly what to do.

**Honest.** If something was not done, say it was not done. If something failed, say it failed. If something is uncertain, say it is uncertain. A compaction document that hides problems creates more problems than it solves.

**Complete.** Every section must be present. Every significant decision must be captured. Every modified file must be listed. Omission is not compression — it is information loss.

**Current.** The compaction document must reflect the state at the moment of compaction, not the state at the beginning of the session. If a decision was made and then reversed, the compaction document must reflect the reversal.

---

## Resuming from Compaction

When an AI reads a compaction document at the start of a new session, it must:

**Step 1: Read the compaction document in full.** Do not skip sections. Do not skim. The compaction document is the previous session's memory, compressed into a portable format.

**Step 2: Execute the standard boot sequence.** The compaction document supplements the boot sequence — it does not replace it. Read MASTER_CONTEXT.md, CURRENT_STATE.md, and the other mandatory documents after reading the compaction document.

**Step 3: Verify the compaction document against the codebase.** Check that the files listed as "Created" actually exist. Check that the files listed as "Modified" contain the described changes. The compaction document is a record of intent — the codebase is the record of fact.

**Step 4: Identify the current objective.** From the compaction document's "Next Steps" section and the Architect's current request, determine what needs to be done.

**Step 5: Resume.** Begin working from the compaction state. Do not re-do completed work. Do not re-raise resolved decisions. Do not re-create deleted files. The compaction document is your starting point.

---

## Compaction Checklist

Before finalizing a compaction document, verify:

- [ ] All 12 sections are present
- [ ] Every modified file is listed with its change
- [ ] Every decision is captured with rationale
- [ ] Every blocker is documented with mitigation
- [ ] Next steps are specific and actionable
- [ ] Verification state is honest
- [ ] Technical debt changes are accurate
- [ ] The document is specific, actionable, honest, complete, and current

---

## Example Compaction Document

The following is a minimal example to illustrate the format. Real compaction documents will be longer and more detailed.

```
## Session Metadata
- **Session Date:** 2026-07-28
- **Session Duration:** ~2 hours
- **AI Model:** Claude
- **Architect:** Developer
- **Session Number:** 47

## Objective
Complete P11.7 — Platform SDK & Developer Experience by creating all SDK specification documents.

## Completed Work
### Documentation
- SDK-ARCHITECTURE.md: Created with SDK module architecture, layers, contracts
- CLI-SPECIFICATION.md: Created with 26 CLI commands and their specifications
- SCAFFOLDING-STANDARDS.md: Created with code generation templates and rules
- CODE-GENERATION.md: Created with generation pipeline and template system
- VALIDATION-ENGINE.md: Created with 10 validation categories
- PROJECT-TEMPLATES.md: Created with 14 project templates
- DX-GUIDE.md: Created with developer experience guide
- SDK-README.md: Created with SDK documentation and quick start
- VALDI-STUDIO-VISION.md: Created with visual studio vision

### Architecture
- Updated MASTER_CONTEXT.md to include SDK layer
- Updated CURRENT_STATE.md with P11.7 completion

## In-Progress Work
### AI Brain Files
- **Status:** AI_BOOT_SEQUENCE.md created; AI_DECISION_FRAMEWORK.md and AI_CONTEXT_COMPACTION.md in progress
- **Remaining:** Complete AI_DECISION_FRAMEWORK.md and AI_CONTEXT_COMPACTION.md
- **Files involved:** docs/ai/AI_BOOT_SEQUENCE.md, docs/ai/AI_DECISION_FRAMEWORK.md, docs/ai/AI_CONTEXT_COMPACTION.md
- **Dependencies:** None
- **Blockers:** None

## Open Decisions
### P12 Scope
- **Question:** Should P12 include database setup or start with REST API?
- **Options considered:** Database-first vs API-first
- **Recommendation:** Database-first (REST API depends on data models)
- **Status:** Awaiting Architect input

## Modified Files
### Created
- docs/ai/AI_BOOT_SEQUENCE.md: AI startup sequence
- docs/sdk/SDK-ARCHITECTURE.md: SDK architecture specification
- docs/sdk/CLI-SPECIFICATION.md: CLI command specifications
- docs/sdk/SCAFFOLDING-STANDARDS.md: Code generation standards
- docs/sdk/CODE-GENERATION.md: Code generation pipeline
- docs/sdk/VALIDATION-ENGINE.md: Validation engine specification
- docs/sdk/PROJECT-TEMPLATES.md: Project templates
- docs/sdk/DX-GUIDE.md: Developer experience guide
- docs/sdk/SDK-README.md: SDK documentation
- docs/vision/VALDI-STUDIO-VISION.md: Visual studio vision

### Modified
- docs/ai/MASTER_CONTEXT.md: Added SDK layer to architecture
- docs/ai/CURRENT_STATE.md: Updated with P11.7 completion

## Key Architectural Decisions
### SDK as L12 Layer
- **Context:** Platform needs a developer-facing API layer
- **Decision:** Add L12 as SDK layer in the architecture
- **Rationale:** Separates developer experience from runtime concerns
- **Consequences:** SDK changes do not affect core engine; SDK can evolve independently
- **Invariants affected:** None (new layer does not conflict with existing invariants)

## Technical Debt Changes
### New Items
- None

### Resolved Items
- None

## Next Steps
### Priority 1 (Immediate)
- Complete AI_DECISION_FRAMEWORK.md and AI_CONTEXT_COMPACTION.md
- Update all documentation with P11.7 completion

### Priority 2 (After Priority 1)
- Begin P12 — Infrastructure & Real Providers (database schema, REST API)

### Priority 3 (When time permits)
- Begin P13 — Real-World Integration (email, payments, analytics)

## Verification State
### Verified
- All 9 SDK specification documents created and cross-referenced
- CURRENT_STATE.md updated with accurate counts

### Not Verified
- SDK specification completeness against actual engine code (deferred to P12)

## Blockers and Risks
### Blockers
- None

### Risks
- SDK specifications may need adjustment when actual providers are implemented (Low probability, Low impact)

## Context for Next Session
- P11.7 is complete — all SDK specification documents are in docs/sdk/
- The next logical phase is P12 — Infrastructure & Real Providers
- AI Brain files are being completed — the new files complement the existing AI_OPERATING_MANUAL.md
```

---

*AI Context Compaction — Valdi Engine*
*Complements: AI_BOOT_SEQUENCE.md, AI_DECISION_FRAMEWORK.md, MASTER_CONTEXT.md, CURRENT_STATE.md*
*Status: Active — Required format for all session handoffs*
