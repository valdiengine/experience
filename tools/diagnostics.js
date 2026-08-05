#!/usr/bin/env node

/**
 * Diagnostics Tool - Runtime, Documentation, Git diagnostics
 *
 * Run: node tools/diagnostics.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const STATUS = {
  PASS: '✓',
  FAIL: '✗',
  WARNING: '!'
};

class DiagnosticsTool {
  constructor() {
    this.results = {
      runtime: {},
      documentation: {},
      git: {},
      capabilities: {}
    };
  }

  exists(filePath) {
    return fs.existsSync(filePath);
  }

  readFile(filePath) {
    if (!this.exists(filePath)) return null;
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async run() {
    console.log('[DIAGNOSTICS] Starting Repository Diagnostics...\n');

    this.checkRuntime();
    this.checkDocumentation();
    this.checkGit();
    this.checkCapabilities();

    this.printSummary();

    return this.results;
  }

  checkRuntime() {
    console.log('--- Runtime Diagnostics ---');

    const checks = [
      { name: 'Runtime Bootstrap', path: 'runtime/bootstrap/runtime.bootstrap.js' },
      { name: 'Application Start', path: 'runtime/startup/application.start.js' },
      { name: 'Capability Bootstrap', path: 'runtime/startup/capability.bootstrap.js' },
      { name: 'Repository Bootstrap', path: 'runtime/startup/repository.bootstrap.js' },
      { name: 'Runtime Context', path: 'runtime/core/context/RuntimeContext.js' },
      { name: 'API Bootstrap', path: 'api/bootstrap/api.bootstrap.js' }
    ];

    let passCount = 0;
    for (const check of checks) {
      const fullPath = path.join(ROOT, check.path);
      const exists = this.exists(fullPath);
      console.log(`  ${exists ? STATUS.PASS : STATUS.FAIL} ${check.name}`);
      if (exists) passCount++;
    }

    this.results.runtime = {
      total: checks.length,
      passed: passCount,
      status: passCount === checks.length ? 'PASS' : 'FAIL'
    };
  }

  checkDocumentation() {
    console.log('\n--- Documentation Diagnostics ---');

    const docs = [
      { name: 'AI_BOOTSTRAP', path: 'docs/architecture/AI_BOOTSTRAP.md' },
      { name: '00_READ_FIRST', path: 'docs/architecture/00_READ_FIRST.md' },
      { name: 'PROJECT_CONTEXT', path: 'docs/architecture/PROJECT_CONTEXT.md' },
      { name: 'PROJECT_HEALTH', path: 'docs/architecture/PROJECT_HEALTH.md' },
      { name: 'ARCHITECTURE_FINGERPRINT', path: 'docs/architecture/ARCHITECTURE_FINGERPRINT.md' },
      { name: 'AI_RULES', path: 'docs/architecture/AI_RULES.md' },
      { name: 'AI_HANDSHAKE', path: 'docs/architecture/AI_HANDSHAKE.md' },
      { name: 'AI_SESSION_REPORT', path: 'docs/architecture/AI_SESSION_REPORT.md' },
      { name: 'AI_DECISIONS', path: 'docs/architecture/AI_DECISIONS.md' },
      { name: 'CURRENT_STATE', path: 'docs/ai/CURRENT_STATE.md' },
      { name: 'NEXT_PHASE', path: 'docs/ai/NEXT_PHASE.md' },
      { name: 'MASTER_CONTEXT', path: 'docs/ai/MASTER_CONTEXT.md' },
      { name: 'ROADMAP', path: 'docs/roadmap/ROADMAP.md' },
      { name: 'CHANGELOG', path: 'docs/roadmap/CHANGELOG.md' },
      { name: 'DESIGN_FREEZE', path: 'docs/architecture/DESIGN_FREEZE.md' },
      { name: 'ARCHITECTURE_IMMUTABLE', path: 'docs/architecture/ARCHITECTURE_IMMUTABLE.md' },
      { name: 'MASTER_ARCHITECTURE', path: 'docs/architecture/MASTER_ARCHITECTURE.md' }
    ];

    let passCount = 0;
    for (const doc of docs) {
      const fullPath = path.join(ROOT, doc.path);
      const exists = this.exists(fullPath);
      console.log(`  ${exists ? STATUS.PASS : STATUS.FAIL} ${doc.name}`);
      if (exists) passCount++;
    }

    this.results.documentation = {
      total: docs.length,
      passed: passCount,
      missing: docs.filter(d => !this.exists(path.join(ROOT, d.path))).map(d => d.name)
    };
  }

  checkGit() {
    console.log('\n--- Git Diagnostics ---');

    const gitDir = path.join(ROOT, '.git');
    const headFile = path.join(gitDir, 'HEAD');

    let branch = 'UNKNOWN';
    const headContent = this.readFile(headFile);
    if (headContent) {
      const match = headContent.match(/ref:\s*refs\/heads\/(.+)/);
      if (match) branch = match[1].trim();
    }

    console.log(`  Branch: ${branch}`);

    // Check tag
    const tagFile = path.join(gitDir, 'refs/tags/design-freeze-p13.8');
    const hasTag = this.exists(tagFile);
    console.log(`  ${hasTag ? STATUS.PASS : STATUS.FAIL} Tag: design-freeze-p13.8`);

    // Check working tree
    const indexFile = path.join(gitDir, 'index');
    let workingTree = 'UNKNOWN';
    if (this.exists(indexFile)) {
      try {
        const stat = fs.statSync(indexFile);
        const now = new Date();
        const diff = now - stat.mtime;
        workingTree = diff < 60000 ? 'CLEAN' : 'MODIFIED';
      } catch {
        workingTree = 'UNKNOWN';
      }
    }
    console.log(`  Working Tree: ${workingTree}`);

    this.results.git = {
      branch,
      tag: hasTag ? 'design-freeze-p13.8' : 'NONE',
      workingTree,
      status: branch === 'release/design-freeze-p13.8' ? 'PASS' : 'WARNING'
    };
  }

  checkCapabilities() {
    console.log('\n--- Capabilities Diagnostics ---');

    const capsDir = path.join(ROOT, 'capabilities');
    let capCount = 0;
    const capabilities = [];

    if (this.exists(capsDir)) {
      const entries = fs.readdirSync(capsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          capCount++;
          capabilities.push(entry.name);
        }
      }
    }

    console.log(`  Total Capabilities: ${capCount}`);

    // Check business managers
    const managersDir = path.join(ROOT, 'capabilities/business/manager');
    let managerCount = 1; // business.manager.js

    if (this.exists(managersDir)) {
      const files = fs.readdirSync(managersDir).filter(f => f.endsWith('.manager.js'));
      managerCount += files.length;
    }

    console.log(`  Business Managers: ${managerCount}`);

    this.results.capabilities = {
      total: capCount,
      managers: managerCount,
      status: capCount >= 30 && managerCount >= 11 ? 'PASS' : 'WARNING'
    };
  }

  printSummary() {
    console.log('\n========================================');
    console.log('           DIAGNOSTICS SUMMARY            ');
    console.log('========================================');

    console.log(`\nRuntime:      ${this.results.runtime.status}`);
    console.log(`Git:         ${this.results.git.status}`);
    console.log(`Capabilities: ${this.results.capabilities.status}`);

    if (this.results.documentation.missing.length > 0) {
      console.log(`\nDocumentation: FAIL (${this.results.documentation.missing.length} missing)`);
      console.log('  Missing: ' + this.results.documentation.missing.join(', '));
    } else {
      console.log(`\nDocumentation: PASS`);
    }

    console.log('\n========================================');
  }
}

const tool = new DiagnosticsTool();
tool.run().catch(console.error);
