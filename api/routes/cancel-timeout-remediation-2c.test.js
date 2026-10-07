/**
 * CANCEL-TEMEOUT-REMEDIATION-2C — focused closure tests.
 *
 * These tests drive the REAL registered route chain
 * (`registerReservationRoutes` -> authMiddleware -> requireAuth ->
 * requirePermission('reservation:cancel') -> controller.cancel) so the
 * authorization gate is exercised exactly as it is wired, not a hand-built
 * approximation of it.
 *
 * Two claims are under test:
 *
 *   A. A tenant id that is present but is not a persisted tenant scope
 *      (`tid=commercial`, the synthetic bootstrap tenant) must fail closed
 *      BEFORE any business service and must not become an internal 500.
 *
 *   B. An authenticated tenant-bearing identity that lacks `reservation:cancel`
 *      must not reach the cancellation mutation, and must be answered with
 *      authorization semantics (403) rather than an internal 500.
 *
 * No assertion is relaxed to obtain green. The mutation is observed directly
 * by counting repository mutations, not by inferring success from a status code.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Router } from './router.js';
import { registerReservationRoutes } from './reservation.routes.js';

const RESERVATION_ID = 'c82746fe-2341-4c7e-9825-0f503e1984b2';
const TENANT_ID = '36d84fc9-33db-44f4-ac1d-7400902eb756';
const SYNTHETIC_TENANT_ID = 'commercial';

// ---------------------------------------------------------------------------
// Doubles
// ---------------------------------------------------------------------------

/**
 * A response double that records the exact terminal state. Writing a status
 * after termination throws, which is how double-send is detected.
 */
function createResponseDouble() {
  const state = {
    statusCode: 200,
    headers: {},
    body: null,
    endCalls: 0,
    writableEnded: false,
    headersSent: false,
  };

  return {
    state,
    get statusCode() {
      return state.statusCode;
    },
    set statusCode(value) {
      if (state.writableEnded) {
        throw new Error(`statusCode written after the response terminated: ${value}`);
      }
      state.statusCode = value;
    },
    get headersSent() {
      return state.headersSent;
    },
    get writableEnded() {
      return state.writableEnded;
    },
    setHeader(name, value) {
      if (state.writableEnded) {
        throw new Error(`setHeader after the response terminated: ${name}`);
      }
      state.headers[name] = value;
    },
    end(body) {
      state.endCalls += 1;
      if (state.endCalls > 1) {
        throw new Error('response ended more than once');
      }
      state.body = body === undefined ? null : String(body);
      state.writableEnded = true;
      state.headersSent = true;
    },
  };
}

/**
 * Repository double that counts MUTATIONS separately from reads, so "the
 * cancellation mutation was not reached" is an observation and not an
 * inference from a status code.
 */
function createRepositoryProbe({ reservation = null } = {}) {
  const probe = { reads: 0, mutations: 0, repository: null };
  probe.repository = {
    findById: async () => {
      probe.reads += 1;
      // `ReservationManager.cancelReservation()` writes `notes` and
      // `cancelledAt` onto the object it loaded. Hand back a fresh copy so one
      // test's mutation cannot change what a later test observes.
      return reservation ? { ...reservation } : null;
    },
    cancelReservationWithRelease: async () => {
      probe.mutations += 1;
      return reservation ? { reservation: { ...reservation }, release: null } : null;
    },
  };
  return { probe, repository: probe.repository };
}

const EXISTING_RESERVATION = {
  id: RESERVATION_ID,
  status: 'requested',
  tenantId: TENANT_ID,
  guestId: 'guest-1',
  checkIn: '2026-10-20',
  checkOut: '2026-10-22',
  guests: 2,
  totalAmount: 100,
  notes: '',
};

/**
 * Auth runtime double.
 *
 * `authenticate()` is what `authMiddleware` calls. `hasPermission()` is what
 * `requirePermission` calls. The permission decision is computed from the
 * identity's own permission list, mirroring the real contract: a grant is
 * required, and an absent grant is a denial.
 */
function createAuthRuntime({ authenticated = true, identity = null, reason = null } = {}) {
  return {
    async authenticate() {
      if (!authenticated) {
        return { authenticated: false, identity: null, reason };
      }
      return { authenticated: true, identity };
    },
    async hasPermission(user, permission) {
      const granted = user?.permissions;
      if (!Array.isArray(granted)) return false;
      return granted.includes(permission);
    },
  };
}

/**
 * Run `operation` against a runtime context carrying the given auth runtime and
 * repository probe, restoring the previous global afterwards.
 */
