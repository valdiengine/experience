# AI BOOTSTRAP

## Architecture Version

Architecture Version: P13.8 Design Freeze + P14.FINAL API Closure

Every AI must verify that the documentation and implementation correspond to the same architecture version before continuing.

---

Version: 1.0

Status: ACTIVE

Last Updated: 2026-08-02 (Updated: P14.FINAL)

---

# Purpose

This document defines the mandatory onboarding procedure for every AI assistant working on this repository.

The objective is to guarantee architectural consistency across all AI systems.

Examples:

- ChatGPT
- Claude
- MiniMax
- Gemini
- Kimi
- Qwen
- DeepSeek
- Codex
- Cursor
- Windsurf
- Continue
- OpenCode
- VSCode Agents

Every AI must follow exactly the same onboarding sequence.

---

# IMPORTANT

Do NOT implement code immediately.

Do NOT answer implementation questions immediately.

Do NOT assume architectural decisions.

First recover the project context.

---

# Mandatory Boot Process

Execute every step in order.

---

## STEP 0 (Required First)

Execute:

```bash
node tools/onboarding.js
```

This is the ONLY official repository entry point. It will:
- Verify repository health
- Check Design Freeze status
- Inspect all components
- Print a dashboard
- Generate health reports

Read the output before proceeding.

---

## STEP 1

Read:

docs/architecture/00_READ_FIRST.md

Follow its reading order exactly.

---

## STEP 1.5 (Recommended)

After completing onboarding, read:

docs/architecture/PROJECT_HEALTH.md

This provides the operational state of the project before implementing.

---

## STEP 1.6 (Recommended)

For human onboarding, read:

docs/architecture/REPOSITORY_STARTUP.md

For system architecture, read:

docs/architecture/SELF_EXPLAINING_REPOSITORY.md

---

## STEP 2

Read every required architecture document.

Never skip documents.

---

## STEP 3

Build an internal architecture model.

Understand:

- Platform layers
- Runtime
- Repository Engine
- Business Aggregate
- Capability Engine
- Event System
- API Layer

---

## STEP 4

Determine current implementation state.

Read:

CURRENT_STATE.md

MASTER_CONTEXT.md

NEXT_PHASE.md

ROADMAP.md

CHANGELOG.md

---

## STEP 5

Determine Design Freeze state.

Confirm:

- Frozen architecture
- Immutable components
- Allowed modifications
- Forbidden modifications

---

## STEP 6

Verify architecture consistency.

Before proposing any implementation answer:

Confirm that your proposal does NOT violate:

- Aggregate ownership
- Repository boundaries
- Business Managers
- Runtime
- Design Freeze

---

## STEP 7

Summarize your understanding.

Internally verify:

Current phase
Current architecture
Current roadmap
Current frozen components
Current next task

---

# Before Writing Code

Answer internally:

Have I completed onboarding?

YES / NO

Do I understand the Design Freeze?

YES / NO

Does this implementation preserve Business Aggregate?

YES / NO

Am I bypassing BusinessService?

YES / NO

Am I introducing infrastructure into Domain?

YES / NO

Does this change require Architecture Approval?

YES / NO

Only continue if every answer is correct.

---

# Architecture Rules

Always preserve:

- Business Aggregate
- BusinessService
- Business Managers
- Repository Engine
- Capability Engine
- Runtime Engine
- Aggregate Ownership
- DDD
- Event Model
- Repository Isolation
- Controller Isolation

---

# Never Do

Never redesign the architecture.

Never bypass BusinessService.

Never bypass Business Managers.

Never call repositories from controllers.

Never duplicate business rules.

Never duplicate workflows.

Never introduce infrastructure inside capabilities.

Never violate Design Freeze.

---

# Development Rule

Features adapt to the architecture.

The architecture never adapts to individual features.

---

# End of Bootstrap

When onboarding is complete, implementation may begin.

Otherwise:

STOP.
