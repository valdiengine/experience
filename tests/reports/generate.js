/**
 * Report Generator (P13.5.7)
 *
 * Runs every capability/aggregate suite and writes an aggregated report to
 * `tests/reports/latest-report.json` and `latest-report.md`.
 *
 * Usage:
 *   node tests/reports/generate.js                 # run everything
 *   node tests/reports/generate.js bootstrap smoke  # filter by substring
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const REPORT_DIR = new URL('./', import.meta.url)
const SUITES = [
  { name: 'runtime.bootstrap', path: '../runtime/runtime.bootstrap.test.js' },
  { name: 'runtime.health', path: '../runtime/runtime.health.test.js' },
  { name: 'runtime.smoke', path: '../runtime/runtime.smoke.test.js' },
  { name: 'business.lifecycle', path: '../aggregate/business.lifecycle.test.js' },
  { name: 'availability.lifecycle', path: '../aggregate/availability.lifecycle.test.js' },
  { name: 'visitor.lifecycle', path: '../aggregate/visitor.lifecycle.test.js' },
  { name: 'reservation.lifecycle', path: '../aggregate/reservation.lifecycle.test.js' },
  { name: 'commercial.aggregate', path: '../aggregate/commercial.aggregate.test.js' },
]

const filters = process.argv.slice(2)
const selected = SUITES.filter((s) => filters.length === 0 || filters.some((f) => s.name.includes(f)))

const runSuite = async (suite) => {
  try {
    const mod = await import(`${suite.path}?report=${suite.name}`)
    const run = typeof mod.default === 'function' ? mod.default : mod.run
    if (typeof run !== 'function') throw new Error('suite does not export a run() function')
    const result = await run()
    const passed = result.results.filter((r) => r.pass).length
    const failed = result.results.length - passed
    return { ...suite, ...result, passed, failed, crashed: false }
  } catch (err) {
    return { ...suite, suite: suite.name, results: [], executionTimeMs: 0, passed: 0, failed: 0, crashed: true, error: err?.message || String(err) }
  }
}

const main = async () => {
  const startedAt = performance.now()
  const reports = []
  for (const suite of selected) {
    process.stdout.write(`  ${suite.name} ... `)
    const report = await runSuite(suite)
    reports.push(report)
    process.stdout.write(report.crashed ? `CRASHED (${report.error})\n` : `${report.passed}/${report.results.length} passed (${report.executionTimeMs}ms)\n`)
  }

  const totalChecks = reports.reduce((sum, r) => sum + r.results.length, 0)
  const totalPassed = reports.reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = reports.reduce((sum, r) => sum + r.failed, 0)
  const crashed = reports.filter((r) => r.crashed)
  const totalTime = Math.round(performance.now() - startedAt)

  const json = {
    generatedAt: new Date().toISOString(),
    summary: { suites: reports.length, checks: totalChecks, passed: totalPassed, failed: totalFailed, crashed: crashed.length, executionTimeMs: totalTime, green: totalFailed === 0 && crashed.length === 0 },
    suites: reports.map((r) => ({
      name: r.suite,
      executionTimeMs: r.executionTimeMs,
      passed: r.passed,
      failed: r.failed,
      total: r.results.length,
      crashed: r.crashed,
      error: r.error || null,
    })),
    checks: reports.flatMap((r) => r.results.map((c) => ({ ...c, suite: r.suite }))),
  }

  const lines = []
  lines.push('# Capability Test Report (P13.5.7)')
  lines.push('')
  lines.push(`Generated: ${json.generatedAt}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`| Metric | Value |`)
  lines.push(`| --- | --- |`)
  lines.push(`| Suites | ${json.summary.suites} |`)
  lines.push(`| Checks | ${json.summary.checks} |`)
  lines.push(`| Passed | ${json.summary.passed} |`)
  lines.push(`| Failed | ${json.summary.failed} |`)
  lines.push(`| Crashed suites | ${json.summary.crashed} |`)
  lines.push(`| Total time | ${json.summary.executionTimeMs}ms |`)
  lines.push(`| Quality gate | ${json.summary.green ? 'GREEN' : 'RED'} |`)
  lines.push('')
  lines.push('## Suites')
  lines.push('')
  lines.push('| Suite | Passed | Failed | Total | Time |')
  lines.push(`| --- | --- | --- | --- | --- |`)
  for (const r of json.suites) {
    const mark = r.crashed ? 'CRASHED' : r.failed === 0 ? 'OK' : 'FAIL'
    lines.push(`| ${r.name} | ${r.passed} | ${r.failed} | ${r.total} | ${r.executionTimeMs}ms ${mark} |`)
  }
  lines.push('')
  const failures = json.checks.filter((c) => !c.pass)
  if (failures.length > 0) {
    lines.push('## Failures')
    lines.push('')
    for (const f of failures) lines.push(`- [${f.suite}] \`${f.id}\` — ${f.detail}`)
    lines.push('')
  }
  if (crashed.length > 0) {
    lines.push('## Crashed suites')
    lines.push('')
    for (const c of crashed) lines.push(`- [${c.suite}] ${c.error}`)
    lines.push('')
  }
  lines.push(`Report written by tests/reports/generate.js (total ${totalTime}ms).`)

  await mkdir(REPORT_DIR, { recursive: true })
  await writeFile(new URL('latest-report.json', REPORT_DIR), JSON.stringify(json, null, 2))
  await writeFile(new URL('latest-report.md', REPORT_DIR), lines.join('\n'))

  console.log(`\n${json.summary.green ? 'GREEN' : 'RED'}: ${totalPassed}/${totalChecks} checks passed across ${reports.length} suites${crashed.length ? ` (${crashed.length} crashed)` : ''} in ${totalTime}ms`)
  process.exitCode = json.summary.green ? 0 : 1
}

main().catch((err) => {
  console.error('Report generator failed:', err)
  process.exitCode = 1
})