async function withRuntime({ authRuntime, probe }, operation) {
  const previous = global.runtimeContext;
  global.runtimeContext = {
    auth: authRuntime,
    repositories: {
      get: async () => probe.repository,
    },
  };
  try {
    return await operation();
  } finally {
    global.runtimeContext = previous;
  }
}

function buildRealRouter() {
  const router = new Router();
  registerReservationRoutes(router);
  return router;
}

function cancelRequest() {
  return {
    method: 'POST',
    pathname: `/api/v1/reservations/${RESERVATION_ID}/cancel`,
    params: { id: RESERVATION_ID },
    body: { reason: 'guest request' },
    headers: {},
  };
}

/**
 * A cancel request that PRESENTS a credential.
 *
 * This matters for test integrity: `authMiddleware` treats a header-less
 * request as anonymous and `requireAuth` answers 401, which would make every
 * tenant and permission assertion below pass for the wrong reason. Presenting a
 * credential moves the rejection to the gate actually under test.
 */
function presentedCancelRequest() {
  const req = cancelRequest();
  req.headers.authorization = 'Bearer presented.token.value';
  return req;
}

function identityWith({ permissions, tenantId = TENANT_ID }) {
  const identity = { id: 'user-1' };
  // `permissions` is intentionally left ABSENT when not supplied, to cover the
  // "claim missing" case distinctly from the "claim empty" case.
  if (permissions !== undefined) {
    identity.permissions = permissions;
  }
  if (tenantId !== null) {
    identity.tenant = { id: tenantId, name: 'MVP10' };
  }
  return identity;
}

// ---------------------------------------------------------------------------
// A. Synthetic / structurally invalid tenant
// ---------------------------------------------------------------------------

test('A1. a synthetic commercial tenant fails closed before any business logic and is not a 500', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const identity = identityWith({ permissions: ['reservation:cancel'], tenantId: SYNTHETIC_TENANT_ID });

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime({ identity }), probe }, () =>
    router.handle(presentedCancelRequest(), res)
  );

  assert.equal(res.state.statusCode, 401, 'a synthetic tenant must not be reported as an internal error');
  assert.equal(res.state.writableEnded, true, 'the response must be terminated');
  assert.equal(res.state.endCalls, 1, 'the response must terminate exactly once');
  assert.equal(probe.reads, 0, 'no repository read may be attempted');
  assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
  assert.ok(
    !String(res.state.body).includes('commercial'),
    'the body must not echo the rejected tenant id'
  );
});

test('A2. a non-string tenant id is refused, because the scope contract refuses non-strings', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const identity = identityWith({ permissions: ['reservation:cancel'] });
  identity.tenant = { id: { injected: true }, name: 'MVP10' };

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime({ identity }), probe }, () =>
    router.handle(presentedCancelRequest(), res)
  );

  assert.equal(res.state.statusCode, 401, 'a non-string tenant scope must fail closed');
  assert.equal(probe.reads, 0, 'no repository read may be attempted');
  assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
});

test('A3. a blank tenant id is refused', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const identity = identityWith({ permissions: ['reservation:cancel'], tenantId: '   ' });

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime({ identity }), probe }, () =>
    router.handle(presentedCancelRequest(), res)
  );

  assert.equal(res.state.statusCode, 401, 'a blank tenant scope must fail closed');
  assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
});

test('A4. a well-formed tenant that is not the synthetic one still reaches the tenant-scoped architecture', async () => {
  // Guards the fix from over-reaching: `isPersistedTenantScope` is a NEGATIVE
  // check by design, so an unfamiliar but non-synthetic tenant form must not be
  // refused here. Existence is the database's answer, not this route's.
  const { probe, repository } = createRepositoryProbe({ reservation: null });
  const identity = identityWith({ permissions: ['reservation:cancel'], tenantId: 'tenant-form-not-yet-seen' });

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime({ identity }), probe }, () =>
    router.handle(presentedCancelRequest(), res)
  );

  assert.notEqual(res.state.statusCode, 401, 'a non-synthetic tenant scope must not be refused by the route');
  assert.equal(probe.reads, 1, 'the scoped read must be attempted and left to the database to answer');
});

// ---------------------------------------------------------------------------
// B. Permission chain
// ---------------------------------------------------------------------------

test('B1. a valid tenant with reservation:cancel reaches the scoped cancellation mutation', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const identity = identityWith({ permissions: ['reservation:cancel'] });

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime({ identity }), probe }, () =>
    router.handle(presentedCancelRequest(), res)
  );

  assert.equal(res.state.statusCode, 200, 'a granted identity must reach the scoped path');
  assert.equal(probe.mutations, 1, 'the cancellation mutation must actually run');
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.success, true);
});

