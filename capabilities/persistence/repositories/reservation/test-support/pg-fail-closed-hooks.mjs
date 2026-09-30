/**
 * TEST-ONLY module double for the bare specifier `pg`.
 *
 * WHY THIS EXISTS
 * ReservationRepository imports database/connection/postgres.connection.js, which
 * does `import pg from 'pg'` and destructures `const { Pool } = pg` at module
 * load. That module is otherwise unreachable in a test process: calling
 * `transaction()` acquires a real client, and acquiring a real client opens a
 * real socket.
 *
 * HOW THE BOUNDARY WORKS
 * These are Node module-customization hooks. Registering this file makes every
 * bare `pg` import resolve to `test-double:pg` instead, so the genuine `pg`
 * package is never loaded, constructed or contacted in the test process.
 *
 * SCOPE OF THE GUARANTEE, STATED PRECISELY
 * This intercepts the BARE SPECIFIER `pg` and nothing else. It is not a general
 * network sandbox: it does not block sockets, and it does not stop other modules
 * from being loaded. It guarantees one thing — this repository's driver path
 * cannot open a physical database connection, because the Pool it constructs is
 * the double below and the double's connect() only ever returns a client the test
 * installed itself.
 *
 * What still executes is worth being explicit about: the real
 * database/connection/postgres.connection.js is still imported and still runs
 * createPool(), which reads the database configuration and consults
 * process.env.DATABASE_URL while choosing connection options, before it constructs
 * the double Pool. That read happens; it is simply followed by a double
 * construction instead of a real one, so no connection string is ever used to open
 * a connection. This file does not print, log or reproduce any configuration
 * value, and no credential is read here. No production connection code needed to
 * change for this to work.
 *
 * The double is deliberately unable to do real work. It will only hand back the
 * controlled client that the test itself installed on globalThis, and it throws
 * for any capability a real driver would need but a double must not simulate.
 * An unprogrammed statement is likewise an error, never a silent success.
 *
 * WHAT THIS DOES NOT CERTIFY
 * This boundary proves the repository's JavaScript orchestration: statement
 * ordering, parameter binding, BEGIN/COMMIT/ROLLBACK choreography, the
 * conditional capacity guard, the released_at compare-and-set, and
 * pre-mutation validation. It certifies nothing about PostgreSQL itself — not
 * SQL parsing, constraints, a real JSONB column round trip, row-level locking,
 * isolation, concurrency between processes, or physical rollback of a real server.
 */

const FAIL_CLOSED = 'PG_DOUBLE_FAIL_CLOSED'

/**
 * Intercepts only the bare specifier 'pg'. Every other specifier, including all
 * relative and package imports used by production code, resolves normally.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'pg') {
    return { url: 'test-double:pg', format: 'module', shortCircuit: true }
  }
  return nextResolve(specifier, context)
}

const DOUBLE_SOURCE = `
const FAIL_CLOSED = ${JSON.stringify(FAIL_CLOSED)}

function events() {
  if (!globalThis.__pgDoubleState) {
    globalThis.__pgDoubleState = { events: [], poolConstructed: false }
  }
  return globalThis.__pgDoubleState
}

/**
 * A Pool that cannot connect to anything. It exposes only the surface
 * database/connection/postgres.connection.js actually calls, and every
 * capability that would require a server is refused.
 */
export class Pool {
  constructor() {
    const state = events()
    state.poolConstructed = true
    state.events.push({ event: 'pool:construct' })
  }

  on() { return this }

  async connect() {
    const state = events()
    const client = globalThis.__pgDoubleClient
    if (!client) {
      state.events.push({ event: 'pool:connect-refused' })
      throw new Error(FAIL_CLOSED + ': no controlled client was installed for this test')
    }
    state.events.push({ event: 'pool:connect' })
    return client
  }

  async query() {
    events().events.push({ event: 'pool:query-refused' })
    throw new Error(FAIL_CLOSED + ': pool.query() is never used by the code under test')
  }

  async end() {
    events().events.push({ event: 'pool:end' })
  }
}

export default { Pool }

/**
 * Marker so a test can positively assert that the bare specifier 'pg' resolved
 * to this double. If this is absent, the genuine driver was loaded and the
 * fail-closed boundary did not hold.
 */
export const __isPgFailClosedDouble = true
`

export async function load(url, context, nextLoad) {
  if (url === 'test-double:pg') {
    return { format: 'module', shortCircuit: true, source: DOUBLE_SOURCE }
  }
  return nextLoad(url, context)
}
