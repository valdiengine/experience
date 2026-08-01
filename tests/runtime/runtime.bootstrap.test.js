/**
 * Runtime Bootstrap Suite (P13.5.7)
 *
 * Boots the real application bundle (start()) and asserts the startup contract:
 * deterministic event order, repository/capability registration counts, runtime
 * validation and start() idempotency.
 */
import { start, cleanup } from '../../runtime/startup/application.start.js'
import { createEventBus } from '../../shared/events/eventbus.js'
import { createMockEventBus } from '../capability/capability.mock.eventbus.js'
import { runIfMain } from '../capability/run.main.js'

const STARTUP_ORDER = [
  'startup:started',
  'startup:runtime_ready',
  'startup:repositories_ready',
  'startup:capabilities_ready',
  'startup:contexts_ready',
  'startup:health_ready',
  'startup:completed',
]

export async function run() {
  const startedAt = performance.now()
  const results = []
  const add = (id, pass, detail) => results.push({ id: `runtime.bootstrap:${id}`, pass, detail })

  const bus = createMockEventBus(createEventBus())
  const bundle = await start({ eventBus: bus })

  try {
    add('start-resolves', Boolean(bundle?.engine), 'start() resolved a runtime bundle')
    add('engine-present', Boolean(bundle.engine), 'bundle.engine present')

    const emitted = bus.events().filter((e) => STARTUP_ORDER.includes(e.event)).map((e) => e.event)
    const orderOk = JSON.stringify(emitted) === JSON.stringify(STARTUP_ORDER)
    add('startup-event-order', orderOk, `startup events in fixed order: ${emitted.join(', ')}`)

    add('startup-events-complete', STARTUP_ORDER.every((ev) => bus.has(ev)), 'all 7 startup events emitted')

    const repoCount = bundle.repositoryRuntime?.registry?.list?.().length ?? bundle.repositoryRuntime?.registry?.count ?? -1
    add('repositories-registered', repoCount === 12, `repositories registered: ${repoCount}`)

    add('capabilities-registered', bundle.capabilityRegistry?.size === 9, `capabilities registered: ${bundle.capabilityRegistry?.size}`)

    add('runtime-validation', bundle.validation?.valid === true, 'validateRuntime passed')

    const secondBus = createMockEventBus(createEventBus())
    const second = await start({ eventBus: secondBus })
    const idempotent = Boolean(second?.engine) && second.capabilityRegistry?.size === 9 && Boolean(second.repositoryRuntime)
    add('start-idempotent', idempotent, 'second start() returns the same bundle shape')
    await cleanup(second)
  } finally {
    await cleanup(bundle)
  }

  return { suite: 'runtime.bootstrap', results, executionTimeMs: Math.round(performance.now() - startedAt) }
}

export default run

runIfMain(run, import.meta.url)
