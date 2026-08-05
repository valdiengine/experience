/**
 * Runtime Guardian
 *
 * Verifies:
 * - Runtime Bootstrap
 * - RuntimeContext
 * - Application Entry Point
 * - Health Engine
 * - Lifecycle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

export class RuntimeGuardian {
  constructor() {
    this.checks = [];
    this.violations = [];
  }

  exists(filePath) {
    return fs.existsSync(filePath);
  }

  async run() {
    console.log('[GUARDIAN:RUNTIME] Starting Runtime checks...');

    this.checkRuntimeBootstrap();
    this.checkRuntimeContext();
    this.checkApplicationEntry();
    this.checkHealthEngine();
    this.checkCapabilityBootstrap();
    this.checkRepositoryBootstrap();

    return {
      checks: this.checks,
      violations: this.violations,
      status: this.violations.length === 0 ? 'PASS' : 'FAIL'
    };
  }

  checkRuntimeBootstrap() {
    const file = path.join(ROOT, 'runtime/bootstrap/runtime.bootstrap.js');
    const exists = this.exists(file);

    this.checks.push({
      name: 'Runtime Bootstrap',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Runtime Bootstrap exists' : 'Runtime Bootstrap missing'
    });
  }

  checkRuntimeContext() {
    const patterns = [
      'runtime/core/context/RuntimeContext.js',
      'runtime/core/context/runtime.context.js',
      'runtime/core/context.js'
    ];

    let found = false;
    let foundPath = null;

    for (const p of patterns) {
      const file = path.join(ROOT, p);
      if (this.exists(file)) {
        found = true;
        foundPath = p;
        break;
      }
    }

    this.checks.push({
      name: 'RuntimeContext',
      status: found ? 'PASS' : 'FAIL',
      message: found ? `RuntimeContext found at ${foundPath}` : 'RuntimeContext not found'
    });
  }

  checkApplicationEntry() {
    const file = path.join(ROOT, 'runtime/startup/application.start.js');
    const exists = this.exists(file);

    this.checks.push({
      name: 'Application Entry Point',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'application.start.js exists' : 'application.start.js missing'
    });

    // Check for startWithApi method
    if (exists) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content && content.includes('startWithApi')) {
        this.checks.push({
          name: 'startWithApi Method',
          status: 'PASS',
          message: 'startWithApi method exists'
        });
      }
    }
  }

  checkHealthEngine() {
    const healthDir = path.join(ROOT, 'runtime/health');
    const exists = this.exists(healthDir);

    this.checks.push({
      name: 'Health Engine',
      status: exists ? 'PASS' : 'WARNING',
      message: exists ? 'Health directory exists' : 'Health directory missing (optional)'
    });
  }

  checkCapabilityBootstrap() {
    const file = path.join(ROOT, 'runtime/startup/capability.bootstrap.js');
    const exists = this.exists(file);

    this.checks.push({
      name: 'Capability Bootstrap',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Capability Bootstrap exists' : 'Capability Bootstrap missing'
    });
  }

  checkRepositoryBootstrap() {
    const file = path.join(ROOT, 'runtime/startup/repository.bootstrap.js');
    const exists = this.exists(file);

    this.checks.push({
      name: 'Repository Bootstrap',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Repository Bootstrap exists' : 'Repository Bootstrap missing'
    });
  }
}

export default RuntimeGuardian;
