/**
 * P13.5.6 — End-to-End Runtime Smoke Test
 *
 * Executes the complete commercial platform startup via application.start() and
 * verifies: startup sequence, registries, contexts, repositories, capabilities,
 * health, event order, shutdown, cleanup idempotency, and graceful failure handling.
 *
 * Failure-mode probes use isolated engines/registries (documented scaffolding);
 * the production path uses ONLY application.start().
 *
 * Run: node runtime/startup/smoke.test.js
 */
import { performance } from 'node:perf_hooks'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { start } from './application.start.js'
import { STARTUP_EVENTS } from './startup.events.js'
import { BOOTSTRAP_EVENTS } from '../bootstrap/bootstrap.events.js'
import { createEventBus } from '../../shared/events/eventbus.js'
import { RuntimeEngine } from '../runtime.engine.js'
import { TenantRepository } from '../../capabilities/persistence/repositories/tenant/tenant.repository.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const results = []
let eventsLog = []
let startedAtMs = 0
let finishedAtMs = 0

const record = (category, id, pass, detail = '') => {
  results.push({ category, id, pass: Boolean(pass), detail: String(detail || (pass ? 'ok' : 'FAIL')) })
}

const expectError = async (fn, expectedName) => {
  try {
    await fn()
    return { thrown: false, name: null, message: '' }
  } catch (err) {
    return { thrown: true, name: err?.name, message: err?.message }
  }
}

