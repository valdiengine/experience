/**
 * RUNTIME-SEED-EXECUTION — SEED EXECUTION REPAIR Certification
 *
 * Offline (no live PostgreSQL) certification that the seed execution contract
 * is repaired and that operator seed tooling cannot fire from Passenger/runtime
 * startup. Required proofs:
 *
 *   1. SeedRunner receives a real Drizzle-compatible client shape (getClient()).
 *   2. Seed registry loads and seed order validates (incl. M1-M4 entries).
 *   3. Operator seed execution does NOT run from Passenger startup.
 *   4. Connection lifecycle is deterministic (bootstrap -> client -> shutdown).
 *   5. M1-M4 gate tests remain green (covered by runtime-persistence-1 suites).
 *
 * No live database connection is made in this suite: `new Pool()` from `pg`
 * is lazy and only connects on the first query, and no query is issued here.
 */
import { getClient as getDrizzleClient, getSchemaRegistry, isClientInitialized } from '../../database/client.js'
import { getState as getPoolState } from '../../database/connection/connection.pool.js'
import { shutdown as shutdownBootstrap } from '../../database/bootstrap/database.bootstrap.js'
import { SeedRunner, runSeeds, createSeedClient } from '../../database/seeds/seed.runner.js'
import { SEED_REGISTRY, validateSeedOrder } from '../../database/seeds/registry/seed.registry.js'
import { runSeeds as runSeedsExport } from '../../database/index.js'
import { createRequire } from 'module'
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')

const results = []

const record = (category, id, pass, detail = '') => {
  results.push({ category, id, pass: Boolean(pass), detail: String(detail || (pass ? 'ok' : 'FAIL')) })
}

function readFileText(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8')
}

function recordFromFile(relativePath, checks, category) {
  try {
    const content = readFileText(relativePath)
    for (const { id, condition, detail } of checks) {
      record(category, id, !!condition(content), detail(content))
    }
  } catch (err) {
    record(category, 'read-error', false, `${relativePath}: ${err.message}`)
  }
}

function collectTree(rootDir, files = []) {
  for (const entry of readdirSync(rootDir)) {
    const full = join(rootDir, entry)
    if (statSync(full).isDirectory()) {
      collectTree(full, files)
    } else {
      files.push(full)
    }
  }
  return files
}

