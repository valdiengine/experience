# AI RULES

> Immutable AI rules. Never bypass.

---

## Version

1.0

---

## Core Rules

1. Always read AI_BOOTSTRAP.md before any action
2. Never bypass BusinessService
3. Never redesign frozen architecture
4. Never duplicate workflows
5. Never access repositories from controllers
6. Never introduce infrastructure into Domain
7. Always preserve Design Freeze
8. Never modify Business Managers directly
9. Never violate Aggregate Ownership
10. Never bypass Business Managers

---

## Implementation Rules

11. Features adapt to the architecture
12. The architecture never adapts to individual features
13. Every change requires Architecture Validation
14. Never skip the reading order
15. Never rewrite history (append-only for sessions)

---

## Entry Point Rules

16. Controllers access BusinessService via capability?.service
17. Never use capability?.getXxxService()
18. Never access sub-managers directly from controllers
19. All persistence via Repository layer only

---

## Design Freeze Rules

20. Frozen components cannot be modified without:
    - Architecture Proposal
    - Architecture Audit
    - Design Freeze approval
21. No infrastructure imports in capabilities
22. No SQL/ORM in capabilities
23. No direct capability imports

---

## Validation Rules

24. Run smoke test before declaring implementation complete
25. Verify Architecture Consistency before any change
26. Check Design Freeze before any modification
27. Update session report after each session
