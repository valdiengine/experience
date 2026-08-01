/**
 * Runtime Health Suite (P13.5.7)
 *
 * Asserts the real runtime's health surface: engine.healthCheck(), module
 * inventory, and the startup:health_ready event.
 */
import { start, cleanup } from '../../runtime/startup/application.start.js'
import { createEventBus } from '../../shared/events/eventbus.js'
import { createMockEventBus } from '../capability/capability.mock.eventbus.js'
import { runIfMain } from '../capability/run.main.js'

export async function run() {
  const startedAt = performance.now()
  const results = []
  const add = (id, pass, detail) => results.push({ id: `runtime.health:${id}`, pass, detail })

  const bus = createMockEventBus(createEventBus())
  const bundle = await start({ eventBus: bus })

  try {
    const health = await bundle.engine.healthCheck()

    add('health-returns', Boolean(health), 'engine.healthCheck() returned a result')
    add('health-runtime', health.runtime === 'healthy', `runtime status: ${health.runtime}`)
    add('health-database', health.database === 'healthy', `database status: ${health.database}`)
    add('health-repository', health.repository === 'healthy', `repository status: ${health.repository}`)
    add('health-authentication', health.authentication !== 'unhealthy', `authentication status: ${health.authentication}`)
    add('health-authorization', health.authorization !== 'unhealthy', `authorization status: ${health.authorization}`)
    add('health-cms', health.cms !== 'unhealthy', `cms status: ${health.cms}`)
    add('health-application', health.application === 'ready' || health.application === 'degraded', `application status: ${health.application}`)

    const modules = bundle.engine.listModules()
    for (const required of ['database', 'auth', 'authorization', 'cms', 'repository']) {
      add(`module:${required}`, modules.includes(required), `module "${required}" registered`)
    }

    add('health-ready-event', bus.has('startup:health_ready'), 'startup:health_ready emitted')

    const validationChecks = bundle.validation?.checks || []
    add('validation-checks-nonempty', validationChecks.length > 0, `runtime validation checks: ${validationChecks.length}`)
  } finally {
    await cleanup(bundle)
  }

  return { suite: 'runtime.health', results, executionTimeMs: Math.round(performance.now() - startedAt) }
}

export default run

runIfMain(run, import.meta.url)