async function main() {
  console.log('=== RUNTIME-SEED-EXECUTION: Seed Execution Repair Gate ===\n')

  // ── A. Real Drizzle-compatible client shape (offline) ──
  console.log('[CLIENT] getClient() returns a real Drizzle client (no live connection)...')
  let db
  try {
    db = getDrizzleClient()
    record('CLIENT', 'select', typeof db.select === 'function', `db.select=${typeof db.select}`)
    record('CLIENT', 'insert', typeof db.insert === 'function', `db.insert=${typeof db.insert}`)
    record('CLIENT', 'update', typeof db.update === 'function', `db.update=${typeof db.update}`)
    record('CLIENT', 'delete', typeof db.delete === 'function', `db.delete=${typeof db.delete}`)
    record('CLIENT', 'execute', typeof db.execute === 'function', `db.execute=${typeof db.execute}`)
    record('CLIENT', 'transaction', typeof db.transaction === 'function', `db.transaction=${typeof db.transaction}`)
    record('CLIENT', 'client-init-flag', isClientInitialized() === true, `isClientInitialized=${isClientInitialized()}`)

    // createSeedClient binds the drizzle schema tables as properties (SeedRunner shape)
    const bound = createSeedClient()
    const schema = getSchemaRegistry()
    for (const table of ['tenants', 'countries', 'companies', 'accommodations', 'availability']) {
      record('CLIENT', `table-${table}`, bound[table] === schema[table], `db.${table} bound to schema (${bound[table] === schema[table] ? 'present' : 'MISSING'})`)
    }
    record('CLIENT', 'bound-keeps-methods', typeof bound.select === 'function' && typeof bound.execute === 'function', 'bound client retains query methods')
    db = bound
  } catch (err) {
    record('CLIENT', 'getClient', false, err.message)
  }

  // ── B. SeedRunner receives the client-shaped db ──
  console.log('[RUNNER] SeedRunner accepts the Drizzle client...')
  {
    const runner = new SeedRunner(db)
    record('RUNNER', 'construct', runner.db === db, 'runner.db === getClient() output')
    record('RUNNER', 'run-method', typeof runner.run === 'function', 'SeedRunner.run() present (not invoked offline)')
    record('RUNNER', 'processRecord', typeof runner.processRecord === 'function', 'SeedRunner.processRecord() present')
  }

  // ── C. runSeeds export + source chain contract ──
  console.log('[RUNSEEDS] runSeeds() repaired operator chain...')
  {
    record('RUNSEEDS', 'exported', typeof runSeeds === 'function', 'runSeeds is a function')
    record('RUNSEEDS', 'reexported-from-index', runSeedsExport === runSeeds, 'database/index.js re-exports the same runSeeds')
    recordFromFile('./database/seeds/seed.runner.js', [
      { id: 'calls-bootstrap', condition: (c) => c.includes('await bootstrapDatabase()'), detail: () => 'runSeeds bootstraps the database layer first' },
      { id: 'dynamic-bootstrap-import', condition: (c) => c.includes("await import('../bootstrap/database.bootstrap.js')"), detail: () => 'bootstrap is imported at operator-time (no static cycle, no import-time DB machinery)' },
      { id: 'uses-createSeedClient', condition: (c) => c.includes('const db = createSeedClient()'), detail: () => 'runSeeds builds the client via createSeedClient() (real Drizzle + bound tables)' },
      { id: 'binds-schema-tables', condition: (c) => c.includes('getSchemaRegistry()') && c.includes('client[name] = table'), detail: () => 'schema tables are bound onto the real Drizzle client' },
      { id: 'constructs-runner', condition: (c) => c.includes('new SeedRunner(db)'), detail: () => 'runSeeds constructs SeedRunner with the Drizzle client' },
      { id: 'shutdown-in-finally', condition: (c) => c.includes('finally') && c.includes('await shutdown()'), detail: () => 'runSeeds closes the client + pool in finally' },
      { id: 'no-bundle-passed', condition: (c) => !c.includes('const db = await bootstrapDatabase()'), detail: () => 'the previous bootstrap-bundle bug pattern is absent (db comes from getClient())' },
    ], 'RUNSEEDS')
  }

  // ── D. Registry loads and order validates (M1-M4 included) ──
  console.log('[REG] Seed registry loads & validates...')
  {
    record('REG', 'has-tenants', SEED_REGISTRY.order.some((s) => s.name === 'tenants'), 'tenants in registry')
    record('REG', 'has-companies', SEED_REGISTRY.order.some((s) => s.name === 'companies'), 'companies in registry')
    record('REG', 'has-accommodations', SEED_REGISTRY.order.some((s) => s.name === 'accommodations'), 'accommodations in registry')
    record('REG', 'has-availability', SEED_REGISTRY.order.some((s) => s.name === 'availability'), 'availability in registry')
    const names = SEED_REGISTRY.order.map((s) => s.name)
    const idxCompanies = names.indexOf('companies')
    const idxAcc = names.indexOf('accommodations')
    const idxAvail = names.indexOf('availability')
    record('REG', 'order-valid-sequence', idxCompanies === -1 ? false : idxAcc > idxCompanies && idxAvail > idxAcc, `companies(${idxCompanies}) < accommodations(${idxAcc}) < availability(${idxAvail})`)
    record('REG', 'entities-acc-count', SEED_REGISTRY.entities.accommodations?.count === 1, `entities.accommodations.count=${SEED_REGISTRY.entities.accommodations?.count}`)
    record('REG', 'entities-avail-count', SEED_REGISTRY.entities.availability?.count === 90, `entities.availability.count=${SEED_REGISTRY.entities.availability?.count}`)
    const validation = validateSeedOrder()
    record('REG', 'order-valid', validation.valid, validation.valid ? 'seed order valid' : `FAILED: ${validation.errors.join('; ')}`)
  }

  // ── E. Connection lifecycle determinism (offline) ──
  console.log('[LIFECYCLE] Deterministic bootstrap -> client -> shutdown...')
  {
    const before = getPoolState()
    record('LIFECYCLE', 'pre-state', before === 'uninitialized', `pool state before explicit shutdown: ${before}`)

    let shutdownResult = 'not-run'
    try {
      await shutdownBootstrap()
      shutdownResult = 'ok'
    } catch (err) {
      shutdownResult = `threw: ${err.message}`
    }
    record('LIFECYCLE', 'shutdown-not-throw', shutdownResult === 'ok', shutdownResult)
    record('LIFECYCLE', 'client-closed', isClientInitialized() === false, `isClientInitialized=${isClientInitialized()}`)
    record('LIFECYCLE', 'pool-state-closed', getPoolState() === 'closed', `pool state after shutdown=${getPoolState()}`)

    let secondShutdown = 'not-run'
    try {
      await shutdownBootstrap()
      secondShutdown = 'idempotent'
    } catch (err) {
      secondShutdown = `threw: ${err.message}`
    }
    record('LIFECYCLE', 'shutdown-idempotent', secondShutdown === 'idempotent', secondShutdown)

    // Client can be re-initialized after shutdown (deterministic restart)
    let reinit = 'not-run'
    try {
      getDrizzleClient()
      reinit = isClientInitialized() ? 're-initialized' : 'stayed-closed'
    } catch (err) {
      reinit = `threw: ${err.message}`
    }
    record('LIFECYCLE', 'reinit-after-shutdown', reinit === 're-initialized', reinit)

    try {
      await shutdownBootstrap()
    } catch { /* best-effort cleanup */ }
  }

  // ── F. No Passenger / runtime / api / web coupling ──
  console.log('[COUPLING] Seeds never execute from Passenger or runtime startup...')
  {
    const forbidden = ['runSeeds', 'SeedRunner', 'seed.runner.js', 'database/seeds']
    recordFromFile('./runtime/startup/application.start.js', forbidden.map((token) => ({
      id: `app-start-no-${token.replace(/[.\/]/g, '-')}`,
      condition: (c) => !c.includes(token),
      detail: () => `application.start.js must NOT reference '${token}'`,
    })), 'COUPLING')
    recordFromFile('./runtime/startup/database.bootstrap.js', [
      { id: 'startup-bootstrap-only', condition: (c) => c.includes('bootstrapDatabase') && !c.includes('SeedRunner') && !c.includes('runSeeds'), detail: () => 'runtime database.bootstrap uses bootstrapDatabase() only (no seeds)' },
      { id: 'no-seed-import', condition: (c) => !c.includes('seed.runner'), detail: () => 'runtime database.bootstrap does not import the seed runner' },
    ], 'COUPLING')

    let coupled = false
    const coupledIn = []
    for (const dir of ['runtime', 'api', 'web']) {
      for (const file of collectTree(join(ROOT, dir))) {
        const text = readFileSync(file, 'utf8')
        if (forbidden.some((token) => text.includes(token))) {
          coupled = true
          coupledIn.push(file.replace(ROOT + '\\', ''))
        }
      }
    }
    record('COUPLING', 'no-source-coupling', !coupled, coupled ? `coupled files: ${coupledIn.join('; ')}` : 'no runtime/api/web source references seed execution')
  }

  // ── G. Operator entrypoint exists and is inert without a database ──
  console.log('[CLI] Operator seed entrypoint (--help, no DB)...')
  {
    const pkg = JSON.parse(readFileText('package.json'))
    record('CLI', 'db-seed-script', pkg.scripts?.['db:seed'] === 'node database/seeds/run-seeds.js', `npm db:seed=${pkg.scripts?.['db:seed']}`)
    record('CLI', 'start-not-seed', !String(pkg.scripts?.['start'] || '').includes('seed'), `npm start=${pkg.scripts?.['start']} (no seed)`)
    record('CLI', 'exists', (() => { try { return readFileText('database/seeds/run-seeds.js').includes('runSeeds') } catch { return false } })(), 'run-seeds.js entrypoint exists and references runSeeds')

    const cli = spawnSync(process.execPath, ['database/seeds/run-seeds.js', '--help'], { cwd: ROOT, encoding: 'utf8', timeout: 20000 })
    record('CLI', 'help-exit-0', cli.status === 0, `--help exit code=${cli.status}`)
    record('CLI', 'help-inert', cli.status === 0 && !/bootstrap|SELECT 1|Pool/.test(cli.stdout), `--help is inert stdout=${cli.stdout.slice(0, 60).replace(/\n/g, ' ')}`)
    record('CLI', 'help-usage-text', cli.stdout.includes('operator-only database seed tool'), '--help prints operator usage')
  }

  finalize()
}

function finalize() {
  console.log('\n=== RESULTS ===')
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n=== FAILED ===')
    for (const r of results.filter((r) => !r.pass)) {
      console.log(`  [${r.category}] ${r.id}: ${r.detail}`)
    }
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})