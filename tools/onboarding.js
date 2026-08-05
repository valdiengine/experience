#!/usr/bin/env node

/**
 * Repository Onboarding - Self-Explaining Repository Entry Point
 *
 * Run: node tools/onboarding.js
 *
 * This is the ONLY official repository entry point.
 * Every AI must execute this before doing anything else.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ANSI colors for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m'
};

const STATUS = {
  PASS: { symbol: '✓', color: 'green', label: 'PASS' },
  FAIL: { symbol: '✗', color: 'red', label: 'FAIL' },
  WARNING: { symbol: '!', color: 'yellow', label: 'WARN' },
  UNKNOWN: { symbol: '?', color: 'yellow', label: 'UNK' },
  HEALTHY: { symbol: '✓', color: 'green', label: 'HEALTHY' },
  SICK: { symbol: '✗', color: 'red', label: 'SICK' }
};

class OnboardingTool {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      architecture: null,
      health: null,
      diagnostics: null,
      git: null,
      overall: null
    };
    this.checks = [];
  }

  log(msg, color = 'white') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  header(msg) {
    console.log(`\n${COLORS.bright}${COLORS.cyan}${msg}${COLORS.reset}`);
  }

  section(msg) {
    console.log(`\n${COLORS.bright}--- ${msg} ---${COLORS.reset}`);
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
    this.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           VALDI PLATFORM - SELF-EXPLAINING REPOSITORY      ║
║                                                           ║
║                    ONBOARDING SYSTEM                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`, 'cyan');

    this.log(`Timestamp: ${this.results.timestamp}\n`, 'dim');

    try {
      // Step 1: Check Repository Structure
      await this.checkRepository();

      // Step 2: Check Git Status
      await this.checkGit();

      // Step 3: Check Design Freeze
      await this.checkDesignFreeze();

      // Step 4: Check Documentation
      await this.checkDocumentation();

      // Step 5: Check Architecture
      await this.checkArchitecture();

      // Step 6: Check Runtime
      await this.checkRuntime();

      // Step 7: Check API
      await this.checkAPI();

      // Step 8: Check Capabilities
      await this.checkCapabilities();

      // Step 9: Check Business Managers
      await this.checkBusinessManagers();

      // Step 10: Generate Dashboard
      this.printDashboard();

      // Step 11: Save Health Report
      await this.saveHealthReport();

      this.log('\n╔═══════════════════════════════════════════════════════════╗', 'green');
      this.log('║              ONBOARDING COMPLETE                            ║', 'green');
      this.log('╚═══════════════════════════════════════════════════════════╝', 'green');

      this.printNextSteps();

    } catch (error) {
      this.log(`\n[ERROR] Onboarding failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  async checkRepository() {
    this.header('STEP 1: Repository Structure');

    const checks = [
      { name: 'Repository Root', path: ROOT },
      { name: 'capabilities/', path: path.join(ROOT, 'capabilities') },
      { name: 'runtime/', path: path.join(ROOT, 'runtime') },
      { name: 'api/', path: path.join(ROOT, 'api') },
      { name: 'capabilities/persistence/', path: path.join(ROOT, 'capabilities/persistence') },
      { name: 'docs/', path: path.join(ROOT, 'docs') },
      { name: 'tools/', path: path.join(ROOT, 'tools') },
      { name: 'guardian/', path: path.join(ROOT, 'guardian') }
    ];

    let passCount = 0;
    for (const check of checks) {
      const exists = this.exists(check.path);
      const status = exists ? STATUS.PASS : STATUS.FAIL;
      this.log(`  ${status.symbol} ${check.name}: ${exists ? 'OK' : 'MISSING'}`, status.color);
      if (exists) passCount++;
    }

    this.checks.push({ category: 'Repository', status: passCount === checks.length ? 'PASS' : 'FAIL' });
  }

  async checkGit() {
    this.section('STEP 2: Git Status');

    const gitDir = path.join(ROOT, '.git');
    const headFile = path.join(gitDir, 'HEAD');

    let branch = 'UNKNOWN';
    let tag = 'UNKNOWN';
    let commit = 'UNKNOWN';

    // Get current branch
    const headContent = this.readFile(headFile);
    if (headContent) {
      const match = headContent.match(/ref:\s*refs\/heads\/(.+)/);
      if (match) branch = match[1].trim();
    }

    // Check for design-freeze tag
    const designFreezeTag = 'design-freeze-p13.8';
    const tagFile = path.join(gitDir, 'refs', 'tags', designFreezeTag);
    if (this.exists(tagFile)) {
      tag = designFreezeTag;
    }

    // Get last commit
    const commitFile = path.join(gitDir, 'COMMIT_EDIT_MSG');
    const commitContent = this.readFile(commitFile);
    if (commitContent) {
      commit = commitContent.substring(0, 7).trim();
    }

    this.results.git = { branch, tag, commit };

    this.log(`  Branch: ${branch}`, branch === 'release/design-freeze-p13.8' ? 'green' : 'yellow');
    this.log(`  Tag: ${tag}`, tag !== 'UNKNOWN' ? 'green' : 'yellow');
    this.log(`  Commit: ${commit}`, commit !== 'UNKNOWN' ? 'green' : 'yellow');

    const isOnBranch = branch === 'release/design-freeze-p13.8';
    this.checks.push({ category: 'Git', status: isOnBranch ? 'PASS' : 'WARNING' });
  }

  async checkDesignFreeze() {
    this.section('STEP 3: Design Freeze');

    const designFreezeFile = path.join(ROOT, 'docs/architecture/DESIGN_FREEZE.md');
    const exists = this.exists(designFreezeFile);

    let isApproved = false;
    if (exists) {
      const content = this.readFile(designFreezeFile);
      isApproved = content && content.includes('DESIGN FREEZE APPROVED');
    }

    const status = exists && isApproved ? STATUS.PASS : STATUS.FAIL;
    this.log(`  Design Freeze: ${exists ? (isApproved ? 'APPROVED' : 'NOT APPROVED') : 'MISSING'}`, status.color);

    // Check frozen components
    const immutableFile = path.join(ROOT, 'docs/architecture/ARCHITECTURE_IMMUTABLE.md');
    const immutableExists = this.exists(immutableFile);

    this.log(`  Immutable Rules: ${immutableExists ? 'EXISTS' : 'MISSING'}`, immutableExists ? 'green' : 'red');

    this.results.designFreeze = {
      exists,
      approved: isApproved,
      branch: 'release/design-freeze-p13.8',
      tag: 'design-freeze-p13.8'
    };

    this.checks.push({ category: 'Design Freeze', status: exists && isApproved ? 'PASS' : 'FAIL' });
  }

  async checkDocumentation() {
    this.section('STEP 4: Documentation');

    const docs = [
      { name: 'AI_BOOTSTRAP.md', path: 'docs/architecture/AI_BOOTSTRAP.md' },
      { name: '00_READ_FIRST.md', path: 'docs/architecture/00_READ_FIRST.md' },
      { name: 'PROJECT_CONTEXT.md', path: 'docs/architecture/PROJECT_CONTEXT.md' },
      { name: 'PROJECT_HEALTH.md', path: 'docs/architecture/PROJECT_HEALTH.md' },
      { name: 'ARCHITECTURE_FINGERPRINT.md', path: 'docs/architecture/ARCHITECTURE_FINGERPRINT.md' },
      { name: 'AI_RULES.md', path: 'docs/architecture/AI_RULES.md' },
      { name: 'AI_HANDSHAKE.md', path: 'docs/architecture/AI_HANDSHAKE.md' },
      { name: 'AI_SESSION_REPORT.md', path: 'docs/architecture/AI_SESSION_REPORT.md' },
      { name: 'AI_DECISIONS.md', path: 'docs/architecture/AI_DECISIONS.md' },
      { name: 'CURRENT_STATE.md', path: 'docs/ai/CURRENT_STATE.md' },
      { name: 'NEXT_PHASE.md', path: 'docs/ai/NEXT_PHASE.md' },
      { name: 'MASTER_CONTEXT.md', path: 'docs/ai/MASTER_CONTEXT.md' },
      { name: 'ROADMAP.md', path: 'docs/roadmap/ROADMAP.md' },
      { name: 'CHANGELOG.md', path: 'docs/roadmap/CHANGELOG.md' },
      { name: 'DESIGN_FREEZE.md', path: 'docs/architecture/DESIGN_FREEZE.md' },
      { name: 'ARCHITECTURE_IMMUTABLE.md', path: 'docs/architecture/ARCHITECTURE_IMMUTABLE.md' },
      { name: 'MASTER_ARCHITECTURE.md', path: 'docs/architecture/MASTER_ARCHITECTURE.md' }
    ];

    let passCount = 0;
    for (const doc of docs) {
      const fullPath = path.join(ROOT, doc.path);
      const exists = this.exists(fullPath);
      const status = exists ? STATUS.PASS : STATUS.FAIL;
      this.log(`  ${status.symbol} ${doc.name}`, status.color);
      if (exists) passCount++;
    }

    this.log(`\n  Documentation: ${passCount}/${docs.length} files exist`);

    this.results.documentation = { total: docs.length, existing: passCount };
    this.checks.push({ category: 'Documentation', status: passCount === docs.length ? 'PASS' : 'WARNING' });
  }

  async checkArchitecture() {
    this.section('STEP 5: Architecture');

    const checks = [
      { name: 'Business Aggregate', path: 'capabilities/business' },
      { name: 'BusinessCapability', path: 'capabilities/business/business.capability.js' },
      { name: 'BusinessService', path: 'capabilities/business/business.service.js' },
      { name: 'BusinessManager', path: 'capabilities/business/business.manager.js' }
    ];

    let passCount = 0;
    for (const check of checks) {
      const fullPath = path.join(ROOT, check.path);
      const exists = this.exists(fullPath);
      const status = exists ? STATUS.PASS : STATUS.FAIL;
      this.log(`  ${status.symbol} ${check.name}`, status.color);
      if (exists) passCount++;
    }

    this.checks.push({ category: 'Architecture', status: passCount === checks.length ? 'PASS' : 'FAIL' });
  }

  async checkRuntime() {
    this.section('STEP 6: Runtime');

    const checks = [
      { name: 'Runtime Bootstrap', path: 'runtime/startup/runtime.bootstrap.js' },
      { name: 'Application Start', path: 'runtime/startup/application.start.js' },
      { name: 'Capability Bootstrap', path: 'runtime/startup/capability.bootstrap.js' },
      { name: 'Repository Bootstrap', path: 'runtime/startup/repository.bootstrap.js' }
    ];

    let passCount = 0;
    for (const check of checks) {
      const fullPath = path.join(ROOT, check.path);
      const exists = this.exists(fullPath);
      const status = exists ? STATUS.PASS : STATUS.FAIL;
      this.log(`  ${status.symbol} ${check.name}`, status.color);
      if (exists) passCount++;
    }

    this.checks.push({ category: 'Runtime', status: passCount === checks.length ? 'PASS' : 'FAIL' });
  }

  async checkAPI() {
    this.section('STEP 7: API Layer');

    const checks = [
      { name: 'API Bootstrap', path: 'api/bootstrap/api.bootstrap.js' },
      { name: 'Business Controller', path: 'api/controllers/business.controller.js' },
      { name: 'API Router', path: 'api/routes/api.router.js' }
    ];

    let passCount = 0;
    for (const check of checks) {
      const fullPath = path.join(ROOT, check.path);
      const exists = this.exists(fullPath);
      const status = exists ? STATUS.PASS : STATUS.FAIL;
      this.log(`  ${status.symbol} ${check.name}`, status.color);
      if (exists) passCount++;
    }

    // Count routes
    const routesDir = path.join(ROOT, 'api/routes');
    let routeCount = 0;
    if (this.exists(routesDir)) {
      routeCount = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js')).length;
    }
    this.log(`  Routes: ${routeCount} found`);

    this.checks.push({ category: 'API', status: passCount === checks.length ? 'PASS' : 'FAIL' });
  }

  async checkCapabilities() {
    this.section('STEP 8: Capabilities');

    const capsDir = path.join(ROOT, 'capabilities');
    let capCount = 0;
    if (this.exists(capsDir)) {
      const entries = fs.readdirSync(capsDir, { withFileTypes: true });
      capCount = entries.filter(e => e.isDirectory()).length;
    }

    this.log(`  Total Capabilities: ${capCount}`);
    this.results.capabilities = { count: capCount };

    this.checks.push({ category: 'Capabilities', status: capCount >= 30 ? 'PASS' : 'WARNING' });
  }

  async checkBusinessManagers() {
    this.section('STEP 9: Business Managers');

    const managersDir = path.join(ROOT, 'capabilities/business/manager');
    let managerCount = 1; // business.manager.js
    const managers = [];

    if (this.exists(managersDir)) {
      const files = fs.readdirSync(managersDir).filter(f => f.endsWith('.manager.js'));
      managerCount += files.length;
      managers.push(...files.map(f => f.replace('.manager.js', '')));
    }

    this.log(`  Total Managers: ${managerCount}`);
    this.log(`  Sub-Managers: ${managerCount - 1}`);

    const requiredManagers = [
      'business-accommodation',
      'business-availability',
      'business-reservation',
      'business-visitor',
      'business-payment',
      'business-notification'
    ];

    for (const mgr of requiredManagers) {
      const found = managers.some(m => m.includes(mgr));
      const status = found ? STATUS.PASS : STATUS.FAIL;
      this.log(`  ${status.symbol} ${mgr}`, status.color);
    }

    this.checks.push({ category: 'Business Managers', status: managerCount >= 11 ? 'PASS' : 'WARNING' });
  }

  printDashboard() {
    this.section('STEP 10: Repository Dashboard');

    // Calculate overall status
    const failCount = this.checks.filter(c => c.status === 'FAIL').length;
    const warningCount = this.checks.filter(c => c.status === 'WARNING').length;
    const overall = failCount === 0 ? (warningCount === 0 ? 'HEALTHY' : 'WARNING') : 'FAIL';

    // Architecture Version
    const fingerprintFile = path.join(ROOT, 'docs/architecture/ARCHITECTURE_FINGERPRINT.md');
    let archVersion = 'P13.8 Design Freeze + P14.x Runtime/API';
    if (this.exists(fingerprintFile)) {
      const content = this.readFile(fingerprintFile);
      const match = content && content.match(/Architecture Version.*?(P\d+\.\d+.*?)(?:\n|$)/);
      if (match) archVersion = match[1].trim();
    }

    // Current Phase
    const roadmapFile = path.join(ROOT, 'docs/roadmap/ROADMAP.md');
    let currentPhase = 'P14.1';
    if (this.exists(roadmapFile)) {
      const content = this.readFile(roadmapFile);
      const match = content && content.match(/Phases completed:.*P(\d+\.\d+)/);
      if (match) currentPhase = `P${match[1]}`;
    }

    // Next Phase
    let nextPhase = 'P14.2';
    const phaseMatch = currentPhase.match(/P(\d+)\.(\d+)/);
    if (phaseMatch) {
      nextPhase = `P${phaseMatch[1]}.${parseInt(phaseMatch[2]) + 1}`;
    }

    const printLine = (label, status, color = 'white') => {
      const dots = '.'.repeat(50 - label.length);
      this.log(`  ${label} ${dots} ${status}`, color);
    };

    const getStatusLabel = (check) => {
      if (check.status === 'PASS') return { label: 'PASS', color: 'green' };
      if (check.status === 'FAIL') return { label: 'FAIL', color: 'red' };
      return { label: 'WARN', color: 'yellow' };
    };

    console.log('');
    console.log('='.repeat(56));
    this.log('                   VALDI PLATFORM', 'bright');
    this.log('              SELF-EXPLAINING REPOSITORY', 'bright');
    console.log('='.repeat(56));
    console.log('');

    for (const check of this.checks) {
      const { label, color } = getStatusLabel(check);
      printLine(check.category, label, color);
    }

    console.log('');
    console.log('-'.repeat(56));

    // Architecture Version
    this.log(`  Architecture Version`, 'dim');
    this.log(`    ${archVersion}`, 'cyan');

    console.log('');

    // Current Phase
    this.log(`  Current Phase`, 'dim');
    this.log(`    ${currentPhase}`, 'cyan');

    console.log('');

    // Next Phase
    this.log(`  Next Phase`, 'dim');
    this.log(`    ${nextPhase}`, 'cyan');

    console.log('');
    console.log('-'.repeat(56));

    // Overall Status
    const overallColor = overall === 'HEALTHY' ? 'green' : (overall === 'WARNING' ? 'yellow' : 'red');
    const overallSymbol = overall === 'HEALTHY' ? '✓' : (overall === 'WARNING' ? '!' : '✗');

    console.log('');
    this.log(`  Overall`, 'dim');
    this.log(`    ${overallSymbol} ${overall}`, overallColor);
    console.log('');

    if (overall === 'HEALTHY') {
      this.log('    Repository Ready for Development', 'green');
    } else if (overall === 'WARNING') {
      this.log('    Repository Ready - Review Warnings', 'yellow');
    } else {
      this.log('    Repository NOT Ready - Fix Failures', 'red');
    }

    console.log('');
    console.log('='.repeat(56));

    this.results.overall = overall;
    this.results.architectureVersion = archVersion;
    this.results.currentPhase = currentPhase;
    this.results.nextPhase = nextPhase;
  }

  async saveHealthReport() {
    this.section('STEP 11: Saving Health Report');

    const healthReport = {
      timestamp: this.results.timestamp,
      version: this.results.architectureVersion,
      phase: this.results.currentPhase,
      nextPhase: this.results.nextPhase,
      git: this.results.git,
      designFreeze: this.results.designFreeze,
      documentation: this.results.documentation,
      capabilities: this.results.capabilities,
      checks: this.checks,
      overall: this.results.overall
    };

    const healthPath = path.join(ROOT, 'docs/architecture/PROJECT_HEALTH.json');
    fs.writeFileSync(healthPath, JSON.stringify(healthReport, null, 2));
    this.log(`  Health report saved: PROJECT_HEALTH.json`, 'green');
  }

  printNextSteps() {
    console.log('');
    this.header('NEXT STEPS');

    if (this.results.overall === 'HEALTHY' || this.results.overall === 'WARNING') {
      this.log('  1. Read docs/architecture/PROJECT_HEALTH.md', 'cyan');
      this.log('  2. Read docs/architecture/PROJECT_CONTEXT.md', 'cyan');
      this.log('  3. Review docs/architecture/AI_BOOTSTRAP.md', 'cyan');
      this.log('  4. Begin implementation', 'green');
    } else {
      this.log('  1. Fix the failures above', 'red');
      this.log('  2. Re-run: node tools/onboarding.js', 'yellow');
      this.log('  3. Once HEALTHY, proceed with next steps', 'yellow');
    }

    console.log('');
  }
}

// Run the onboarding tool
const tool = new OnboardingTool();
tool.run().catch(console.error);
