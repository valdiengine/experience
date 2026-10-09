/**
 * MVP-DEMO-1 — Albasie Visual Experience Test Suite
 *
 * Focused tests for MVP-DEMO-1:
 * - Identity and route resolution
 * - Routing to EXPERIENCE mode
 * - Migration safety
 * - Production safety
 */

import { createRouteOwnershipRegistry, OWNERSHIP } from './routing/route.registry.js'
import { ROUTE_CONFIG } from './routing/route.config.js'

const STATUS = {
  PASS: 'pass',
  FAIL: 'fail',
  SKIP: 'skip'
}

let passCount = 0
let failCount = 0

const registry = createRouteOwnershipRegistry(ROUTE_CONFIG)

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} - Expected ${expected}, got ${actual}`)
  }
}

function test(name, fn) {
  try {
    fn()
    passCount++
    console.log(`  ✓ ${name}`)
  } catch (error) {
    failCount++
    console.log(`  ✗ ${name}`)
    console.log(`    Error: ${error.message}`)
  }
}

console.log('\n═══════════════════════════════════════════════════════════')
console.log('MVP-DEMO-1 — ALBASIE VISUAL EXPERIENCE TEST SUITE')
console.log('═══════════════════════════════════════════════════════════\n')

// ============================================================================
// 1. IDENTITY TESTS
// ============================================================================

console.log('1. IDENTITY')
console.log('──────────────────────────────────────────────────')

test('valdi.app/albasie resolves to EXPERIENCE', () => {
  const resolved = registry.resolve('valdi.app', '/albasie')
  assertEqual(resolved.ownership, OWNERSHIP.EXPERIENCE, 'Ownership is EXPERIENCE')
  assertEqual(resolved.company, 'albasie', 'Company is albasie')
  assertEqual(resolved.destination, 'valdi', 'Destination is valdi')
})

test('valdi.app/empresa/albasie also resolves to EXPERIENCE', () => {
  const resolved = registry.resolve('valdi.app', '/empresa/albasie')
  assertEqual(resolved.ownership, OWNERSHIP.EXPERIENCE, 'Legacy route is EXPERIENCE')
  assertEqual(resolved.company, 'albasie', 'Company is albasie')
})

test('Canonical /albasie route is exact match', () => {
  const resolved = registry.resolve('valdi.app', '/albasie')
  assertEqual(resolved.matchedPattern, '/albasie', 'Exact match on /albasie')
})

test('Legacy /empresa/albasie route is exact match', () => {
  const resolved = registry.resolve('valdi.app', '/empresa/albasie')
  assertEqual(resolved.matchedPattern, '/empresa/albasie', 'Exact match on /empresa/albasie')
})

// ============================================================================
// 2. PRODUCTION SAFETY TESTS
// ============================================================================

console.log('\n2. PRODUCTION SAFETY')
console.log('──────────────────────────────────────────────────')

test('Blog route remains WORDPRESS', () => {
  const resolved = registry.resolve('valdi.app', '/blog')
  assertEqual(resolved.ownership, OWNERSHIP.WORDPRESS, 'Blog remains WORDPRESS')
})

test('Noticias route remains WORDPRESS', () => {
  const resolved = registry.resolve('valdi.app', '/noticias')
  assertEqual(resolved.ownership, OWNERSHIP.WORDPRESS, 'Noticias remains WORDPRESS')
})

test('Costa route remains WORDPRESS', () => {
  const resolved = registry.resolve('valdi.app', '/empresa/costa')
  assertEqual(resolved.ownership, OWNERSHIP.WORDPRESS, 'Costa remains WORDPRESS')
})

test('Corral route remains WORDPRESS', () => {
  const resolved = registry.resolve('valdi.app', '/turismo/corral')
  assertEqual(resolved.ownership, OWNERSHIP.WORDPRESS, 'Corral remains WORDPRESS')
})

test('/empresa prefix route remains WORDPRESS', () => {
  const resolved = registry.resolve('valdi.app', '/empresa')
  assertEqual(resolved.ownership, OWNERSHIP.WORDPRESS, '/empresa remains WORDPRESS')
})

// ============================================================================
// 3. MIGRATION STATE TESTS
// ============================================================================

console.log('\n3. MIGRATION STATE')
console.log('──────────────────────────────────────────────────')

test('Albasie migration state is EXPERIENCE', () => {
  const resolved = registry.resolve('valdi.app', '/albasie')
  assertEqual(resolved.migrationState, 'EXPERIENCE', 'Migration state is EXPERIENCE')
})

test('No auto-migration of Albasie', () => {
  const resolved = registry.resolve('valdi.app', '/albasie')
  assertEqual(resolved.ownership, OWNERSHIP.EXPERIENCE, 'Albasie is EXPERIENCE, not auto-migrated')
})

// ============================================================================
// 4. URL PRESERVATION TESTS
// ============================================================================

console.log('\n4. URL PRESERVATION')
console.log('──────────────────────────────────────────────────')

test('Canonical URL /albasie is preserved', () => {
  const resolved = registry.resolve('valdi.app', '/albasie')
  assertEqual(resolved.valid, true, 'Route is valid')
  assertEqual(resolved.ownership, OWNERSHIP.EXPERIENCE, 'Route is EXPERIENCE')
})

test('No redirect from /albasie to /empresa/albasie', () => {
  const albasieResolved = registry.resolve('valdi.app', '/albasie')
  const empresaResolved = registry.resolve('valdi.app', '/empresa/albasie')

  assertEqual(albasieResolved.matchedPattern, '/albasie', '/albasie matches /albasie pattern')
  assertEqual(empresaResolved.matchedPattern, '/empresa/albasie', '/empresa/albasie matches its own pattern')
  assertEqual(albasieResolved.ownership, OWNERSHIP.EXPERIENCE, '/albasie is EXPERIENCE')
  assertEqual(empresaResolved.ownership, OWNERSHIP.EXPERIENCE, '/empresa/albasie is also EXPERIENCE')
})

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════')
console.log('MVP-DEMO-1 — TEST RESULTS')
console.log('═══════════════════════════════════════════════════════════')
console.log(`\n  Passed:  ${passCount}`)
console.log(`  Failed:  ${failCount}`)
console.log(`  Total:   ${passCount + failCount}`)
console.log('═══════════════════════════════════════════════════════════\n')

process.exit(failCount > 0 ? 1 : 0)
