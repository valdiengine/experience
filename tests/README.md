# Capability Test Infrastructure (P13.5.7)

Reusable, deterministic, provider-independent test framework for every future
capability. Business-agnostic infrastructure: it only exercises the runtime,
the repository contract and the capability lifecycle. It adds **zero** business
logic and does **not** modify the runtime, the startup bundle, or
`runtime/startup/smoke.test.js`.

## Layout

```
tests/
  README.md                      <- this file
  capability/                    <- shared framework (reused by all suites)
    capability.base.test.js      <- BaseCapabilityTest lifecycle
    capability.assertions.js     <- reusable assertions
    capability.context.factory.js<- RuntimeFactory (builds a test runtime)
    capability.mock.repositories.js <- in-memory repository adapter
    capability.mock.eventbus.js  <- recording event bus wrapper
    capability.mock.runtime.js   <- mock auth/authorization/search/sync/cms
  fixtures/                      <- deterministic entity fixtures
    business.fixture.js
    accommodation.fixture.js
    availability.fixture.js
    visitor.fixture.js
    reservation.fixture.js
  runtime/                       <- runtime-level suites (real application.start)
    runtime.bootstrap.test.js
    runtime.health.test.js
    runtime.smoke.test.js
  aggregate/                     <- cross-capability scenarios
    business.lifecycle.test.js
    availability.lifecycle.test.js
    visitor.lifecycle.test.js
    reservation.lifecycle.test.js
    commercial.aggregate.test.js
  reports/
    generate.js                  <- runs every suite, writes latest-report.json/.md
```

## Running

Portable Node (v24) is required:

```powershell
& "C:\Users\casa\AppData\Local\Temp\opencode\node\node-v24.18.1-win-x64\node.exe" tests/reports/generate.js
```

A single suite runs standalone, e.g.:

```powershell
& "...\node.exe" tests/aggregate/reservation.lifecycle.test.js
```

## BaseCapabilityTest lifecycle

Every suite inherits the same deterministic lifecycle:

1. Create Runtime   - build a fresh RuntimeFactory bundle (isolated per suite)
2. EventBus         - recording wrapper around the real bus
3. Mock Repos       - in-memory adapter registered before first resolution
4. Register Caps    - all commercial capabilities register + activate
5. Execute          - the scenario under test
6. Validate Repo    - assertions against the in-memory store
7. Validate Events  - assertions against emitted events
8. Validate Auth/Search - assertions against mock authorization + search payloads
9. Destroy          - teardown (dispose runtime, clear stores)

## Quality gate

After every future phase:

1. Static validation (import graph)
2. Runtime smoke test (`runtime/startup/smoke.test.js`)
3. Capability tests (`tests/capability/*`)
4. Aggregate tests (`tests/aggregate/*`)
5. Architecture validation (dependency rules)
6. Documentation update
