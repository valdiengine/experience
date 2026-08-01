# Workflow Engine

Multi-step workflow execution engine for Valdi Engine. Supports visual flow definitions with triggers, conditions, actions, and delays.

## Architecture

```
workflows/engine/
├── workflow.schema.js        # Workflow, Node, Edge, Execution schemas
├── workflow.events.js        # 16 workflow events
├── workflow.engine.js        # Core execution engine
├── workflow.parser.js        # Parse + validate definitions
├── workflow.context.js       # Execution context (variables, services)
├── nodes/
│   ├── trigger.node.js       # Event, manual, schedule, webhook triggers
│   ├── condition.node.js     # Single/multi-condition with operators
│   ├── action.node.js        # Service calls, variable sets, transforms, logs
│   └── delay.node.js         # Fixed, dynamic, until, ms delays
├── workflows/
│   ├── booking.workflow.js   # Predefined booking lifecycle
│   └── lead.workflow.js      # Predefined lead capture & qualification
└── README.md
```

## Usage

```js
import { WorkflowEngine } from './workflows/engine/workflow.engine.js'
import { BOOKING_WORKFLOW } from './workflows/engine/workflows/booking.workflow.js'

const engine = new WorkflowEngine(eventBus, services)

// Register workflow
engine.register({ ...BOOKING_WORKFLOW, tenantId: 'tenant_123' })

// Activate
engine.activate('booking_workflow')

// Start execution
const { executionId } = await engine.start('booking_workflow', {
  customerName: 'John',
  customerEmail: 'john@test.com',
  resourceId: 'room_101',
  date: '2026-02-15',
})

// Check execution state
const execution = engine.getExecution(executionId)
console.log(execution.status) // 'completed'
console.log(execution.history) // [{ nodeId, type, name, startedAt, completedAt, success }]
```

## Node Types

| Type | Purpose |
|------|---------|
| trigger | Starts workflow (event, manual, schedule, webhook) |
| condition | Routes execution based on variables/results |
| action | Executes operations (service calls, transforms, logs) |
| delay | Pauses execution for a duration |
| end | Completes workflow execution |

## Condition Operators

equals, not_equals, gt, gte, lt, lte, contains, not_contains, in, not_in, is_empty, is_not_empty

## Execution States

pending → running → waiting (delay) → running → completed | failed | cancelled

## Predefined Workflows

### Booking Lifecycle
trigger → validate → check availability → reserve → send confirmation → end

### Lead Capture
trigger → score → qualify → send welcome → delay 1 day → follow-up → end

## Design Principles

- **Business-agnostic**: Workflows are generic multi-step flows
- **State machine**: Clear execution states with valid transitions
- **Event-driven**: Emits events at every step for observability
- **Context-based**: Variables + service references flow through execution
- **Serializable**: Workflow definitions and execution state can be persisted
