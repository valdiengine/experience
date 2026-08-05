# AI DECISIONS

> Frozen architectural decisions. Each decision is immutable once approved.

---

## Version

1.0

---

## Decision Format

| Field | Description |
|-------|-------------|
| Decision ID | Unique identifier (e.g., D-001) |
| Decision | Clear statement of the decision |
| Reason | Why this decision was made |
| Consequences | What this decision affects |
| Status | FROZEN, ACTIVE, DEPRECATED |
| Related Documents | References to relevant docs |

---

## Decisions

### D-001

| Field | Value |
|-------|-------|
| Decision ID | D-001 |
| Decision | BusinessService is the ONLY official Commercial Aggregate entry point |
| Reason | Per P14.1.5.5: Controllers must never access Capability.service directly |
| Consequences | All 6 route files corrected to use capability?.service |
| Status | FROZEN |
| Related Documents | P14.1.5.5, COMMERCIAL_AGGREGATE_ENTRY_POINT_VALIDATION.md |

---

### D-002

| Field | Value |
|-------|-------|
| Decision ID | D-002 |
| Decision | Business is the Aggregate Root for all commercial entities |
| Reason | Per P13.8 Design Freeze: Business owns Accommodation, Availability, Reservation, Visitor, Payment, Notification |
| Consequences | No commercial entity can be an aggregate root |
| Status | FROZEN |
| Related Documents | DESIGN_FREEZE.md, MASTER_ARCHITECTURE.md |

---

### D-003

| Field | Value |
|-------|-------|
| Decision ID | D-003 |
| Decision | Business Managers orchestrate business logic |
| Reason | Managers delegate to sub-managers; controllers access BusinessService only |
| Consequences | Controllers never call sub-managers directly |
| Status | FROZEN |
| Related Documents | DESIGN_FREEZE.md, BUSINESS-CAPABILITY.md |

---

### D-004

| Field | Value |
|-------|-------|
| Decision ID | D-004 |
| Decision | Repositories own all persistence |
| Reason | Isolation of persistence concerns; capabilities have zero SQL/ORM |
| Consequences | Controllers and managers never access repositories directly |
| Status | FROZEN |
| Related Documents | MASTER_ARCHITECTURE.md, REPOSITORY-UOW-ARCHITECTURE.md |

---

### D-005

| Field | Value |
|-------|-------|
| Decision ID | D-005 |
| Decision | Runtime owns infrastructure |
| Reason | Capabilities remain runtime-agnostic |
| Consequences | No HTTP, SMTP, Stripe imports in capabilities |
| Status | FROZEN |
| Related Documents | PLATFORM-RUNTIME-ARCHITECTURE.md |

---

### D-006

| Field | Value |
|-------|-------|
| Decision ID | D-006 |
| Decision | Architecture Freeze at P13.8 |
| Reason | Commercial Aggregate reached architectural maturity |
| Consequences | No changes to frozen components without Architecture Proposal + Audit + Design Freeze approval |
| Status | FROZEN |
| Related Documents | DESIGN_FREEZE.md, ARCHITECTURE_IMMUTABLE.md |

---

### D-007

| Field | Value |
|-------|-------|
| Decision ID | D-007 |
| Decision | Capabilities communicate via events exclusively |
| Reason | Loose coupling between capabilities |
| Consequences | No direct imports between capability files |
| Status | FROZEN |
| Related Documents | MASTER_ARCHITECTURE.md, EVENT_FLOW.md |

---

### D-008

| Field | Value |
|-------|-------|
| Decision ID | D-008 |
| Decision | API Layer uses BusinessService via capability?.service |
| Reason | P14.1.5.5 decision: OPTION A |
| Consequences | Route files must use capability?.service, not capability?.getXxxService() |
| Status | FROZEN |
| Related Documents | P14.1.5.5, API_LAYER.md, API_RUNTIME_INTEGRATION.md |

---

### D-009

| Field | Value |
|-------|-------|
| Decision ID | D-009 |
| Decision | API Runtime Bootstrap via startWithApi() |
| Reason | P14.1: Unified startup for Runtime + API |
| Consequences | application.start() integrates API with RuntimeContext |
| Status | FROZEN |
| Related Documents | API_RUNTIME_INTEGRATION.md, application.start.js |

---

### D-010

| Field | Value |
|-------|-------|
| Decision ID | D-010 |
| Decision | Controller isolation from repositories |
| Reason | Controllers only access BusinessService, never repositories directly |
| Consequences | All persistence operations routed through BusinessService → BusinessManager → Repository |
| Status | FROZEN |
| Related Documents | API_LAYER.md, BUSINESS-CAPABILITY.md |
