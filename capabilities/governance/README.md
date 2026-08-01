# Governance Capability

**Version:** 1.0.0 | **Status:** Active | **Dependencies:** None

## Purpose

Destination Governance & Ecosystem Administration Layer. Provides the operational backbone for managing destination ecosystems at scale through permissions, workflows, approvals, quality control, and operational coordination.

## Architecture

```
governance/
├── governance.schema.js          # Schemas and enums (roles, workflows, moderation, audit)
├── governance.events.js          # Event definitions
├── governance.manager.js         # Core governance manager (entities, health scores)
├── roles/
│   └── role.manager.js           # RBAC role & permission management
├── workflows/
│   └── workflow.manager.js       # Approval workflow engine
├── moderation/
│   └── moderation.manager.js     # Content moderation system
├── audit/
│   └── audit.manager.js          # Ecosystem audit trail
├── dashboards/
│   └── governance.analytics.js   # Governance dashboards
├── governance.capability.js      # Capability entry point
└── README.md
```

## Modules

### GovernanceManager
Core manager handling governance entities, health score calculation, entity hierarchy.

### RoleManager
RBAC system with 7 roles (Platform Admin to Visitor), hierarchical permissions, custom permission support.

### WorkflowManager
Generic workflow engine with 4 default templates (Content Approval, Ecological Validation, Business Verification, Campaign Approval). Supports state transitions: pending, in_review, approved, rejected, revision_needed.

### ModerationManager
4-level moderation system: AI Filter → Community → Manager Review → Admin Decision. Supports appeals.

### AuditManager
Complete audit trail with indexed queries by actor, entity, action. Tracks all governance actions.

### GovernanceAnalytics
Dashboards for Platform, Destination, Locality, Partner, and Scientific views.

## Roles

| Role | Scope | Key Permissions |
|------|-------|----------------|
| Platform Admin | Platform | Manage destinations, configure capabilities, override decisions |
| Destination Manager | Destination | Approve content, manage localities, view analytics |
| Locality Manager | Locality | Approve local places, create events, validate businesses |
| Partner Manager | Business | Edit profile, manage experiences, view analytics |
| Ecological Validator | Scientific | Validate observations, edit species records |
| Community Leader | Community | Create missions, moderate content, recognize contributors |
| Visitor | Personal | Create memories, submit observations, participate |

## Integration

Listens to events from:
- exploration (place discovery)
- ecology (observations)
- economy (partner registration)
- community (content reports)
- engagement (badge awards)

Produces events:
- governance.destination.created/approved/updated
- governance.place.submitted/approved/rejected
- governance.business.registered/verified
- governance.observation.validated
- governance.content.flagged
- governance.moderation.completed
- governance.audit.created
- governance.workflow.state.changed
- governance.health.calculated

## Key Concepts

- **Governance does not own data** — only controls workflows and permissions
- **All actions generate audit events** — full traceability
- **Permissions are hierarchical** — higher roles inherit lower permissions
- **Destination autonomy preserved** — platform intervenes only for policy violations
- **Scientific validation independent** — no business or community pressure
- **AI assists but does not replace** — human judgment remains final
