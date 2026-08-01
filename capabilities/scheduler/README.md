## Scheduler Capability

Generic scheduling layer for capabilities.

### Structure

```
scheduler/
├── scheduler.capability.js   — Main capability
├── scheduler.manager.js      — Job management
├── scheduler.schema.js       — Data schemas
├── scheduler.events.js       — Event definitions
├── scheduler.jobs.js         — Job builder and handlers
└── README.md
```

### Architecture

```
SchedulerCapability
  ↓
SchedulerManager
  ├── schedule(jobDef) → create job
  ├── cancel(jobId) → stop job
  ├── run(jobId) → execute now
  ├── tick() → check due jobs
  └── getJobs() → list all
```

### Job Types

- **delayed** — Execute after delay
- **recurring** — Execute on interval
- **one_time** — Execute at specific time

### Business-agnostic

- No knowledge of tourism, drones, etc.
- Only understands: jobs, handlers, schedules
- No business logic inside scheduler

### Usage

```js
await scheduler.schedule({
  type: 'delayed',
  handler: 'checkExpiration',
  payload: { reservationId: 'res_123' },
  delayMs: 86400000, // 24 hours
})
```
