# AI OPERATING SYSTEM

> Master explanation of the AI documentation ecosystem.

---

## Version

1.0

---

## Purpose

The AI Operating System provides deterministic onboarding for any AI working on this repository.

Every AI (ChatGPT, Claude, MiniMax, Gemini, DeepSeek, Kimi, Qwen, Codex, Cursor, Windsurf, Continue, OpenCode, VSCode Agents) recovers the same architecture understanding by reading the same documents in the same order.

---

## Design Principles

1. **Single Source of Truth**: One document, one responsibility
2. **Append-Only History**: No rewriting of session logs
3. **Verified Facts Only**: All values obtained from repository
4. **No Duplication**: Each document has unique purpose
5. **Deterministic Recovery**: Any AI, same result

---

## Document Ecosystem

```
AI_BOOTSTRAP.md
    ↓
00_READ_FIRST.md
    ↓
PROJECT_CONTEXT.md
    ↓
ARCHITECTURE_FINGERPRINT.md
    ↓
AI_SESSION_REPORT.md
AI_DECISIONS.md
ARCHITECTURE_CHANGELOG.md
AI_RULES.md
AI_HANDSHAKE.md
    ↓
CURRENT_STATE.md
NEXT_PHASE.md
    ↓
Implementation
    ↓
Smoke Test
    ↓
Audit
    ↓
Documentation Update
```

---

## Reading Flow

### Entry Point: AI_BOOTSTRAP.md

Every AI session starts by reading `docs/architecture/AI_BOOTSTRAP.md`.

This document:
- Defines Architecture Version
- Lists all supported AI systems
- Sets mandatory boot process
- Establishes "Do NOT implement first" rule

### Step 1: 00_READ_FIRST.md

Defines the mandatory 12-step reading order:
1. DESIGN_FREEZE.md
2. ARCHITECTURE_IMMUTABLE.md
3. MASTER_ARCHITECTURE.md
4. MASTER_ARCHITECTURE.puml
5. MASTER_ARCHITECTURE.mmd
6. API_LAYER.md
7. API_RUNTIME_INTEGRATION.md
8. COMMERCIAL_AGGREGATE_FINAL_VALIDATION.md
9. COMMERCIAL_AGGREGATE_ENTRY_POINT_VALIDATION.md
10. CURRENT_STATE.md
11. ROADMAP.md
12. NEXT_PHASE.md

### Step 2: PROJECT_CONTEXT.md

Provides permanent snapshot:
- Project Vision
- Architecture Philosophy
- DDD Principles
- Commercial Aggregate
- Platform Layers
- Runtime Engine
- Repository Engine
- Business Managers
- REST API
- Current Phase
- Frozen Components
- Immutable Rules
- Design Freeze Status

### Step 3: ARCHITECTURE_FINGERPRINT.md

Single source of truth with ONLY verified facts:
- Architecture Version
- Documentation Version
- Context Version
- Design Freeze
- Architecture Score
- Current Phase
- Last Completed Phase
- Next Phase
- Aggregate Root
- Official Runtime Entry
- Official Commercial Entry Point
- Registered Capabilities
- Infrastructure Providers
- Last Validation
- Last Smoke Test
- Status

---

## Lifecycle

### Phase 1: Onboarding

1. Read AI_BOOTSTRAP.md
2. Read 00_READ_FIRST.md
3. Follow reading order
4. Build internal architecture model

### Phase 2: Context Recovery

1. Read PROJECT_CONTEXT.md
2. Read CURRENT_STATE.md
3. Read NEXT_PHASE.md
4. Read ROADMAP.md

### Phase 3: Verification

1. Read ARCHITECTURE_FINGERPRINT.md
2. Verify Design Freeze status
3. Confirm entry points
4. Check frozen components

### Phase 4: Implementation

1. Complete AI_HANDSHAKE checklist
2. Verify all checks pass
3. Implement only if ready

### Phase 5: Validation

1. Run smoke test
2. Verify architecture consistency
3. Check Design Freeze compliance

### Phase 6: Documentation

1. Update AI_SESSION_REPORT.md
2. Add new entries to ARCHITECTURE_CHANGELOG.md if needed
3. Update AI_DOCUMENTATION_AUDIT.md if needed

---

## Design Freeze

### Purpose

Design Freeze locks the Commercial Aggregate architecture at P13.8.

### Frozen Components

- Business Aggregate
- BusinessService
- Business Managers
- Repository Engine
- Runtime Engine
- Capability Registration
- Aggregate Ownership
- Event Model

### Change Process

1. Architecture Proposal
2. Architecture Audit
3. Design Freeze approval

### Verification

Every AI must verify Design Freeze is ACTIVE before implementing.

---

## Architecture Recovery

When an AI needs to recover architecture context:

1. Read `AI_BOOTSTRAP.md`
2. Follow `00_READ_FIRST.md` reading order
3. Read `PROJECT_CONTEXT.md`
4. Verify `ARCHITECTURE_FINGERPRINT.md`
5. Check `AI_HANDSHAKE.md` checklist

Result: Complete, deterministic architecture understanding.

---

## Context Recovery

When an AI needs to recover project state:

1. Read `CURRENT_STATE.md`
2. Read `NEXT_PHASE.md`
3. Check `ROADMAP.md`
4. Review `AI_SESSION_REPORT.md`

