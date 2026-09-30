/**
 * BOOKING-OCCUPIED-NIGHTS-1B - tests for the availability capability's public
 * occupied-night surface.
 *
 * WHAT THIS FILE COVERS
 * The narrow public method `expandOccupiedNights` and the
 * `occupiedNightsExpansionVersion` / `occupiedNightsMaxNightsDefault` getters
 * added to AvailabilityCapability in 1B, exercised through the real capability
 * class. This is the only surface cross-capability callers may use, so these
 * tests pin the contract that ReservationRepository depends on.
 *
 * WHAT THIS FILE DOES NOT COVER, AND WHY
 * ReservationRepository itself is NOT exercised here. It is covered by
 * reservation.repository.occupied-nights.test.js, which imports and runs the real
 * repository. This file stays scoped to the capability's own public surface.
 *
 * The final section performs STATIC SOURCE TEXT INSPECTION of the repository. It
 * is limited to properties that runtime behaviour cannot observe: the absence of a
 * sibling import, the retained calendar import, the absence of a stay-limit
 * dependency, and the ordering inside the metadata builder. Behaviour such as the
 * legacy/recorded/invalid dispatch, full-range coverage and pre-mutation
 * validation is asserted by executing the real repository, not by reading its
 * text, so no static check is used as a substitute for it.
 *
 * Framework-free, matching capabilities/pricing/pricing.test.js. No database, no
 * network, no provisioning, no application bootstrap, no runtime startup, no
 * dependency installation.
 *
 * Timezone coverage runs the real capability class in isolated child processes,
 * one per timezone, with TZ set before the process starts. In-process mutation of
 * process.env.TZ is unreliable on Windows, so it is not used.
 *
 * Run:  node capabilities/availability/availability.capability.occupied-nights.test.js
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { AvailabilityCapability } from './availability.capability.js'
import {
  expandOccupiedNights,
  OCCUPIED_NIGHTS_EXPANSION_VERSION,
  OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT,
} from './availability.occupied-nights.js'
import {
  AvailabilityDateRangeError,
  AvailabilityConsumptionRecordError,
  AvailabilityError,
} from './availability.errors.js'

let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      return result.then(
        () => { passed++; console.log(`  PASS ${name}`) },
        (error) => { failed++; failures.push({ name, error }); console.log(`  FAIL ${name}: ${error.message}`) }
      )
    }
    passed++
    console.log(`  PASS ${name}`)
  } catch (error) {
    failed++
    failures.push({ name, error })
    console.log(`  FAIL ${name}: ${error.message}`)
  }
  return Promise.resolve()
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) throw new Error(`${message || 'assertion failed'}: expected ${b}, got ${a}`)
}

function assertThrowsTyped(fn, expectedName, label) {
  let thrown = null
  try {
    fn()
  } catch (error) {
    thrown = error
  }
  if (thrown === null) throw new Error(`${label}: expected a throw, but nothing was thrown`)
  if (thrown.name !== expectedName) {
    throw new Error(`${label}: expected ${expectedName}, got ${thrown.name}`)
  }
  return thrown
}

const capability = new AvailabilityCapability()

console.log('\nBOOKING-OCCUPIED-NIGHTS-1B - availability capability surface\n')

// ---------------------------------------------------------------------------
// Public surface shape
// ---------------------------------------------------------------------------

await test('exposes exactly the narrow public surface', () => {
  assertEqual(typeof capability.expandOccupiedNights, 'function', 'expandOccupiedNights must be a function')
  assertEqual(typeof capability.occupiedNightsExpansionVersion, 'number', 'version must be a number')
  assertEqual(typeof capability.occupiedNightsMaxNightsDefault, 'number', 'max nights default must be a number')
})

await test('version and bound match the helper module it delegates to', () => {
  assertEqual(capability.occupiedNightsExpansionVersion, OCCUPIED_NIGHTS_EXPANSION_VERSION)
  assertEqual(capability.occupiedNightsMaxNightsDefault, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT)
  assertEqual(capability.occupiedNightsExpansionVersion, 1)
  assertEqual(capability.occupiedNightsMaxNightsDefault, 3660)
})

await test('the method delegates to the helper rather than reimplementing it', () => {
  const ranges = [
    { startDate: '2026-05-10', endDate: '2026-05-13' },
    { startDate: '2026-04-04', endDate: '2026-04-06' },
    { startDate: '2026-10-03', endDate: '2026-10-05' },
    { startDate: '2025-12-30', endDate: '2026-01-02' },
    { startDate: '2028-02-28', endDate: '2028-03-01' },
    { startDate: '0001-01-01', endDate: '0001-01-03' },
    { startDate: '9998-12-30', endDate: '9999-12-31' },
  ]
  for (const range of ranges) {
    assertDeepEqual(
      capability.expandOccupiedNights(range),
      expandOccupiedNights(range),
      `delegation for ${range.startDate} to ${range.endDate}`
    )
  }
})

await test('derivation is read-only and safe before a transaction opens', () => {
  const input = Object.freeze({ startDate: '2026-05-10', endDate: '2026-05-13' })
  const dates = capability.expandOccupiedNights(input)
  assertDeepEqual(dates, ['2026-05-10', '2026-05-11', '2026-05-12'])
  assertEqual(input.startDate, '2026-05-10', 'input must not be mutated')
  assertEqual(input.endDate, '2026-05-13', 'input must not be mutated')
  // A fresh array per call, so a caller cannot poison a later derivation.
  dates[0] = 'mutated'
  assertDeepEqual(
    capability.expandOccupiedNights({ startDate: '2026-05-10', endDate: '2026-05-13' }),
    ['2026-05-10', '2026-05-11', '2026-05-12'],
    'a fresh array must be returned each call'
  )
})

// ---------------------------------------------------------------------------
// Semantics through the public surface
// ---------------------------------------------------------------------------

await test('check-in inclusive and check-out exclusive', () => {
  assertDeepEqual(
    capability.expandOccupiedNights({ startDate: '2026-05-10', endDate: '2026-05-11' }),
    ['2026-05-10']
  )
  assertDeepEqual(
    capability.expandOccupiedNights({ startDate: '2026-05-10', endDate: '2026-05-13' }),
    ['2026-05-10', '2026-05-11', '2026-05-12']
  )
})

await test('invalid bounds raise the typed availability error', () => {
  const cases = [
    { input: { startDate: '2026-05-10', endDate: '2026-05-10' }, label: 'equal bounds' },
    { input: { startDate: '2026-05-12', endDate: '2026-05-10' }, label: 'reversed bounds' },
    { input: { startDate: '2026-02-30', endDate: '2026-03-05' }, label: 'impossible date' },
    { input: { startDate: '2026-1-1', endDate: '2026-01-05' }, label: 'non-padded' },
    { input: { startDate: '0000-01-01', endDate: '0000-01-05' }, label: 'year zero' },
    { input: { startDate: 'not-a-date', endDate: '2026-01-05' }, label: 'garbage' },
    { input: {}, label: 'missing bounds' },
    { input: undefined, label: 'no argument' },
  ]
  for (const entry of cases) {
    const error = assertThrowsTyped(
      () => capability.expandOccupiedNights(entry.input),
      'AvailabilityDateRangeError',
      entry.label
    )
    assert(error instanceof AvailabilityError, `${entry.label} must be an AvailabilityError`)
    assertEqual(error.code, 'INVALID_DATE_RANGE', `${entry.label} code`)
    assertEqual(error.statusCode, 422, `${entry.label} status`)
  }
})

await test('over-bound ranges are rejected by the technical ceiling', () => {
  assertEqual(
    capability.expandOccupiedNights({ startDate: '2016-01-01', endDate: '2026-01-01' }).length,
    3653,
    'a range just under the ceiling is accepted'
  )
  const error = assertThrowsTyped(
    () => capability.expandOccupiedNights({ startDate: '2016-01-01', endDate: '2030-01-01' }),
    'AvailabilityDateRangeError',
    '5114 nights must be rejected'
  )
  assertEqual(error.details.nights, 5114)
  assertEqual(error.details.limit, 3660)
})

// ---------------------------------------------------------------------------
// The new error class
// ---------------------------------------------------------------------------

await test('the consumption-record error follows the local error convention', () => {
  const error = new AvailabilityConsumptionRecordError('bad record', { lineId: 'x' })
  assertEqual(error.name, 'AvailabilityConsumptionRecordError')
  assertEqual(error.code, 'INVALID_CONSUMPTION_RECORD')
  assertEqual(error.statusCode, 422)
  assert(error instanceof AvailabilityError, 'must extend AvailabilityError')
  assert(error instanceof Error, 'must extend Error')
  assertDeepEqual(error.details, { lineId: 'x' })
})

// ---------------------------------------------------------------------------
// Timezone coverage - real capability class, isolated child processes
// ---------------------------------------------------------------------------

const CAPABILITY_URL = new URL('./availability.capability.js', import.meta.url).href

const CHILD_SOURCE = `
import { AvailabilityCapability } from ${JSON.stringify(CAPABILITY_URL)}
const cap = new AvailabilityCapability()
const offset = (iso) => new Date(iso).getTimezoneOffset()
process.stdout.write(JSON.stringify({
  requestedTZ: process.env.TZ ?? null,
  effectiveZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  offsets: {
    jan: offset('2026-01-15T12:00:00Z'),
    jul: offset('2026-07-15T12:00:00Z'),
    apr5: offset('2026-04-05T12:00:00Z'),
    oct4: offset('2026-10-04T12:00:00Z'),
  },
  version: cap.occupiedNightsExpansionVersion,
  santiagoWindow: cap.expandOccupiedNights({ startDate: '2026-04-04', endDate: '2026-04-06' }),
  lordHoweWindow: cap.expandOccupiedNights({ startDate: '2026-10-03', endDate: '2026-10-05' }),
  yearBoundary: cap.expandOccupiedNights({ startDate: '2025-12-30', endDate: '2026-01-02' }),
  leapDay: cap.expandOccupiedNights({ startDate: '2028-02-28', endDate: '2028-03-01' }),
}))
`

const ZONES = [
  { zone: 'UTC', jan: 0, jul: 0, apr5: 0, oct4: 0, resolved: ['UTC'] },
  { zone: 'America/Santiago', jan: 180, jul: 240, apr5: 240, oct4: 180, resolved: ['America/Santiago'] },
  { zone: 'Australia/Lord_Howe', jan: -660, jul: -630, apr5: -630, oct4: -660, resolved: ['Australia/Lord_Howe'] },
  { zone: 'Pacific/Kiritimati', jan: -840, jul: -840, apr5: -840, oct4: -840, resolved: ['Pacific/Kiritimati'] },
  { zone: 'Asia/Kathmandu', jan: -345, jul: -345, apr5: -345, oct4: -345, resolved: ['Asia/Kathmandu', 'Asia/Katmandu'] },
]

for (const expectation of ZONES) {
  await test(`capability derivation is UTC-correct in ${expectation.zone}`, () => {
    const stdout = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', CHILD_SOURCE],
      { env: { ...process.env, TZ: expectation.zone }, encoding: 'utf8' }
    )
    const report = JSON.parse(stdout)

    assert(
      expectation.resolved.includes(report.effectiveZone),
      `effective timezone must be one of ${JSON.stringify(expectation.resolved)}, got ${JSON.stringify(report.effectiveZone)}`
    )
    assertEqual(report.requestedTZ, expectation.zone)
    assertEqual(report.offsets.jan, expectation.jan, `January offset in ${expectation.zone}`)
    assertEqual(report.offsets.jul, expectation.jul, `July offset in ${expectation.zone}`)
    assertEqual(report.offsets.apr5, expectation.apr5, `2026-04-05 offset in ${expectation.zone}`)
    assertEqual(report.offsets.oct4, expectation.oct4, `2026-10-04 offset in ${expectation.zone}`)
    assertEqual(report.version, OCCUPIED_NIGHTS_EXPANSION_VERSION)

    assertDeepEqual(report.santiagoWindow, ['2026-04-04', '2026-04-05'], `Santiago window in ${expectation.zone}`)
    assertDeepEqual(report.lordHoweWindow, ['2026-10-03', '2026-10-04'], `Lord Howe window in ${expectation.zone}`)
    assertDeepEqual(report.yearBoundary, ['2025-12-30', '2025-12-31', '2026-01-01'], `year boundary in ${expectation.zone}`)
    assertDeepEqual(report.leapDay, ['2028-02-28', '2028-02-29'], `leap day in ${expectation.zone}`)

    console.log(`        evidence: TZ=${report.requestedTZ} effective=${report.effectiveZone} offsets(jan/jul/apr5/oct4)=${report.offsets.jan}/${report.offsets.jul}/${report.offsets.apr5}/${report.offsets.oct4}`)
  })
}

// ---------------------------------------------------------------------------
// Wiring guards - STATIC SOURCE TEXT INSPECTION ONLY
// ---------------------------------------------------------------------------
// These read the repository source as text. They certify nothing about runtime
// behaviour. The repository cannot be executed here (missing `pg`), so these
// exist only to catch a wiring rule being broken by a later edit.

const REPOSITORY_PATH = new URL(
  '../persistence/repositories/reservation/reservation.repository.js',
  import.meta.url
)

const repositorySource = readFileSync(REPOSITORY_PATH, 'utf8')

await test('[static text] repository does not directly import the occupied-nights helper', () => {
  assert(
    !/import[^;]*availability\.occupied-nights\.js/.test(repositorySource),
    'the repository must reach the helper through the capability context, not a sibling import'
  )
  assert(
    repositorySource.includes("capabilities?.get?.('availability')"),
    'the repository must resolve availability through context.capabilities.get'
  )
})

// ---------------------------------------------------------------------------
// STRUCTURAL IMPORT INSPECTION — the repository no longer imports the calendar.
//
// The legacy branch used to call the shared availability calendar.
// BOOKING-CALENDAR-UTC-1 gave the repository its own private copy of that
// arithmetic, so the import edge no longer exists. This section therefore
// asserts the ABSENCE of that dependency, by parsing real import declarations.
//
// WHY NOT A SUBSTRING: `source.includes('AvailabilityCalendar')` cannot tell an
// import declaration from a comment or from a string, so a commented-out import
// satisfies it and re-wording a comment invalidates it — exactly the false
// positive it produced in practice. Here comments are stripped first, so a
// comment can neither manufacture nor hide an import.
//
// EVIDENTIARY VALUE IS DELIBERATELY LIMITED. This proves one thing only: the
// repository holds no static ESM import edge to the calendar module. It does NOT
// prove that the legacy branch still behaves as it did before, that the calendar
// is timezone-correct, or that releasing historical reservations is safe. Those
// are established by executing the real repository in
// reservation.repository.occupied-nights.test.js, whose five pre-slice legacy
// assertions and timezone-equivalence checks are unchanged. No assertion here
// requires a private method name to appear, because that would reintroduce the
// same substring weakness under a different label.
// ---------------------------------------------------------------------------

/**
 * Remove line and block comments while preserving string and template contents
 * (the module specifiers we need to read live inside quotes) and preserving
 * newline positions so declarations stay line-anchored. Comment bodies become
 * spaces, so a comment can never be mistaken for code.
 *
 * String, template and regex literals are tracked so that a `//` or `/*`
 * appearing *inside* a literal is not mistaken for the start of a comment.
 * Regex literals are recognised by the usual previous-token heuristic, since
 * `/` is otherwise ambiguous with division.
 */