test('B2. an authenticated valid tenant with permissions=[] cannot reach the mutation', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const identity = identityWith({ permissions: [] });

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime({ identity }), probe }, () =>
    router.handle(presentedCancelRequest(), res)
  );

  assert.equal(res.state.statusCode, 403, 'an empty grant set must be forbidden, not an internal error');
  assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
  assert.equal(probe.reads, 0, 'the denial must be decided before any business read');
});

test('B3. an authenticated valid tenant with the permissions claim missing cannot reach the mutation', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const identity = identityWith({}); // no `permissions` key at all

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime({ identity }), probe }, () =>
    router.handle(presentedCancelRequest(), res)
  );

  assert.equal(res.state.statusCode, 403, 'a missing grant set must be forbidden, not an internal error');
  assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
});

test('B4. an authenticated valid tenant with an unrelated permission cannot reach the mutation', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const identity = identityWith({ permissions: ['reservation:read', 'business:update'] });

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime({ identity }), probe }, () =>
    router.handle(presentedCancelRequest(), res)
  );

  assert.equal(res.state.statusCode, 403, 'an unrelated grant must not authorize cancellation');
  assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
});

test('B5. the grant gate is fail-closed when no auth runtime is reachable at all', async () => {
  // `requirePermission` must not degrade into "allow" when it cannot ask anyone.
  //
  // This is asserted against the middleware directly, because the state is
  // unreachable through the full chain: `authMiddleware` (line 79) and the
  // middleware's own `checkPermission` (line 104) both read
  // `global.runtimeContext.auth`, so an absent runtime is already answered with
  // 503 by `authMiddleware` before the grant gate is reached. The fail-closed
  // property of the gate itself still has to hold on its own terms.
  const { requirePermission } = await import('../middleware/authorization.middleware.js');
  const { probe } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const middleware = requirePermission('reservation:cancel');

  const previous = global.runtimeContext;
  global.runtimeContext = { repositories: { get: async () => probe.repository } };
  try {
    const res = createResponseDouble();
    let continued = false;
    await middleware(
      {
        ...cancelRequest(),
        user: identityWith({ permissions: ['reservation:cancel'] }),
        authenticated: true,
      },
      res,
      async () => {
        continued = true;
      }
    );

    assert.equal(continued, false, 'an undecidable grant must not continue to the handler');
    assert.equal(res.state.statusCode, 403, 'an undecidable grant must fail closed');
    assert.equal(res.state.endCalls, 1, 'the denial must terminate the response exactly once');
    assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
  } finally {
    global.runtimeContext = previous;
  }
});

test('B6. the grant gate answers 401 before it answers 403 when no identity is present', async () => {
  const { requirePermission } = await import('../middleware/authorization.middleware.js');
  const { probe } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const middleware = requirePermission('reservation:cancel');

  const previous = global.runtimeContext;
  global.runtimeContext = {
    auth: createAuthRuntime({ identity: identityWith({ permissions: ['reservation:cancel'] }) }),
    repositories: { get: async () => probe.repository },
  };
  try {
    const res = createResponseDouble();
    let continued = false;
    await middleware({ ...cancelRequest(), authenticated: false }, res, async () => {
      continued = true;
    });

    assert.equal(continued, false, 'no identity must not continue to the handler');
    assert.equal(res.state.statusCode, 401, 'an unauthenticated caller must get 401, not 403');
    assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
  } finally {
    global.runtimeContext = previous;
  }
});

// ---------------------------------------------------------------------------
// C. Accepted Remediation-2 behaviour must be unchanged by 2C
// ---------------------------------------------------------------------------

test('C1. a rejected Bearer credential is still a bounded 401 and never reaches the grant gate or handler', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });

  const router = buildRealRouter();
  const res = createResponseDouble();
  const req = cancelRequest();
  req.headers.authorization = 'Bearer rejected.token.value';

  await withRuntime(
    {
      authRuntime: createAuthRuntime({ authenticated: false, reason: 'EXPIRED' }),
      probe,
    },
    () => router.handle(req, res)
  );

  assert.equal(res.state.statusCode, 401);
  assert.equal(res.state.endCalls, 1);
  assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
});

test('C2. an absent credential is still a bounded 401 and never reaches the grant gate or handler', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime(), probe }, () =>
    router.handle(cancelRequest(), res)
  );

  assert.equal(res.state.statusCode, 401);
  assert.equal(res.state.endCalls, 1);
  assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
});