async function main() {
  const eventBus = createEventBus()

  // ---- capture events ----
  eventsLog = []
  const subscribed = new Set()
  for (const value of Object.values(STARTUP_EVENTS)) {
    eventBus.on(value, (evt) => { if (!subscribed.has(evt?.event)) { subscribed.add(evt?.event); eventsLog.push({ event: evt?.event, ts: evt?.timestamp }) } })
  }
  const bootstrapStepDurations = {}
  eventBus.on(BOOTSTRAP_EVENTS.BOOT_STEP_COMPLETED, (evt) => { bootstrapStepDurations[evt?.payload?.step] = evt?.payload?.duration })
  eventBus.on(BOOTSTRAP_EVENTS.BOOT_FAILED, (evt) => { bootstrapStepDurations['BOOT_FAILED'] = evt?.payload?.error })

  // ---- START ----
  startedAtMs = performance.now()
  let bundle
  try {
    bundle = await start({ eventBus })
  } catch (err) {
    finishedAtMs = performance.now()
    record('startup', 'start', false, `${err?.name}: ${err?.message}`)
    printReport()
    process.exit(1)
  }
  finishedAtMs = performance.now()

  const startupDurationMs = Math.round(finishedAtMs - startedAtMs)

  // 1. Startup
  record('startup', 'application.start', true)
  record('startup', 'runtime.started', Boolean(bundle.engine?.started), `started=${Boolean(bundle.engine?.started)}`)
  record('startup', 'bootstrap.completed', Boolean(bundle.pipeline?.health && bundle.pipeline?.engine), 'pipeline produced health + engine')
  record('startup', 'eventbus.initialized', typeof bundle.eventBus?.emit === 'function' && typeof bundle.eventBus?.on === 'function', 'on/emit present')

  // 2. Runtime modules
  record('modules', 'repository.runtime', Boolean(bundle.repositoryRuntime?.initialized), `initialized=${Boolean(bundle.repositoryRuntime?.initialized)}`)
  record('modules', 'authentication.runtime', Boolean(bundle.authenticationRuntime?.initialized), `initialized=${Boolean(bundle.authenticationRuntime?.initialized)}`)
  record('modules', 'authorization.runtime', Boolean(bundle.engine?.getModule?.('authorization')?.initialized), 'module present + initialized')
  record('modules', 'cms.runtime', Boolean(bundle.cmsRuntime?.initialized), `initialized=${Boolean(bundle.cmsRuntime?.initialized)}`)

  // 3. Registries
  const repoCount = bundle.repositoryRuntime?.registry?.count || 0
  record('registries', 'repositories.all', repoCount === 12, `count=${repoCount} (expected 12)`)
  const commercialRepos = ['business', 'accommodation', 'availability', 'reservation', 'visitor', 'owner', 'booking', 'notification', 'opportunity']
  const missingRepos = commercialRepos.filter((n) => !bundle.repositoryRuntime?.registry?.isRegistered?.(n))
  record('registries', 'repositories.commercial', missingRepos.length === 0, missingRepos.length ? `missing: ${missingRepos.join(',')}` : '9/9')

  const capCount = bundle.capabilityRegistry?.size || 0
  record('registries', 'capabilities.all', capCount === 9, `count=${capCount} (expected 9)`)
  const commercialCaps = ['business', 'accommodation', 'availability', 'reservation', 'visitor', 'owner', 'booking', 'notifications', 'opportunity']
  const missingCaps = commercialCaps.filter((id) => !bundle.capabilityRegistry?.has?.(id))
  record('registries', 'capabilities.commercial', missingCaps.length === 0, missingCaps.length ? `missing: ${missingCaps.join(',')}` : '9/9')
  const activeCaps = (bundle.capabilityRegistry?.getActive?.() || []).map((c) => c.id)
  record('registries', 'capabilities.active', activeCaps.length === 9, `active=${activeCaps.length}`)

  // 4. Contexts
  const ctx = bundle.capabilityContext
  record('contexts', 'context.runtime', Boolean(ctx?.runtime), typeof ctx?.runtime === 'object' ? 'ok' : 'missing')
  record('contexts', 'context.repositories', typeof ctx?.repositories === 'object' && ctx?.repositories !== null, 'facade present')
  record('contexts', 'context.eventBus', typeof ctx?.eventBus?.emit === 'function', 'eventBus injected')
  record('contexts', 'context.runtime.auth', Boolean(ctx?.runtime?.auth), 'auth module reachable')
  record('contexts', 'context.runtime.cms', Boolean(ctx?.runtime?.cms), 'cms module reachable')
  record('contexts', 'context.runtime.repository', Boolean(ctx?.runtime?.repository), 'repository module reachable')
  record('contexts', 'context.runtime.search', ctx?.runtime?.search === null, `search=${String(ctx?.runtime?.search)} (declared future slot)`)
  record('contexts', 'context.runtime.sync', ctx?.runtime?.sync === null, `sync=${String(ctx?.runtime?.sync)} (declared future slot)`)

  // 5. Event order
  const expectedOrder = [
    STARTUP_EVENTS.STARTED,
    STARTUP_EVENTS.RUNTIME_READY,
    STARTUP_EVENTS.REPOSITORIES_READY,
    STARTUP_EVENTS.CAPABILITIES_READY,
    STARTUP_EVENTS.CONTEXTS_READY,
    STARTUP_EVENTS.HEALTH_READY,
    STARTUP_EVENTS.COMPLETED,
  ]
  const actualOrder = eventsLog.map((e) => e.event)
  const orderOk = expectedOrder.every((e, i) => actualOrder[i] === e)
  record('events', 'order', orderOk, `actual=[${actualOrder.join(' > ')}]`)
  record('events', 'monotonic.timestamps', eventsLog.every((e, i) => i === 0 || e.ts >= eventsLog[i - 1].ts), 'timestamps non-decreasing')

  // 6. Repository validation (mock responses)
  const repoContext = { tenant: { id: 'commercial' }, eventBus: bundle.eventBus }
  for (const name of commercialRepos) {
    try {
      const repo = await bundle.repositoryRuntime.get(name, repoContext)
      const methods = ['findById', 'findOne', 'findMany', 'findAll', 'create', 'createMany', 'update', 'updateMany', 'delete', 'count', 'exists', 'paginate', 'validate', 'initialize', 'destroy']
      const missingMethods = methods.filter((m) => typeof repo?.[m] !== 'function')
      const findById = await repo.findById('x', { throwIfNotFound: false })
      const findMany = await repo.findMany({})
      const findOne = await repo.findOne({})
      const count = await repo.count({})
      const exists = await repo.exists({})
      const findAll = await repo.findAll({})
      const paginate = await repo.paginate({}, 1, 10)
      const mockOk =
        findById === null && Array.isArray(findMany) && findMany.length === 0 && findOne === null &&
        count === 0 && exists === false && Array.isArray(findAll) && findAll.length === 0 &&
        paginate && Array.isArray(paginate.items) && paginate.total === 0
      record('repositories', name, missingMethods.length === 0 && mockOk,
        missingMethods.length ? `missing methods: ${missingMethods.join(',')}` : `mock: findById=null findMany=[] findOne=null count=0 exists=false paginate.total=0`)
    } catch (err) {
      record('repositories', name, false, `${err?.name}: ${err?.message}`)
    }
  }

  // 7. Capability validation
  for (const id of commercialCaps) {
    try {
      const cap = bundle.capabilityRegistry.get(id)
      const stateOk = cap?.state === 'active' || cap?.state === 'ACTIVE'
      const contextOk = cap?.context === ctx
      const serviceOk = Boolean(cap?.service || cap?.manager)
      record('capabilities', `resolve.${id}`, Boolean(cap) && stateOk && contextOk, `state=${cap?.state} context=${contextOk} service=${serviceOk}`)
    } catch (err) {
      record('capabilities', `resolve.${id}`, false, `${err?.name}: ${err?.message}`)
    }
  }

  // Capabilities resolve each other ONLY via context.capabilities.get()
  for (const id of commercialCaps) {
    try {
      const cap = bundle.capabilityRegistry.get(id)
      const peer = cap?.context?.capabilities?.get?.(id) === cap
      record('capabilities', `peer.${id}`, Boolean(cap) && peer, peer ? 'context.capabilities.get() resolves' : 'not resolvable via get()')
    } catch (err) {
      record('capabilities', `peer.${id}`, false, `${err?.name}: ${err?.message}`)
    }
  }

  // Business resolves Accommodation/Availability/Reservation/Visitor/Opportunity through Runtime
  for (const peer of ['accommodation', 'availability', 'reservation', 'visitor', 'opportunity']) {
    try {
      const business = bundle.capabilityRegistry.get('business')
      const resolved = business?.context?.capabilities?.get?.(peer)
      record('capabilities', `business->${peer}`, Boolean(resolved), resolved ? `resolved ${peer}` : `NOT resolvable: ${peer}`)
    } catch (err) {
      record('capabilities', `business->${peer}`, false, `${err?.name}: ${err?.message}`)
    }
  }

  // Static scan: capabilities never import another capability directly, no infra imports
  const crossImportIssues = scanCapabilityImports()
  record('capabilities', 'no.direct.capability.imports', crossImportIssues.length === 0, crossImportIssues.length ? crossImportIssues.join('; ') : 'no cross-capability imports')
  record('capabilities', 'no.infra.imports', scanInfraImports().length === 0, scanInfraImports().length ? scanInfraImports().join('; ') : 'no infrastructure imports')

  // 8. Health
  const health = await aggregateHealth(bundle)
  const healthRows = ['application', 'runtime', 'authentication', 'authorization', 'cms', 'repository', 'commercial', 'bootstrap']
  for (const key of healthRows) {
    record('health', key, health[key] === 'healthy' || health[key] === 'ready', `${key}=${health[key]}`)
  }
  record('health', 'all', healthRows.every((k) => health[k] === 'healthy' || health[k] === 'ready'))

  // 9. Failure validation (isolated probes)
  await runFailureProbes(bundle, repoContext)

  // 10. Shutdown + idempotent cleanup
  const t0c = performance.now()
  const firstCleanup = await bundle.cleanup()
  const t1c = performance.now()
  record('shutdown', 'cleanup.first', firstCleanup === true, `returned=${firstCleanup}`)
  record('shutdown', 'engine.stopped', Boolean(!bundle.engine?.started), `started=${Boolean(bundle.engine?.started)}`)
  const secondCleanup = await bundle.cleanup()
  record('shutdown', 'cleanup.second.idempotent', secondCleanup === true, `returned=${secondCleanup}`)

  // 11. Timing
  const shutdownDurationMs = Math.round(t1c - t0c)
  const startupStages = computeStageTiming()

  printReport({ startupDurationMs, shutdownDurationMs, bootstrapStepDurations, startupStages, health })
}