Result: Complete understanding of where the project is and where it's going.

---

## Implementation Workflow

```
AI_BOOTSTRAP.md
    ↓
Verify Architecture Understanding
    ↓
Check Design Freeze
    ↓
Identify Current Phase
    ↓
Complete AI_HANDSHAKE
    ↓
Implement
    ↓
Run Smoke Test
    ↓
Verify Architecture Consistency
    ↓
Update Session Report
```

---

## Validation Workflow

```
Before Implementation:
- AI_HANDSHAKE checklist complete
- All checks YES
- Design Freeze verified

After Implementation:
- Smoke test passes (95+)
- Architecture consistency maintained
- No Design Freeze violations

```

---

## Audit Workflow

```
AI_DOCUMENTATION_AUDIT.md
    ↓
Verify Reading Order
    ↓
Check Broken References
    ↓
Verify Version Consistency
    ↓
Verify Context Consistency
    ↓
Verify Architecture Consistency
    ↓
Check Frozen Rules
    ↓
Verify Document Responsibilities
    ↓
Check Duplicate Information
    ↓
Score: 100/100
```

---

## Documentation Workflow

```
After Each Session:
1. Append to AI_SESSION_REPORT.md
2. Update ARCHITECTURE_CHANGELOG.md if architecture evolved
3. Update AI_DOCUMENTATION_AUDIT.md if needed
4. Update version numbers if needed
```

---

## Future AI Sessions

### Minimal Context Recovery

Every future AI session requires only:

> "Read `docs/architecture/AI_BOOTSTRAP.md` and follow its instructions."

This single instruction leads to:
1. Full architecture recovery
2. Complete context understanding
3. Deterministic implementation readiness

### Session Start

At session start, AI verifies:

- Architecture Version: **P13.8 Design Freeze + P14.FINAL API Closure**
- Design Freeze: **ACTIVE**
- Current Phase: **P14.FINAL**
- Entry Point: **BusinessService via capability?.service**
- Frozen Components: **8 components**
- Status: **PLATFORM CERTIFIED**

---

## Document Index

| Document | Responsibility | Location |
|----------|---------------|----------|
| AI_BOOTSTRAP.md | Mandatory onboarding | docs/architecture/ |
| 00_READ_FIRST.md | Reading order | docs/architecture/ |
| PROJECT_CONTEXT.md | Project snapshot | docs/architecture/ |
| ARCHITECTURE_FINGERPRINT.md | Verified facts | docs/architecture/ |
| AI_SESSION_REPORT.md | Session history | docs/architecture/ |
| AI_DECISIONS.md | Frozen decisions | docs/architecture/ |
| ARCHITECTURE_CHANGELOG.md | Architecture evolution | docs/architecture/ |
| AI_RULES.md | Immutable rules | docs/architecture/ |
| AI_HANDSHAKE.md | Pre-implementation checklist | docs/architecture/ |
| AI_DOCUMENTATION_AUDIT.md | Consistency audit | docs/architecture/ |
| AI_OPERATING_SYSTEM.md | Master explanation | docs/architecture/ |
| CURRENT_STATE.md | Implementation state | docs/ai/ |
| NEXT_PHASE.md | Next target | docs/ai/ |
| ROADMAP.md | Development phases | docs/roadmap/ |
| DESIGN_FREEZE.md | Frozen components | docs/architecture/ |
| ARCHITECTURE_IMMUTABLE.md | Immutable rules | docs/architecture/ |
| MASTER_ARCHITECTURE.md | Platform overview | docs/architecture/ |

---

## Master Reading Order

1. AI_BOOTSTRAP.md
2. 00_READ_FIRST.md
3. PROJECT_CONTEXT.md
4. ARCHITECTURE_FINGERPRINT.md
5. DESIGN_FREEZE.md
6. ARCHITECTURE_IMMUTABLE.md
7. MASTER_ARCHITECTURE.md
8. MASTER_ARCHITECTURE.puml
9. MASTER_ARCHITECTURE.mmd
10. API_LAYER.md
11. API_RUNTIME_INTEGRATION.md
12. COMMERCIAL_AGGREGATE_FINAL_VALIDATION.md
13. COMMERCIAL_AGGREGATE_ENTRY_POINT_VALIDATION.md
14. CURRENT_STATE.md
15. ROADMAP.md
16. NEXT_PHASE.md
17. AI_SESSION_REPORT.md
18. AI_DECISIONS.md
19. ARCHITECTURE_CHANGELOG.md
20. AI_RULES.md
21. AI_HANDSHAKE.md
22. AI_DOCUMENTATION_AUDIT.md

---

## Version

| Item | Version |
|------|---------|
| AI Operating System | 1.0 |
| Architecture Version | P13.8 Design Freeze + P14.FINAL API Closure |
| Documentation Version | 1.0 |
| Context Version | P14.FINAL |

---

## End of AI Operating System

This document defines the complete AI documentation ecosystem.

Every AI recovers the same understanding by following the same reading order.

Features adapt to architecture. Architecture never adapts to features.

---

**Architecture Version: P13.8 Design Freeze + P14.x Runtime/API Integration**

**Status: ACTIVE**
