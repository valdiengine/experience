/**
 * Standalone runner for plain `run()` suites (P13.5.7).
 * Executes the suite and prints results when the file is invoked directly.
 */
import { pathToFileURL, fileURLToPath } from 'node:url'
import { isAbsolute, resolve } from 'node:path'

function isMainModule(moduleUrl) {
  if (typeof process === 'undefined' || !process.argv?.[1] || !moduleUrl) return false
  const a = fileURLToPath(moduleUrl)
  const b = isAbsolute(process.argv[1]) ? process.argv[1] : resolve(process.argv[1])
  return a.toLowerCase() === b.toLowerCase()
}

export function runIfMain(fn, moduleUrl) {
  if (isMainModule(moduleUrl)) {
    fn()
      .then((result) => {
        const passed = result.results.filter((r) => r.pass).length
        const failed = result.results.length - passed
        console.log(`\n[${result.suite}] PASS: ${passed}/${result.results.length}  FAIL: ${failed}  (${result.executionTimeMs}ms)`)
        for (const r of result.results.filter((r) => !r.pass)) console.log(`  ✗ ${r.id} — ${r.detail}`)
        process.exitCode = failed === 0 ? 0 : 1
      })
      .catch((err) => {
        console.error(err)
        process.exitCode = 1
      })
  }
}

export default runIfMain
