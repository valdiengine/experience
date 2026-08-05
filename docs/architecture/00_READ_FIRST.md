# READ FIRST

## Purpose

This document defines the mandatory reading order for understanding the project.

All architectural decisions originate from the documents listed below.

**Never skip the reading order.**

---

## Reading Order

### STEP 1

**DESIGN_FREEZE.md**

Purpose: Understand what parts of the architecture are frozen. Learn which components cannot be modified.

### STEP 2

**ARCHITECTURE_IMMUTABLE.md**

Purpose: Understand immutable architectural rules. Read forbidden modifications. Read architecture change process.

### STEP 3

**MASTER_ARCHITECTURE.md**

Purpose: Understand the complete platform. Read: Layers, Runtime, Capabilities, Repositories, Business Managers, Commercial Aggregate.

### STEP 4

**MASTER_ARCHITECTURE.puml**

Purpose: Understand architecture visually.

### STEP 5

**MASTER_ARCHITECTURE.mmd**

Purpose: Alternative architecture visualization.

### STEP 6

**API_LAYER.md**

Purpose: Understand REST architecture. Controller rules. Response rules. Routing rules.

### STEP 7

**API_RUNTIME_INTEGRATION.md**

Purpose: Understand Runtime bootstrap. RuntimeContext. Startup order.

### STEP 8

**COMMERCIAL_AGGREGATE_FINAL_VALIDATION.md**

Purpose: Read the final architecture audit.

### STEP 9

**COMMERCIAL_AGGREGATE_ENTRY_POINT_VALIDATION.md**

Purpose: Understand why BusinessService is the ONLY entry point.

### STEP 10

**CURRENT_STATE.md**

Purpose: Know current implementation state.

Location: `docs/ai/CURRENT_STATE.md`

### STEP 11

**ROADMAP.md**

Purpose: Know current development phase.

Location: `docs/roadmap/ROADMAP.md`

### STEP 12

**NEXT_PHASE.md**

Purpose: Know the next implementation target.

Location: `docs/ai/NEXT_PHASE.md`

---

## Mandatory Rules

- Never redesign frozen architecture.
- Never bypass BusinessService.
- Never bypass Business Managers.
- Never access repositories directly.
- Never introduce infrastructure into capabilities.
- Never violate Aggregate Ownership.
- Always preserve Design Freeze.

---

## Before Implementing Anything

Every AI agent must answer these questions:

1. Have I read all mandatory documents?
   **YES / NO**

2. Will this modification violate Design Freeze?
   **YES / NO**

3. Am I introducing infrastructure into the domain?
   **YES / NO**

4. Does this preserve the Commercial Aggregate?
   **YES / NO**

Only proceed if all answers are correct.

---

## AI Session Bootstrap

Whenever a new AI session starts, perform:

1. Read `00_READ_FIRST.md`
2. Read every document in order
3. Summarize the architecture
4. Identify current roadmap phase
5. Only then begin implementation