test('C3. a tenant-less authenticated identity is still refused before the grant gate decides', async () => {
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });
  const identity = identityWith({ permissions: ['reservation:cancel'], tenantId: null });

  const router = buildRealRouter();
  const res = createResponseDouble();

  await withRuntime({ authRuntime: createAuthRuntime({ identity }), probe }, () =>
    router.handle(presentedCancelRequest(), res)
  );

  // No tenancy means no authorization decision is reachable, so this is the
  // accepted Remediation-2 401 with `CANCEL_TENANT_REQUIRED`, not a 403.
  assert.equal(res.state.statusCode, 401);
  assert.equal(res.state.endCalls, 1);
  assert.equal(probe.reads, 0, 'the tenant check must precede any business read');
  assert.equal(probe.mutations, 0, 'the cancellation mutation must not be reachable');
});

test('C4. the grant gate runs after authentication, so a rejected credential is never reported as forbidden', async () => {
  // Guards ordering: a 403 must never be the answer to a failed credential,
  // because that would tell an unauthenticated caller that the resource exists.
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });

  const router = buildRealRouter();
  const res = createResponseDouble();
  const req = cancelRequest();
  req.headers.authorization = 'Bearer rejected.token.value';

  await withRuntime(
    {
      authRuntime: createAuthRuntime({
        authenticated: false,
        identity: identityWith({ permissions: ['reservation:cancel'] }),
        reason: 'INVALID_SIGNATURE',
      }),
      probe,
    },
    () => router.handle(req, res)
  );

  assert.equal(res.state.statusCode, 401, 'a refused credential must stay 401');
  assert.notEqual(res.state.statusCode, 403);
});

// ---------------------------------------------------------------------------
// D. Contract proofs for the two claims in the report
// ---------------------------------------------------------------------------

test('D1. the route uses the existing isPersistedTenantScope contract, not a new tenant subsystem', async () => {
  const { isPersistedTenantScope } = await import('../../capabilities/reservation/reservation.manager.js');

  // The contract is negative by design: only the synthetic tenant is refused.
  assert.equal(isPersistedTenantScope(SYNTHETIC_TENANT_ID), false);
  assert.equal(isPersistedTenantScope(TENANT_ID), true);
  assert.equal(isPersistedTenantScope(''), false);
  assert.equal(isPersistedTenantScope('   '), false);
  assert.equal(isPersistedTenantScope(null), false);
  assert.equal(isPersistedTenantScope(undefined), false);
  assert.equal(isPersistedTenantScope(123), false);
  assert.equal(isPersistedTenantScope({ id: TENANT_ID }), false);
  // A real but unfamiliar tenant form is deliberately still permitted.
  assert.equal(isPersistedTenantScope('some-new-tenant-form'), true);
});

test('D2. the existing manager layer independently refuses the mutation without the grant', async () => {
  // Proves the claim that `ReservationManager.cancelReservation()` already
  // blocks the mutation, independently of the new route middleware, by calling
  // it directly with an identity that carries no grant and an auth runtime
  // that denies.
  const { ReservationManager } = await import('../../capabilities/reservation/reservation.manager.js');
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });

  const manager = new ReservationManager({
    repositories: { reservation: repository },
    runtime: {
      auth: {
        async authorize() {
          throw new Error('Authorization denied: reservation:cancel on reservation');
        },
      },
    },
  });

  await assert.rejects(
    () => manager.cancelReservation(RESERVATION_ID, 'guest request', { tenantId: TENANT_ID, userId: 'user-1', permissions: [] }),
    /Missing permission: reservation:cancel/
  );

  assert.equal(probe.mutations, 0, 'the manager layer alone must already prevent the mutation');
});

test('D3. the manager layer is fail-open only when no auth runtime is present, which the route gate now covers', async () => {
  // Documents the known shape of `#checkPermission`: it permits when the
  // context has no auth runtime. The route middleware denies in that same
  // situation (B5), so /cancel is covered even though the shared manager
  // method is intentionally left unchanged for internal/timer callers.
  const { ReservationManager } = await import('../../capabilities/reservation/reservation.manager.js');
  const { probe, repository } = createRepositoryProbe({ reservation: EXISTING_RESERVATION });

  const manager = new ReservationManager({
    repositories: { reservation: repository },
  });

  await manager.cancelReservation(RESERVATION_ID, 'guest request', { tenantId: TENANT_ID, userId: 'user-1' });

  assert.equal(probe.mutations, 1, 'with no auth runtime the shared manager permits, as documented');
});
