/**
 * BaseCapabilityTest — reusable capability lifecycle (P13.5.7)
 *
 * Every capability/aggregate suite extends this class and overrides
 * `runScenario(bundle)`. The shared lifecycle is:
 *
 *   1. Create Runtime   — RuntimeFactory builds an isolated bundle
 *   2. EventBus         — recording wrapper around the real bus
 *   3. Mock Repos       — in-memory adapter registered before first resolution
 *   4. Register Caps    — the nine commercial capabilities register + activate
 *   5. Execute          — runScenario(bundle)
 *   6. Validate Repo    — assertions against the in-memory store
 *   7. Validate Events  — assertions against emitted events
 *   8. Validate Auth/Search — assertions against mock authorization/search
 *   9. Destroy          — teardown (dispose engine, clear stores)
 *
 * Baseline checks (runtime healthy, capabilities registered, no circular
 * references) run automatically on top of the suite's own checks.
 */
import { pathToFileURL, fileURLToPath } from 'node:url'
import { isAbsolute, resolve } from 'node:path'
import { createTestBundle } from './capability.context.factory.js'
import { assertRuntimeHealthy, assertNoCircularReferences, storeRows } from './capability.assertions.js'

export class BaseCapabilityTest {
  constructor(suiteName) {
    this.suiteName = suiteName
    this.results = []
    this.options = {}
  }

  /**
   * Add a check result. `id` must be unique within the suite.
   */
  check(id, pass, detail) {
    this.results.push({ id: `${this.suiteName}:${id}`, pass, detail })
  }

  /**
   * Await an async assertion ({ pass, detail }) and record the result.
   * @param {Promise<{pass: boolean, detail: string}>} promise
   * @param {string} id - check id (suite-scoped automatically)
   */
  async checkAsync(promise, id) {
    const result = await promise
    this.check(id, result.pass, result.detail)
    return result
  }

  /**
   * Suite-specific scenario. Override in subclasses.
   * @param {object} bundle - Test bundle from RuntimeFactory
   */
  async runScenario(bundle) { /* override */ }

  /**
   * Optional post-scenario repository validation. Override to add steps.
   * @param {object} bundle
   */
  async validateRepository(bundle) { /* override */ }

  async #baseline(bundle) {
    const healthy = await assertRuntimeHealthy(bundle, 'runtime healthy after setup')
    this.check('baseline:runtime-healthy', healthy.pass, healthy.detail)

    this.check('baseline:capabilities-registered', bundle.registry.size >= 9,
      `commercial capabilities registered (${bundle.registry.size})`)

    const noCycles = assertNoCircularReferences(bundle.capabilities, 'no circular capability dependencies')
    this.check('baseline:no-circular-references', noCycles.pass, noCycles.detail)
  }

  async #tenantIsolation(bundle) {
    const entities = ['business', 'accommodation', 'availability', 'reservation', 'visitor']
    for (const entity of entities) {
      const rows = storeRows(bundle, entity)
      if (rows.length === 0) continue
      const violating = rows.filter((r) => r.tenantId && r.tenantId !== bundle.tenant.id)
      this.check(`baseline:tenant-isolation:${entity}`, violating.length === 0,
        violating.length === 0 ? `all ${entity} rows in tenant ${bundle.tenant.id}` : `${violating.length} ${entity} rows violate tenant isolation`)
    }
  }

  /**
   * Run the full lifecycle and return a suite result.
   * @returns {Promise<{ suite: string, results: object[], executionTimeMs: number }>}
   */
  async run() {
    const startedAt = performance.now()
    const bundle = await createTestBundle(this.options)
    try {
      await this.#baseline(bundle)
      await this.runScenario(bundle)
      await this.validateRepository(bundle)
      await this.#tenantIsolation(bundle)
    } finally {
      await bundle.teardown()
    }
    return { suite: this.suiteName, results: this.results, executionTimeMs: Math.round(performance.now() - startedAt) }
  }

  /**
   * Run this suite standalone from the CLI.
   */
  async runStandalone() {
    const result = await this.run()
    const passed = result.results.filter((r) => r.pass).length
    const failed = result.results.length - passed
    console.log(`\n[${result.suite}] PASS: ${passed}/${result.results.length}  FAIL: ${failed}  (${result.executionTimeMs}ms)`)
    for (const r of result.results.filter((r) => !r.pass)) console.log(`  ✗ ${r.id} — ${r.detail}`)
    process.exitCode = failed === 0 ? 0 : 1
    return result
  }
}

function isMainModule(moduleUrl) {
  if (typeof process === 'undefined' || !process.argv?.[1] || !moduleUrl) return false
  const a = fileURLToPath(moduleUrl)
  const b = isAbsolute(process.argv[1]) ? process.argv[1] : resolve(process.argv[1])
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Run a suite standalone when the file is executed directly.
 * @param {BaseCapabilityTest} testInstance
 * @param {string} moduleUrl - Pass `import.meta.url` from the suite file.
 */
export function runIfMain(testInstance, moduleUrl) {
  if (isMainModule(moduleUrl)) {
    testInstance.runStandalone().catch((err) => {
      console.error(err)
      process.exitCode = 1
    })
  }
}

export default BaseCapabilityTest
