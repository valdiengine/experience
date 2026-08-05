/**
 * Repository Guardian
 *
 * Verifies:
 * - Repository count
 * - Naming
 * - Contracts
 * - Mixins
 * - Persistence isolation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

export class RepositoryGuardian {
  constructor() {
    this.checks = [];
    this.violations = [];
  }

  exists(filePath) {
    return fs.existsSync(filePath);
  }

  async run() {
    console.log('[GUARDIAN:REPO] Starting Repository checks...');

    this.checkPersistenceDir();
    this.checkRepositories();
    this.checkMixins();
    this.checkContracts();
    this.checkPersistenceIsolation();

    return {
      checks: this.checks,
      violations: this.violations,
      status: this.violations.length === 0 ? 'PASS' : 'FAIL'
    };
  }

  checkPersistenceDir() {
    const dir = path.join(ROOT, 'persistence');
    const exists = this.exists(dir);

    this.checks.push({
      name: 'Persistence Directory',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Persistence directory exists' : 'Persistence directory missing'
    });
  }

  checkRepositories() {
    const repoDir = path.join(ROOT, 'persistence/repository');
    const exists = this.exists(repoDir);

    this.checks.push({
      name: 'Repository Directory',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Repository directory exists' : 'Repository directory missing'
    });

    if (exists) {
      const files = fs.readdirSync(repoDir).filter(f => f.endsWith('.repository.js'));
      this.checks.push({
        name: 'Repository Count',
        status: files.length > 0 ? 'PASS' : 'WARNING',
        message: `${files.length} repositories found`,
        count: files.length
      });
    }
  }

  checkMixins() {
    const engineDir = path.join(ROOT, 'persistence/engine');
    const exists = this.exists(engineDir);

    this.checks.push({
      name: 'Engine Directory',
      status: exists ? 'PASS' : 'WARNING',
      message: exists ? 'Engine directory exists' : 'Engine directory missing (optional)'
    });

    if (exists) {
      const files = fs.readdirSync(engineDir).filter(f => f.endsWith('.js'));
      this.checks.push({
        name: 'Mixin Count',
        status: files.length > 0 ? 'PASS' : 'WARNING',
        message: `${files.length} engine files found`,
        count: files.length
      });
    }
  }

  checkContracts() {
    const contractsDir = path.join(ROOT, 'persistence/contracts');
    const exists = this.exists(contractsDir);

    this.checks.push({
      name: 'Contracts Directory',
      status: exists ? 'PASS' : 'WARNING',
      message: exists ? 'Contracts directory exists' : 'Contracts directory missing (optional)'
    });

    if (exists) {
      const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('.js'));
      this.checks.push({
        name: 'Contract Count',
        status: files.length > 0 ? 'PASS' : 'WARNING',
        message: `${files.length} contracts found`,
        count: files.length
      });
    }
  }

  checkPersistenceIsolation() {
    // Check that capabilities never import persistence directly
    const capsDir = path.join(ROOT, 'capabilities');

    if (!this.exists(capsDir)) return;

    const entries = fs.readdirSync(capsDir, { withFileTypes: true });
    let hasLeak = false;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const capDir = path.join(capsDir, entry.name);
      const files = this.walkDir(capDir, '.js');

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content && content.includes('persistence/')) {
          hasLeak = true;
          this.violations.push({
            level: 'P1',
            name: 'Persistence Isolation',
            message: `Capability leaks persistence: ${file}`
          });
        }
      }
    }

    if (!hasLeak) {
      this.checks.push({
        name: 'Persistence Isolation',
        status: 'PASS',
        message: 'No persistence leaks detected'
      });
    }
  }

  walkDir(dir, ext) {
    const results = [];
    if (!this.exists(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.walkDir(full, ext));
      } else if (entry.name.endsWith(ext)) {
        results.push(full);
      }
    }
    return results;
  }
}

export default RepositoryGuardian;
