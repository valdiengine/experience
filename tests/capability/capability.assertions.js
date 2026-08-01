/**
 * Reusable assertions for capability suites (P13.5.7)
 *
 * Every helper returns `{ pass, detail }` and is safe to call from any suite.
 * They read the writable in-memory store, the recording event bus, the mock
 * authorization/search/sync recorders, and the engine health surface.
 */

export function check(id, pass, detail) {
  return { id, pass, detail }
}

export function storeRows(bundle, entityName) {
  const table = bundle.store.get(entityName)
  return table ? Array.from(table.values()) : []
}

/**
 * Assert repository state via a predicate over the stored rows.
 */
export async function assertRepository(bundle, entityName, predicate, detail) {
  try {
    const rows = storeRows(bundle, entityName)
    const pass = predicate(rows)
    return { pass, detail: pass ? detail : `${detail} — actual rows: ${JSON.stringify(rows)}` }
  } catch (err) {
    return { pass: false, detail: `${detail} — error: ${err.message}` }
  }
}

/**
 * Assert that an event was emitted (optionally matching a predicate).
 */
export async function assertEvent(bundle, eventName, detail, predicate) {
  const emitted = bundle.eventBus.count(eventName)
  const pass = predicate ? emitted > 0 && bundle.eventBus.events().some((e) => e.event === eventName && predicate(e.data)) : emitted > 0
  return { pass, detail: pass ? detail : `${detail} — event "${eventName}" not found (emitted ${emitted} times)` }
}

/**
 * Assert authorization was invoked for a permission (per recorded mock calls).
 */
export async function assertAuthorization(bundle, permission, detail) {
  const calls = bundle.mockRuntime.auth.calls.filter((c) => c.op === 'authorize' && c.permission === permission)
  return { pass: calls.length > 0, detail: calls.length > 0 ? detail : `${detail} — no authorize(${permission}) call recorded` }
}

/**
 * Assert search received an index payload of a type (optionally matching a predicate).
 */
export async function assertSearchIndexed(bundle, type, detail, predicate) {
  const entries = bundle.mockRuntime.search.indexed.filter((e) => e.type === type)
  const pass = entries.length > 0 && (predicate ? entries.some((e) => predicate(e.payload)) : true)
  return { pass, detail: pass ? detail : `${detail} — no search.index("${type}") recorded (${entries.length})` }
}

/**
 * Assert search received a delete for an id.
 */
export async function assertSearchDeleted(bundle, type, id, detail) {
  const found = bundle.mockRuntime.search.deleted.some((e) => e.type === type && e.id === id)
  return { pass: found, detail: found ? detail : `${detail} — no search.delete("${type}", "${id}") recorded` }
}

/**
 * Assert sync received a push for a type.
 */
export async function assertSyncPushed(bundle, type, detail, predicate) {
  const entries = bundle.mockRuntime.sync.pushed.filter((e) => e.type === type)
  const pass = entries.length > 0 && (predicate ? entries.some((e) => predicate(e.payload)) : true)
  return { pass, detail: pass ? detail : `${detail} — no sync.push("${type}") recorded (${entries.length})` }
}

/**
 * Assert the engine health check reports healthy.
 */
export async function assertRuntimeHealthy(bundle, detail) {
  try {
    const health = await bundle.engine.healthCheck()
    const values = health && typeof health === 'object' ? Object.values(health) : []
    const pass = values.length > 0 && values.every((v) => v === 'healthy' || v === 'ready' || v === 'up' || v === true)
    return { pass, detail: pass ? detail : `${detail} — health: ${JSON.stringify(health)}` }
  } catch (err) {
    return { pass: false, detail: `${detail} — error: ${err.message}` }
  }
}

/**
 * Assert no circular dependency among capabilities (static dependency graph).
 */
export function assertNoCircularReferences(capabilities, detail) {
  const byId = new Map(capabilities.map((c) => [c.id, c]))
  const state = new Map() // 0=visiting, 1=done
  let cycle = null
  const visit = (id, path) => {
    if (state.get(id) === 1) return
    if (state.get(id) === 0) { cycle = path.slice(path.indexOf(id)).concat(id); return }
    state.set(id, 0)
    const cap = byId.get(id)
    if (cap) for (const dep of cap.dependencies || []) visit(dep, [...path, id])
    state.set(id, 1)
  }
  for (const cap of capabilities) visit(cap.id, [])
  return { pass: !cycle, detail: cycle ? `${detail} — circular reference found: ${cycle.join(' -> ')}` : detail }
}

/**
 * Assert every stored row for an entity belongs to a tenant.
 */
export async function assertTenantIsolation(bundle, entityName, tenantId, detail) {
  const rows = storeRows(bundle, entityName)
  const violating = rows.filter((r) => r.tenantId && r.tenantId !== tenantId)
  return { pass: violating.length === 0, detail: violating.length === 0 ? detail : `${detail} — ${violating.length} rows violate tenant isolation` }
}

/**
 * Aggregate assertion: business lifecycle cascade state.
 * Expects the business row to match `businessPredicate` and each aggregate
 * part (accommodation/reservation/visitor) to match its predicate.
 */
export async function assertAggregate(bundle, businessId, expectations, detail) {
  const rows = (name) => storeRows(bundle, name)
  const parts = []
  for (const [name, predicate] of Object.entries(expectations)) {
    const matched = rows(name).filter((r) => (r.businessId || r.id) && (name === 'business' ? r.id === businessId : r.businessId === businessId))
    const okRows = matched.every(predicate)
    parts.push(`${name}:${matched.length}rows:${okRows ? 'ok' : 'FAIL'}`)
    if (!okRows) {
      return { pass: false, detail: `${detail} — aggregate part ${name} failed. ${JSON.stringify(matched)}` }
    }
  }
  return { pass: true, detail: `${detail} — ${parts.join(' ')}` }
}
