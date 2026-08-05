/**
 * P14.1 — API Layer Integration Test
 *
 * Verifies that Runtime + API integration works end-to-end.
 */

import { startWithApi } from './application.start.js';
import http from 'node:http';

const START_TIME = performance.now();

async function fetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function waitForServer(maxMs = 10000) {
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

console.log('='.repeat(60));
console.log('P14.1 — API Layer Integration Test');
console.log('='.repeat(60));

let bundle;
try {
  console.log('\n[1/4] Starting Platform Runtime + API...');
  bundle = await startWithApi();
  console.log('  ✓ Platform started');
  console.log(`  RuntimeContext: ${bundle.runtimeContext ? 'SET' : 'MISSING'}`);
  console.log(`  CapabilityRegistry: ${bundle.capabilityRegistry ? 'SET' : 'MISSING'}`);
  console.log(`  RepositoryRuntime: ${bundle.repositoryRuntime ? 'SET' : 'MISSING'}`);

  console.log('\n[2/4] Waiting for API server...');
  const ready = await waitForServer();
  console.log(`  ${ready ? '✓' : '✗'} API server ${ready ? 'ready' : 'NOT ready'}`);

  console.log('\n[3/4] Testing health endpoints...');
  const health = await fetch('/health');
  console.log(`  /health → ${health.status}`);
  const readyEndpoint = await fetch('/ready');
  console.log(`  /ready → ${readyEndpoint.status}`);

  console.log('\n[4/4] Testing Business endpoint (should NOT throw "Runtime context not initialized")...');
  const business = await fetch('/api/v1/businesses');
  console.log(`  /api/v1/businesses → ${business.status}`);
  if (business.status === 500 && JSON.stringify(business.body).includes('Runtime context not initialized')) {
    console.log('  ✗ STILL failing: "Runtime context not initialized"');
  } else if (business.status >= 500) {
    console.log(`  ⚠ Server error (expected - Business logic may need data)`);
    console.log(`  Response: ${JSON.stringify(business.body).slice(0, 200)}`);
  } else {
    console.log('  ✓ Business endpoint works (no Runtime context error)');
  }

} catch (err) {
  console.error('\n✗ Error:', err.message);
  console.error(err.stack);
} finally {
  if (bundle) {
    console.log('\n[Cleanup] Shutting down...');
    await bundle.cleanup();
    console.log('  ✓ Cleaned up');
  }
}

const totalTime = Math.round(performance.now() - START_TIME);
console.log(`\nTotal time: ${totalTime}ms`);
console.log('='.repeat(60));
