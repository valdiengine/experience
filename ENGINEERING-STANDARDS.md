# ENGINEERING-STANDARDS.md — Valdi Engine Engineering Handbook

## Purpose
This document defines the permanent engineering standards for the Valdi Engine. Every future capability, module, and contribution must comply with these standards before being accepted into the platform.

---

## 1. File Organization Rules

### Directory Structure
```
capabilities/
  {capability-name}/
    {capability-name}.capability.js    # Main capability class
    {capability-name}.schema.js        # Entity schemas
    {capability-name}.events.js        # Event definitions
    {capability-name}.manager.js       # Primary manager
    README.md                          # Capability documentation
    {sub-modules}/                      # Optional sub-directories
      {module}.manager.js
```

### Naming Rules
- Capability folders: lowercase, hyphenated (`seo-intelligence`, `pwa-engine`)
- Capability files: dot-separated (`booking.capability.js`, `booking.events.js`)
- Manager files: dot-separated (`notification.manager.js`)
- Schema files: dot-separated (`booking.schema.js`)
- Event files: dot-separated (`booking.events.js`)
- README: always `README.md` (uppercase)

### File Size Guidelines
- Capability files: <200 lines
- Manager files: <300 lines
- Event files: <100 lines
- Schema files: <150 lines
- If larger, consider splitting into sub-modules

---

## 2. Capability Creation Checklist

Every new capability MUST:

- [ ] Extend BaseCapability
- [ ] Declare static id, name, version, dependencies
- [ ] Implement init(context), activate(), deactivate(), destroy()
- [ ] Export both named and default: `export class XCapability extends BaseCapability` + `export default XCapability`
- [ ] Have a README.md
- [ ] Have a schema file (if managing entities)
- [ ] Have an events file (if emitting/listening to events)
- [ ] Follow the single responsibility principle
- [ ] Not import from higher layers
- [ ] Not import from sibling capabilities directly
- [ ] Communicate via EventBus or context.capabilities.get()
- [ ] Use this.on()/this.off() for event listeners
- [ ] Clean up all resources in deactivate() and destroy()

---

## 3. Manager Design Guidelines

### Single Responsibility
Each manager owns ONE business domain. If a manager exceeds 300 lines or handles multiple concerns, split it.

### Public API
- Export the class with named export
- Constructor receives context parameter
- init() for setup
- destroy() for cleanup
- Methods should be small and focused

### Internal State
- Use private fields (#field) for internal state
- Never expose internal Maps/Sets directly
- Provide getter methods for read access

### Error Handling
- Wrap risky operations in try/catch
- Log errors with context
- Emit error events for observability
- Never silently swallow errors

---

## 4. Event Naming Conventions

### Standard Format
```
domain:entity.action
```

### Examples
- `booking:created`
- `reservation:confirmed`
- `ecology:observation.created`
- `economy:partner.registered`

### Rules
- Use colons as primary separator
- Use dots for sub-entity separation
- Domain must be lowercase singular
- Entity must be lowercase singular
- Action must be past tense (created, updated, confirmed)
- No underscores in event names (use dots instead)
- Events must be defined in {domain}.events.js files

### Reserved Events
Events that are defined but not yet produced/consumed should be marked with:
```javascript
// Reserved: Future extension point
EVENT_NAME: 'domain:entity.action'
```

---

## 5. Dependency Rules

### Declaration
- All capabilities must declare `static dependencies = [...]`
- Dependencies represent initialization order, not import relationships
- Empty array `[]` is valid and preferred over omission

### Import Rules
- Never import from a higher layer (L(n) → L(n+1) is forbidden)
- Never import from sibling capabilities directly
- Use context.capabilities.get() for cross-capability access
- Use shared/ for utilities, constants, and base classes
- Core engine imports from shared/, never from src/

### Forbidden
- Circular dependencies between capabilities
- Direct capability-to-capability imports
- Business logic in shared/ or providers/
- Upward imports (core → src, capabilities → core)

---

## 6. Documentation Requirements

### Every Capability Must Have
- README.md with: purpose, dependencies, events, usage examples
- Schema file documenting entity structure
- Events file documenting event contracts

### Global Documentation
- All changes must update relevant docs/ files
- CURRENT_STATE.md must reflect exact project state
- ROADMAP.md must track all phases
- EVENT_INDEX.md must catalog all events
- CAPABILITY_INDEX.md must list all capabilities

### Cross-References
- Documentation must not reference non-existent files
- All links must be valid
- Version numbers must match code

---

## 7. Versioning Strategy

### Format
`MAJOR.MINOR.PATCH`

- MAJOR: Breaking changes to public API
- MINOR: New features, backward compatible
- PATCH: Bug fixes, no API changes

### Rules
- Start at 1.0.0
- Increment MINOR when adding new managers or significant features
- Increment PATCH for bug fixes
- All capabilities should track versions consistently
- Documentation versions must match code versions

---

## 8. Error Handling Conventions

### Pattern
```javascript
try {
  // risky operation
} catch (error) {
  console.error(`[CapabilityName] Operation failed:`, error);
  this.eventBus?.emit('capability:error', {
    capability: this.id,
    operation: 'operationName',
    error: error.message
  });
}
```

### Rules
- Always include capability name in error messages
- Emit error events for observability
- Log errors with context (capability, operation, tenant)
- Never silently swallow errors
- Never expose internal error details to users

---

## 9. Logging Conventions

### Format
```
[CapabilityName] Action: details
```

### Examples
```
[Booking] Created: reservation-123
[Intelligence] Recommendation generated: place-456
[Scheduler] Job completed: cleanup-task
```

### Levels
- error: System errors, data corruption
- warn: Degraded behavior, approaching limits
- info: Significant state changes
- debug: Detailed operational info (dev only)

---

## 10. Performance Guidelines

### Startup
- Initialize managers lazily (only when first needed)
- Defer heavy computation to activate()
- Use async operations where possible
- Set memory budgets per capability

### Runtime
- Cache frequently accessed data
- Use indexed lookups instead of array scans
- Batch related operations
- Avoid synchronous blocking operations
- Use event throttling for high-frequency events

### Memory
- Null references in destroy()
- Clear Maps/Sets in deactivate()
- Avoid retaining references to large objects
- Use WeakMap/WeakSet where appropriate

---

## 11. Testing Expectations

### Unit Tests
- Every shared utility must have unit tests
- Every manager method must have unit tests
- Test both success and error paths
- Mock external dependencies

### Integration Tests
- Test capability lifecycle (init → activate → deactivate → destroy)
- Test event emission and consumption
- Test cross-capability communication via context
- Test error handling and recovery

### Test Structure
```
{capability}/
  __tests__/
    {capability}.test.js
    {manager}.test.js
```

---

## 12. Code Review Checklist

Before accepting any contribution:

- [ ] Follows BaseCapability contract
- [ ] Has proper exports (named + default)
- [ ] Has README.md
- [ ] Dependencies declared
- [ ] Events follow naming convention
- [ ] No upward imports
- [ ] No business logic in shared/
- [ ] No circular dependencies
- [ ] Resources cleaned up in destroy()
- [ ] Error handling present
- [ ] Documentation updated
- [ ] Version incremented if needed
- [ ] No hardcoded tenant/brand values
- [ ] Single responsibility maintained

---

## Enforcement

Every future capability must comply with these standards before being accepted into the platform. The P11.5/P11.6 consolidation established these standards based on the organic patterns that emerged during development.

---
*Established during P11.6 Ecosystem Stabilization — Valdi Engine*
*Date: 2026-07-27*