async function aggregateHealth(bundle) {
  const engineHealth = await bundle.engine.healthCheck()
  const repoHealth = await bundle.repositoryRuntime.health()
  const active = (bundle.capabilityRegistry.getActive() || []).length
  const commercialHealthy = active === 9 && (bundle.repositoryRuntime.registry.count || 0) === 12
  const pipelineHealth = bundle.pipeline?.health || {}
  return {
    application: engineHealth.application,
    runtime: engineHealth.runtime,
    authentication: engineHealth.authentication,
    authorization: engineHealth.authorization,
    cms: engineHealth.cms,
    repository: engineHealth.repository,
    commercial: commercialHealthy ? 'healthy' : 'degraded',
    bootstrap: pipelineHealth.application && pipelineHealth.application !== 'unknown' ? pipelineHealth.application : (bundle.pipeline?.health ? 'healthy' : 'unknown'),
  }
}

function computeStageTiming() {
  const gaps = []
  for (let i = 1; i < eventsLog.length; i++) {
    gaps.push({ from: eventsLog[i - 1].event.replace('startup:', ''), to: eventsLog[i].event.replace('startup:', ''), ms: Math.round(eventsLog[i].ts - eventsLog[i - 1].ts) })
  }
  return gaps
}

function scanCapabilityImports() {
  const issues = []
  const capDir = path.join(ROOT, 'capabilities')
  for (const entry of fs.readdirSync(capDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const capFile = path.join(capDir, entry.name, `${entry.name}.capability.js`)
    if (!fs.existsSync(capFile)) continue
    const content = fs.readFileSync(capFile, 'utf8')
    const re = /from\s+['"]([^'"]+)['"]/g
    let m
    while ((m = re.exec(content)) !== null) {
      const spec = m[1]
      if (/\.\.\/[^/]+\/[^/]+\.capability\.js$/.test(spec) && !spec.includes('core/base.capability.js')) {
        issues.push(`${entry.name}: imports ${spec}`)
      }
    }
  }
  return issues
}

function scanInfraImports() {
  const issues = []
  const infraPatterns = ['persistence/providers', 'drizzle', 'postgres', 'wordpress', 'jwt.provider', 'pg-pool', 'drizzle-orm']
  const capDir = path.join(ROOT, 'capabilities')
  for (const entry of fs.readdirSync(capDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const capFile = path.join(capDir, entry.name, `${entry.name}.capability.js`)
    if (!fs.existsSync(capFile)) continue
    const content = fs.readFileSync(capFile, 'utf8')
    const re = /from\s+['"]([^'"]+)['"]/g
    let m
    while ((m = re.exec(content)) !== null) {
      const spec = m[1]
      if (!infraPatterns.some((p) => spec.includes(p))) continue
      const target = path.resolve(path.dirname(capFile), spec)
      if (target.startsWith(capDir + path.sep + entry.name + path.sep)) continue
      issues.push(`${entry.name}: imports ${spec}`)
    }
  }
  return issues
}

async function runFailureProbes(bundle, repoContext) {
  // A. Duplicate repository registration
  const dup = await expectError(() => bundle.repositoryRuntime.register('tenant', { class: TenantRepository }), 'RepositoryConfigurationError')
  record('failures', 'duplicate.registration', dup.thrown && dup.name === 'RepositoryConfigurationError', dup.thrown ? dup.name : 'no error thrown')

  // B. Missing repository
  const missRepo = await expectError(() => bundle.repositoryRuntime.get('nonexistent', repoContext), 'RepositoryConfigurationError')
  record('failures', 'missing.repository', missRepo.thrown && missRepo.name === 'RepositoryConfigurationError', missRepo.thrown ? missRepo.name : 'no error thrown')

  // C. Missing capability
  record('failures', 'missing.capability', bundle.capabilityRegistry.get('nonexistent') === null, 'get() returns null')

  // D. Missing provider (no adapter registered)
  const missProvider = await expectError(() => bundle.repositoryRuntime.get('business', { ...repoContext, provider: 'postgresql' }), 'RepositoryConfigurationError')
  record('failures', 'missing.provider', missProvider.thrown && missProvider.message.includes('No adapter registered'), missProvider.thrown ? `${missProvider.name}: ${missProvider.message}` : 'no error thrown')

  // E. Dependency cycle (isolated engine)
  const cycle = await expectError(async () => {
    const engine = new RuntimeEngine({ fallbackOnFailure: false })
    class P { async initialize() {} async available() { return true } }
    engine.register('a', P, { dependencies: ['b'], priority: 1 })
    engine.register('b', P, { dependencies: ['a'], priority: 2 })
    await engine.initialize()
    await engine.start()
  }, 'DependencyResolutionError')
  record('failures', 'dependency.cycle', cycle.thrown && (cycle.name === 'DependencyResolutionError' || cycle.name === 'CircularDependencyError'), cycle.thrown ? cycle.name : 'no error thrown')

  // F. Missing runtime dependency (isolated engine)
  const missDep = await expectError(async () => {
    const engine = new RuntimeEngine({ fallbackOnFailure: false })
    class P { async initialize() {} async available() { return true } }
    engine.register('x', P, { dependencies: ['ghost'], priority: 1 })
    await engine.initialize()
    await engine.start()
  }, 'UnregisteredProviderError')
  record('failures', 'missing.dependency', missDep.thrown && missDep.name === 'UnregisteredProviderError', missDep.thrown ? missDep.name : 'no error thrown')

  // G. Invalid startup order (register after start)
  const order = await expectError(async () => {
    const engine = new RuntimeEngine({ fallbackOnFailure: false })
    await engine.initialize()
    await engine.start()
    engine.register('late', class P { async initialize() {} }, {})
  }, 'ProviderRegistrationError')
  record('failures', 'invalid.startup.order', order.thrown && order.name === 'ProviderRegistrationError', order.thrown ? order.name : 'no error thrown')

  // H. Double initialize + double shutdown (idempotent)
  let doubleInit = true
  let doubleShutdown = true
  try {
    const engine = new RuntimeEngine({ fallbackOnFailure: false })
    await engine.initialize()
    await engine.initialize()
    await engine.start()
    await engine.shutdown()
    await engine.shutdown()
  } catch {
    doubleInit = false
    doubleShutdown = false
  }
  record('failures', 'double.initialize', doubleInit, 'initialize() twice is idempotent')
  record('failures', 'double.shutdown', doubleShutdown, 'shutdown() twice is idempotent')

  // I. Missing runtime provider lookup returns null (no throw)
  record('failures', 'missing.provider.module', bundle.engine.getModule('jwt') === null, 'getModule(jwt) -> null')
}

function printReport(extra = {}) {
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  const total = results.length
  const summary = { passed, failed, total, score: Math.round((passed / total) * 100), ...extra }

  const report = {
    phase: 'P13.5.6 — End-to-End Runtime Smoke Test',
    startedAt: new Date(startedAtMs || Date.now()).toISOString(),
    finishedAt: new Date(finishedAtMs || Date.now()).toISOString(),
    summary,
    results,
  }

  const outPath = process.env.SMOKE_REPORT_PATH || path.join(process.cwd(), 'runtime', 'startup', 'smoke.report.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

  console.log(`\n========== P13.5.6 SMOKE TEST ==========`)
  console.log(`PASS: ${passed}/${total}  FAIL: ${failed}  SCORE: ${summary.score}/100`)
  for (const r of results) {
    console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.category}.${r.id}${r.detail ? ` — ${r.detail}` : ''}`)
  }
  console.log(`Startup duration: ${extra.startupDurationMs ?? '?'}ms`)
  if (extra.startupStages) {
    console.log('Startup stages:')
    for (const g of extra.startupStages) console.log(`  ${g.from} -> ${g.to}: ${g.ms}ms`)
  }
  if (extra.bootstrapStepDurations && Object.keys(extra.bootstrapStepDurations).length) {
    console.log('Bootstrap step durations:')
    for (const [k, v] of Object.entries(extra.bootstrapStepDurations)) console.log(`  ${k}: ${v}ms`)
  }
  console.log(`Shutdown duration: ${extra.shutdownDurationMs ?? '?'}ms`)
  console.log(`Report written to ${outPath}`)

  process.exit(failed === 0 ? 0 : 2)
}

main().catch((err) => {
  console.error('Smoke test crashed:', err)
  process.exit(3)
})
