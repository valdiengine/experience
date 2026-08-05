/**
 * P14.0.7 — API Layer Runtime Smoke Test
 *
 * Executes the API Layer bootstrap and verifies:
 * - Server boots and shuts down
 * - Health endpoints respond
 * - Route groups register
 * - Middleware executes
 * - Runtime integration
 */

import { bootstrapApi, shutdownApi } from '../../api/bootstrap/api.bootstrap.js';
import { writeFileSync } from 'fs';
import { platform, release, hostname } from 'os';

const NODE_VERSION = process.version;
const OS = platform() + ' ' + release();
const START_TIME = performance.now();

const results = [];
const addTest = (id, pass, detail) => results.push({ id, pass, detail });

/**
 * Execute HTTP request against running server
 */
async function fetch(path) {
  const port = process.env.API_PORT || 3000;
  const http = await import('http');
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer(port, maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      await fetch('/health');
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return false;
}

async function run() {
  console.log('='.repeat(60));
  console.log('P14.0.7 — API Layer Runtime Smoke Test');
  console.log('='.repeat(60));
  console.log(`Node: ${NODE_VERSION}`);
  console.log(`OS: ${OS}`);
  console.log('');

  let server = null;

  try {
    // 1. BOOTSTRAP EXECUTION
    console.log('[1/8] Executing API Bootstrap...');
    try {
      server = await bootstrapApi({ port: 3000, host: '0.0.0.0' });
      addTest('api.bootstrap.success', true, 'API bootstrap executed');
      console.log('  ✓ API Bootstrap succeeded');
    } catch (error) {
      addTest('api.bootstrap.success', false, `Error: ${error.message}`);
      console.log(`  ✗ API Bootstrap failed: ${error.message}`);
      throw error;
    }

    // 2. WAIT FOR SERVER READY
    console.log('[2/8] Waiting for server to be ready...');
    const ready = await waitForServer(3000);
    if (ready) {
      addTest('server.ready', true, 'Server responded to health check');
      console.log('  ✓ Server is ready');
    } else {
      addTest('server.ready', false, 'Server did not respond within 10s');
      console.log('  ✗ Server not ready');
    }

    // 3. HEALTH ENDPOINTS
    console.log('[3/8] Testing health endpoints...');
    const healthEndpoints = [
      { path: '/health', name: 'liveness' },
      { path: '/ready', name: 'readiness' },
      { path: '/live', name: 'liveness-alt' },
    ];

    for (const endpoint of healthEndpoints) {
      try {
        const response = await fetch(endpoint.path);
        const pass = response.status === 200;
        addTest(
          `health.${endpoint.name}`,
          pass,
          `HTTP ${response.status}: ${JSON.stringify(response.body).slice(0, 100)}`
        );
        console.log(
          `  ${pass ? '✓' : '✗'} ${endpoint.path} → HTTP ${response.status}`
        );
      } catch (error) {
        addTest(`health.${endpoint.name}`, false, `Error: ${error.message}`);
        console.log(`  ✗ ${endpoint.path} → ${error.message}`);
      }
    }

    // 4. ROUTE REGISTRATION
    console.log('[4/8] Verifying route groups...');
    const routeGroups = [
      { path: '/api/v1/businesses', name: 'Business' },
      { path: '/api/v1/accommodations', name: 'Accommodation' },
      { path: '/api/v1/availability', name: 'Availability' },
      { path: '/api/v1/reservations', name: 'Reservation' },
      { path: '/api/v1/visitors', name: 'Visitor' },
      { path: '/api/v1/payments', name: 'Payment' },
      { path: '/api/v1/reviews', name: 'Review' },
    ];

    let registeredRoutes = 0;
    for (const route of routeGroups) {
      try {
        const response = await fetch(route.path);
        // Any response (even 401/403) means route is registered
        const pass = response.status !== 404;
        addTest(
          `route.${route.name.toLowerCase()}`,
          pass,
          `HTTP ${response.status} (route registered)`
        );
        if (pass) registeredRoutes++;
        console.log(`  ${pass ? '✓' : '✗'} ${route.name} → HTTP ${response.status}`);
      } catch (error) {
        addTest(`route.${route.name.toLowerCase()}`, false, error.message);
        console.log(`  ✗ ${route.name} → ${error.message}`);
      }
    }
    addTest(
      'route.groups.total',
      registeredRoutes === routeGroups.length,
      `${registeredRoutes}/${routeGroups.length} routes registered`
    );

    // 5. MIDDLEWARE EXECUTION
    console.log('[5/8] Testing middleware chain...');
    const http = await import('http');
    const middlewareTest = await new Promise((resolve) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 3000,
          path: '/api/v1/businesses',
          method: 'GET',
        },
        (res) => {
          const headers = res.headers;
          const hasRequestId = headers['x-request-id'] !== undefined;
          const hasCorrelationId = headers['x-correlation-id'] !== undefined;
          resolve({
            status: res.statusCode,
            hasRequestId,
            hasCorrelationId,
          });
        }
      );
      req.on('error', (e) => resolve({ error: e.message }));
      req.end();
    });

    addTest(
      'middleware.requestId',
      middlewareTest.hasRequestId,
      middlewareTest.hasRequestId ? 'x-request-id header present' : 'missing'
    );
    addTest(
      'middleware.correlationId',
      middlewareTest.hasCorrelationId,
      middlewareTest.hasCorrelationId
        ? 'x-correlation-id header present'
        : 'missing'
    );
    console.log(
      `  ${middlewareTest.hasRequestId ? '✓' : '✗'} Request ID middleware`
    );
    console.log(
      `  ${middlewareTest.hasCorrelationId ? '✓' : '✗'} Correlation ID middleware`
    );

    // 6. NEGATIVE TESTS
    console.log('[6/8] Testing negative cases...');
    try {
      const unknownResponse = await fetch('/api/v1/nonexistent-route-xyz');
      const handles404 = unknownResponse.status === 404;
      addTest(
        'negative.unknown_route',
        handles404,
        handles404 ? 'Returns 404 for unknown routes' : `Returns ${unknownResponse.status}`
      );
      console.log(`  ${handles404 ? '✓' : '✗'} Unknown route → 404`);
    } catch (error) {
      addTest('negative.unknown_route', false, error.message);
    }

    // 7. IDEMPOTENT SHUTDOWN
    console.log('[7/8] Testing shutdown...');
    const shutdownStart = performance.now();
    await shutdownApi(server);
    const shutdownTime = Math.round(performance.now() - shutdownStart);
    addTest('shutdown.success', true, `Shutdown completed in ${shutdownTime}ms`);
    console.log(`  ✓ Shutdown succeeded (${shutdownTime}ms)`);

    // Try shutdown again (should be idempotent)
    try {
      await shutdownApi(server);
      addTest('shutdown.idempotent', true, 'Second shutdown did not throw');
      console.log('  ✓ Shutdown is idempotent');
    } catch (error) {
      addTest('shutdown.idempotent', false, error.message);
      console.log(`  ✗ Shutdown not idempotent: ${error.message}`);
    }

    // 8. STARTUP/SHUTDOWN TIMING
    const totalTime = Math.round(performance.now() - START_TIME);
    addTest(
      'performance.startup_time',
      true,
      `Total test execution: ${totalTime}ms`
    );
    console.log(`[8/8] Total execution time: ${totalTime}ms`);
  } catch (error) {
    console.log(`\n✗ Fatal error: ${error.message}`);
    console.error(error.stack);
    addTest('fatal.error', false, error.message);
  }

  // SUMMARY
  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const score = Math.round((passed / results.length) * 100);

  for (const result of results) {
    console.log(`  ${result.pass ? '✓' : '✗'} [${result.id}] ${result.detail}`);
  }

  console.log('');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log(`Score: ${score}/100`);

  // Generate report
  const report = {
    phase: 'P14.0.7 — API Layer Runtime Smoke Test',
    timestamp: new Date().toISOString(),
    environment: {
      node: NODE_VERSION,
      os: OS,
    },
    results: results,
    summary: {
      total: results.length,
      passed,
      failed,
      score,
    },
    verdict: score === 100 ? 'API FOUNDATION VERIFIED — READY FOR P14.1' : 'ISSUES FOUND',
  };

  // Write report
  const reportPath = 'runtime/startup/api-smoke.report.json';
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportPath}`);

  if (score < 100) {
    console.log('\n⚠️  Some tests failed. Review above for details.');
  } else {
    console.log('\n✓ ALL TESTS PASSED');
  }

  return report;
}

run().catch(console.error);