function stripComments(source) {
  const out = []
  const n = source.length
  let i = 0
  let prevSignificant = ''

  const regexCanStartHere = () =>
    prevSignificant === '' || '(,=:[!&|?{};+-*%~^<>'.includes(prevSignificant)

  const blank = (text) => (text === '\n' ? '\n' : ' ')

  while (i < n) {
    const c = source[i]
    const next = source[i + 1]

    if (c === '/' && next === '/') {
      while (i < n && source[i] !== '\n') { out.push(' '); i++ }
      continue
    }

    if (c === '/' && next === '*') {
      out.push('  ')
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out.push(blank(source[i])); i++
      }
      out.push('  ')
      i += 2
      continue
    }

    if (c === "'" || c === '"') {
      // Single- and double-quoted strings: contents PRESERVED verbatim, because
      // the module specifiers we need to read live inside the quotes.
      out.push(c)
      i++
      while (i < n) {
        const d = source[i]
        if (d === '\\') { out.push(d, source[i + 1] ?? ' '); i += 2; continue }
        if (d === c) { out.push(d); i++; break }
        if (d === '\n') { out.push(d); i++; break }
        out.push(d)
        i++
      }
      prevSignificant = 'x'
      continue
    }

    if (c === '`') {
      // Template literals are the one case where preserving contents verbatim is
      // NOT safe: a template may span lines, and a line inside it can look
      // exactly like an import declaration. So template contents are BLANKED
      // (newlines kept, so line anchors are unaffected) rather than preserved.
      // Module specifiers are never inside a template literal in this codebase,
      // and the parser-recovery test below would fail loudly if that ever
      // changed. Trade-off: a specifier written as a template literal
      // (`from `+'`x'`+``) is not collected. Stated rather than hidden.
      out.push('`')
      i++
      while (i < n) {
        const d = source[i]
        if (d === '\\') { out.push(' ', ' '); i += 2; continue }
        if (d === '`') { out.push('`'); i++; break }
        out.push(d === '\n' ? '\n' : ' ')
        i++
      }
      prevSignificant = 'x'
      continue
    }

    if (c === '/' && regexCanStartHere()) {
      out.push(' ')
      i++
      let inClass = false
      while (i < n) {
        const d = source[i]
        if (d === '\\') { out.push(' ', ' '); i += 2; continue }
        if (d === '[') inClass = true
        else if (d === ']') inClass = false
        else if (d === '/' && !inClass) { out.push(' '); i++; break }
        else if (d === '\n') break
        out.push(blank(d))
        i++
      }
      prevSignificant = 'x'
      continue
    }

    out.push(c)
    if (!/\s/.test(c)) prevSignificant = c
    i++
  }

  return out.join('')
}

