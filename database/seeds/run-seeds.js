#!/usr/bin/env node
/**
 * Seed CLI — operator-only seed execution tool.
 *
 * Seeds are DEPLOYMENT/OPERATOR tooling only. This entrypoint is NEVER
 * invoked from Passenger startup, `npm start`, `startWeb()`, or
 * `application.start()`. The runtime does not import this file.
 *
 * Usage:
 *   node database/seeds/run-seeds.js [--force] [--verbose] [--specific=a,b,c] [--help]
 */

import { runSeeds } from './seed.runner.js'
import { loadEnv } from '../config/environment.loader.js'
import { getEnvironment } from '../config/database.config.js'

function printUsage() {
  console.log(
    [
      'Seed CLI — operator-only database seed tool.',
      '',
      'Usage:',
      '  node database/seeds/run-seeds.js [options]',
      '',
      'Options:',
      '  --force            Update existing seed rows (supersedes idempotent skip).',
      '                     Availability rows are NEVER overwritten on reseed.',
      '  --verbose          Print per-seed record counts.',
      '  --specific=a,b,c   Run only the listed seeds (registry names), in registry order.',
      '  --help, -h         Show this help and exit.',
      '',
      'The seed runner requires a reachable database for the target environment.',
      'It NEVER runs from Passenger startup, npm start, or application.start().',
    ].join('\n'),
  )
}

function parseArgs(argv) {
  const options = { force: false, verbose: false, specificSeeds: null, help: false }

  for (const arg of argv) {
    if (arg === '--force') {
      options.force = true
    } else if (arg === '--verbose') {
      options.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg.startsWith('--specific=')) {
      options.specificSeeds = arg
        .slice('--specific='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else {
      console.error(`Unknown argument: ${arg}`)
      printUsage()
      process.exit(1)
    }
  }

  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printUsage()
    process.exit(0)
  }

  loadEnv({ silent: true })

  console.log('==============================================')
  console.log('        SEED EXECUTION (operator tooling)')
  console.log('==============================================')
  console.log(`Target environment: ${getEnvironment()}`)
  console.log('This process writes seed data to the database')
  console.log('configured for the environment above.')
  console.log('')

  const results = await runSeeds({
    force: options.force,
    verbose: options.verbose,
    specificSeeds: options.specificSeeds,
  })

  process.exit(results.errors.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('Seed execution failed:', error.message)
  process.exit(1)
})