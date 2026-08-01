/**
 * Runtime Smoke Suite (P13.5.7)
 *
 * Executes the existing `runtime/startup/smoke.test.js` harness unchanged
 * (never replaced) and asserts its emitted report. Runs in-process so the
 * report generator can fold it into the quality gate.
 */
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { runIfMain } from '../capability/run.main.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const SMOKE_SCRIPT = path.join(REPO_ROOT, 'runtime', 'startup', 'smoke.test.js')
const SMOKE_REPORT = process.env.SMOKE_REPORT_PATH || path.join(REPO_ROOT, 'runtime', 'startup', 'smoke.report.json')

function execSmoke() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SMOKE_SCRIPT], {
      cwd: REPO_ROOT,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, out }))
  })
}

export async function run() {
  const startedAt = performance.now()
  const results = []
  const add = (id, pass, detail) => results.push({ id: `runtime.smoke:${id}`, pass, detail })

  const { code } = await execSmoke()

  add('exit-code', code === 0, `smoke.test.js exit code: ${code}`)

  let summary = null
  if (existsSync(SMOKE_REPORT)) {
    try {
      summary = JSON.parse(readFileSync(SMOKE_REPORT, 'utf8')).summary
    } catch { /* report parse failed */ }
  }

  add('report-written', Boolean(summary), 'smoke.report.json written')
  if (summary) {
    add('report-total', summary.total > 0, `smoke checks total: ${summary.total}`)
    add('report-passed', summary.passed === summary.total, `smoke checks passed: ${summary.passed}/${summary.total}`)
    add('report-failed', summary.failed === 0, `smoke checks failed: ${summary.failed}`)
    add('report-score', summary.score === 100, `smoke score: ${summary.score}/100`)
  }

  return { suite: 'runtime.smoke', results, executionTimeMs: Math.round(performance.now() - startedAt) }
}

export default run

runIfMain(run, import.meta.url)