/**
 * Collect the specifier of every static ESM import declaration, in source order.
 *
 * Each pattern is anchored at the start of a line and bounded by `[^;'"]*?`, so a
 * match cannot run past a semicolon or a quote into unrelated code. Two forms are
 * recognised: `import ... from 'spec'` and the side-effect `import 'spec'`.
 * Results are sorted by the position of the declaration so that the two passes do
 * not reorder imports relative to the file.
 *
 * SUPPORTED SCOPE, stated accurately. This is a deliberately small scanner, not a
 * JavaScript parser, and it covers exactly the shapes this codebase uses:
 *
 *   - static ESM `import ... from 'spec'`, including multi-line named-import
 *     lists with comments interleaved, and the side-effect `import 'spec'`;
 *   - line and block comments, blanked so they can neither manufacture nor hide
 *     a declaration;
 *   - string, template and regex literals, so a `//` or `/*` inside a literal is
 *     not read as a comment.
 *
 * NOT supported, and therefore not detected: CommonJS `require()`, dynamic
 * `import()`, and an import specifier written as a template literal. Template
 * CONTENTS are blanked rather than preserved, because a multiline template can
 * contain a line that is textually identical to an import declaration; the
 * specifier of a real import is always in a quoted string, never in a template.
 */
function extractImportSpecifiers(source) {
  const code = stripComments(source)
  const found = []
  for (const match of code.matchAll(/^[ \t]*import\b[^;'"]*?\bfrom[ \t]*(['"])([^'"\n]+)\1/gm)) {
    found.push({ at: match.index, specifier: match[2] })
  }
  for (const match of code.matchAll(/^[ \t]*import[ \t]+(['"])([^'"\n]+)\1/gm)) {
    found.push({ at: match.index, specifier: match[2] })
  }
  found.sort((a, b) => a.at - b.at)
  return found.map((entry) => entry.specifier)
}

await test('[structural imports] comments cannot manufacture or hide an import declaration', () => {
  const fixtures = [
    {
      note: 'a commented-out import must NOT be collected',
      source: [
        "// import { AvailabilityCalendar } from '../../../availability/availability.calendar.js'",
        "import { BaseRepository } from '../../contracts/base.repository.js'",
      ].join('\n'),
      expect: ['../../contracts/base.repository.js'],
    },
    {
      note: 'a block-commented import must NOT be collected',
      source: [
        '/*',
        " * import { AvailabilityCalendar } from '../../../availability/availability.calendar.js'",
        ' */',
        "import { BaseRepository } from '../../contracts/base.repository.js'",
      ].join('\n'),
      expect: ['../../contracts/base.repository.js'],
    },
    {
      note: 'an import with interleaved comments MUST still be collected',
      source: [
        'import {',
        "  AvailabilityConflictError, // trailing comment",
        '  /* inline */ AvailabilityConsumptionRecordError',
        "} from '../../../availability/availability.errors.js'",
      ].join('\n'),
      expect: ['../../../availability/availability.errors.js'],
    },
    {
      note: 'an import whose specifier merely contains the calendar word must be collected',
      source: [
        "import { AvailabilityCalendar } from '../../../availability/availability.calendar.js'",
      ].join('\n'),
      expect: ['../../../availability/availability.calendar.js'],
    },
    {
      note: 'a side-effect import must be collected, in source order',
      source: [
        "import './side-effect.js'",
        "import x from './real.js'",
      ].join('\n'),
      expect: ['./side-effect.js', './real.js'],
    },
    {
      note: 'an import inside a MULTILINE template literal is not a declaration',
      source: [
        'const template = `',
        "  import x from '../../../availability/availability.calendar.js'",
        '  and some prose mentioning import y from "./elsewhere.js"',
        '`',
        "import { BaseRepository } from './base.js'",
      ].join('\n'),
      expect: ['./base.js'],
    },
    {
      note: 'a template literal using real substitution is not a declaration',
      source: [
        'const t = `path is ${base} and ends here`',
        "import { BaseRepository } from './base.js'",
      ].join('\n'),
      expect: ['./base.js'],
    },
    {
      note: 'a quoted "import" inside a string is not a declaration',
      source: [
        "const doc = 'import { AvailabilityCalendar } from \'./availability.calendar.js\''",
        "import { BaseRepository } from './base.js'",
      ].join('\n'),
      expect: ['./base.js'],
    },
    {
      note: 'a regex containing a slash and a comment-like run is not a comment',
      source: [
        'const re = /[/]\\/*a*b*/',
        "import { BaseRepository } from './base.js'",
      ].join('\n'),
      expect: ['./base.js'],
    },
  ]

  for (const fixture of fixtures) {
    assertDeepEqual(
      extractImportSpecifiers(fixture.source),
      fixture.expect,
      fixture.note
    )
  }
})

await test('[structural imports] the parser recovers the repository\'s real imports', () => {
  // Guards the negative assertion below from passing vacuously: if the parser
  // broke and returned nothing, "no calendar import" would be trivially true.
  const specifiers = extractImportSpecifiers(repositorySource)
  assert(specifiers.length >= 4, `expected at least 4 import declarations, found ${specifiers.length}`)
  for (const expected of [
    '../../contracts/base.repository.js',
    '../../../../database/connection/postgres.connection.js',
    '../../../availability/availability.errors.js',
    '../../errors/repository.errors.js',
  ]) {
    assert(specifiers.includes(expected), `must recover the real import of ${expected}`)
  }
})

await test('[structural imports] the repository no longer imports the shared availability calendar', () => {
  const specifiers = extractImportSpecifiers(repositorySource)
  const calendarImports = specifiers.filter((specifier) =>
    new URL(specifier, REPOSITORY_PATH).pathname.endsWith('/availability/availability.calendar.js')
  )
  assertDeepEqual(
    calendarImports,
    [],
    `the legacy path owns its own arithmetic and must not import the calendar, found: ${calendarImports.join(', ')}`
  )
})

await test('[static text] record validation does not depend on a configurable stay limit', () => {
  const validate = repositorySource.match(/#validateConsumptionRecord\([\s\S]*?\n  \}/)
  assert(validate, 'must find #validateConsumptionRecord')
  // A release must never be gated by today's maxNights, or a line written under a
  // larger limit could become unreleasable. This is an absence property, so it is
  // asserted against the source rather than simulated at runtime.
  assert(!/maxNights/.test(validate[0]), 'record validation must not depend on configurable stay limits')
})

await test('[static text] the reserved key is removed unconditionally, in every mode', () => {
  const build = repositorySource.match(/#buildLineMetadata\([\s\S]*?\n  \}/)
  assert(build, 'must find #buildLineMetadata')
  const deleteAt = build[0].indexOf('delete base[RESERVED_OCCUPIED_NIGHTS_KEY]')
  const assignAt = build[0].indexOf('base[RESERVED_OCCUPIED_NIGHTS_KEY] = consumption')
  const earlyReturnAt = build[0].indexOf('if (!consumption) return base')
  assert(deleteAt !== -1, 'the reserved key must be deleted from caller metadata')
  assert(assignAt !== -1, 'the server record must still be assigned when one exists')
  // The delete must precede the no-record early return, otherwise a forged key
  // would survive on any line that receives no record.
  assert(deleteAt < earlyReturnAt, 'the reserved key must be removed before the no-record return')
  assert(deleteAt < assignAt, 'the caller key must be removed before the server record is assigned')
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log('Repository behaviour is covered separately in reservation.repository.occupied-nights.test.js.')
console.log('The sections marked "[static text]" inspect source text only.')
if (failed > 0) {
  console.log('\nFailures:')
  for (const failure of failures) {
    console.log(`  - ${failure.name}: ${failure.error.message}`)
  }
}
console.log('='.repeat(60))

process.exit(failed === 0 ? 0 : 1)
