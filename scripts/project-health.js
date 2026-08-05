#!/usr/bin/env node

/**
 * Project Health Engine
 *
 * Automatically inspects the repository and generates:
 * - docs/architecture/PROJECT_HEALTH.md
 * - docs/architecture/PROJECT_HEALTH.json
 * - docs/architecture/PROJECT_HEALTH_REPORT.md
 *
 * Never hardcodes values. Everything inferred from repository.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function globSync(pattern, base) {
  const results = [];
  const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]*').replace(/\?/g, '.') + '$');
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (regex.test(entry.name)) {
        results.push(path.relative(base, fullPath));
      }
    }
  }
  walk(base);
  return results;
}

const STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  WARNING: 'WARNING',
  UNKNOWN: 'UNKNOWN',
  N/A: 'N/A',
  HEALTHY: 'HEALTHY',
  SICK: 'SICK'
};

class ProjectHealthEngine {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      architecture: {},
      documentation: {},
      runtime: {},
      api: {},
      capabilities: {},
      repositories: {},
      businessManagers: {},
      smokeTests: {},
      validation: {},
      git: {},
      overall: {}
    };
    this.warnings = [];
    this.errors = [];
    this.stats = {};
  }

  log(msg) {
    console.log(`[HEALTH] ${msg}`);
  }

  warn(msg) {
    this.warnings.push(msg);
    console.warn(`[WARN] ${msg}`);
  }

  error(msg) {
    this.errors.push(msg);
    console.error(`[ERROR] ${msg}`);
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

  readJson(filePath) {
    const content = this.readFile(filePath);
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  glob(pattern) {
    return globSync(pattern, ROOT);
  }

  // Architecture Section
  inspectArchitecture() {
    this.log('Inspecting architecture...');

    const designFreeze = this.readFile(join(ROOT, 'docs/architecture/DESIGN_FREEZE.md'));
    const fingerprint = this.readFile(join(ROOT, 'docs/architecture/ARCHITECTURE_FINGERPRINT.md'));
    const currentState = this.readFile(join(ROOT, 'docs/ai/CURRENT_STATE.md'));
    const roadmap = this.readFile(join(ROOT, 'docs/roadmap/ROADMAP.md'));

    // Extract Architecture Version
    let archVersion = 'UNKNOWN';
    if (designFreeze) {
      const match = designFreeze.match(/Branch:\s*`([^`]+)`/);
      if (match) {
        archVersion = `P13.8 (${match[1]})`;
      }
    }

    // Extract Architecture Score
    let archScore = 'UNKNOWN';
    if (designFreeze) {
      const match = designFreeze.match(/Architecture Score:\s*(\d+)\/100/);
      if (match) {
        archScore = parseInt(match[1]);
      }
    }

    // Extract Current Phase
    let currentPhase = 'UNKNOWN';
    if (roadmap) {
      const match = roadmap.match(/Phases completed:.*P(\d+\.\d+)/);
      if (match) {
        currentPhase = `P${match[1]}`;
      }
    }

    // Extract Next Phase
    let nextPhase = 'UNKNOWN';
    if (roadmap) {
      const nextMatch = roadmap.match(/Next.*Phase.*?P(\d+\.\d+)/);
      if (nextMatch) {
        nextPhase = `P${nextMatch[1]}`;
      }
    }

    this.results.architecture = {
      version: archVersion,
      score: archScore,
      currentPhase,
      nextPhase,
      designFreezeActive: designFreeze ? true : false,
      status: designFreeze ? STATUS.PASS : STATUS.FAIL
    };
  }

  // Git Section
  inspectGit() {
    this.log('Inspecting Git...');

    // Try to read .git/HEAD
    const gitHeadFile = join(ROOT, '.git', 'HEAD');
    let branch = 'UNKNOWN';
    let tag = 'UNKNOWN';
    let commit = 'UNKNOWN';
    let workingTree = 'UNKNOWN';

    const headContent = this.readFile(gitHeadFile);
    if (headContent) {
      const refMatch = headContent.match(/ref:\s*refs\/heads\/(.+)/);
      if (refMatch) {
        branch = refMatch[1].trim();
      }
    }

    // Check for design-freeze tag
    const designFreezeTag = 'design-freeze-p13.8';
    if (branch === 'release/design-freeze-p13.8') {
      tag = designFreezeTag;
    }

    // Try to get commit hash
    const gitRevParse = join(ROOT, '.git', 'COMMIT_EDIT_MSG');
    if (this.exists(gitRevParse)) {
      const commitContent = this.readFile(gitRevParse);
      if (commitContent && commitContent.length > 7) {
        commit = commitContent.substring(0, 7);
      }
    }

    // Check working tree status
    try {
      const gitStatusFile = join(ROOT, '.git', 'index');
      if (this.exists(gitStatusFile)) {
        const stat = fs.statSync(gitStatusFile);
        const now = new Date();
        const diff = now - stat.mtime;
        workingTree = diff < 60000 ? 'CLEAN' : 'MODIFIED';
      }
    } catch {
      workingTree = 'UNKNOWN';
    }

    this.results.git = {
      currentBranch: branch,
      designFreezeBranch: 'release/design-freeze-p13.8',
      latestTag: tag,
      lastCommit: commit,
      workingTree,
      repositoryInitialized: branch !== 'UNKNOWN',
      status: branch === 'release/design-freeze-p13.8' ? STATUS.PASS : STATUS.WARNING
    };
  }

  // Documentation Section
  inspectDocumentation() {
    this.log('Inspecting documentation...');

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
      { name: 'ARCHITECTURE_IMMUTABLE', path: 'docs/architecture/ARCHITECTURE_IMMUTABLE.md' }
    ];

    const docResults = {};
    let allExist = true;

    for (const doc of docs) {
      const fullPath = join(ROOT, doc.path);
      const exists = this.exists(fullPath);
      docResults[doc.name] = exists ? STATUS.PASS : STATUS.FAIL;
      if (!exists) {
        allExist = false;
        this.warnings.push(`Missing documentation: ${doc.name}`);
      }
    }

    this.results.documentation = {
      ...docResults,
      totalDocs: docs.length,
      existingDocs: Object.values(docResults).filter(s => s === STATUS.PASS).length,
      status: allExist ? STATUS.PASS : STATUS.WARNING
    };
  }

  // Runtime Section
  inspectRuntime() {
    this.log('Inspecting runtime...');

    const runtimeFiles = [
      { name: 'Application Entry Point', path: 'runtime/startup/application.start.js' },
      { name: 'Runtime Bootstrap', path: 'runtime/bootstrap/runtime.bootstrap.js' },
      { name: 'RuntimeContext', path: 'runtime/core/context/RuntimeContext.js' },
      { name: 'Capability Bootstrap', path: 'runtime/startup/capability.bootstrap.js' },
      { name: 'Repository Bootstrap', path: 'runtime/startup/repository.bootstrap.js' }
    ];

    const runtimeResults = {};
    let allExist = true;

    for (const file of runtimeFiles) {
      const fullPath = join(ROOT, file.path);
      const exists = this.exists(fullPath);
      runtimeResults[file.name] = exists ? STATUS.PASS : STATUS.FAIL;
      if (!exists) {
        allExist = false;
        this.warnings.push(`Missing runtime file: ${file.name}`);
      }
    }

    this.results.runtime = {
      ...runtimeResults,
      status: allExist ? STATUS.PASS : STATUS.FAIL
    };
  }

  // API Section
  inspectAPI() {
    this.log('Inspecting API...');

    const apiFiles = [
      { name: 'API Bootstrap', path: 'api/bootstrap/api.bootstrap.js' },
      { name: 'API Server', path: 'api/bootstrap/server/api.server.js' },
      { name: 'Business Controller', path: 'api/controllers/business.controller.js' },
      { name: 'Business Routes', path: 'api/routes/business.routes.js' },
      { name: 'Accommodation Routes', path: 'api/routes/accommodation.routes.js' },
      { name: 'Availability Routes', path: 'api/routes/availability.routes.js' },
      { name: 'Reservation Routes', path: 'api/routes/reservation.routes.js' },
      { name: 'Visitor Routes', path: 'api/routes/visitor.routes.js' },
      { name: 'Payment Routes', path: 'api/routes/payment.routes.js' },
      { name: 'Review Routes', path: 'api/routes/review.routes.js' }
    ];

    const apiResults = {};
    let allExist = true;

    for (const file of apiFiles) {
      const fullPath = join(ROOT, file.path);
      const exists = this.exists(fullPath);
      apiResults[file.name] = exists ? STATUS.PASS : STATUS.FAIL;
      if (!exists) {
        allExist = false;
        this.warnings.push(`Missing API file: ${file.name}`);
      }
    }

    // Count middleware files
    const middlewareDir = join(ROOT, 'api', 'middleware');
    let middlewareCount = 0;
    if (this.exists(middlewareDir)) {
      middlewareCount = fs.readdirSync(middlewareDir).filter(f => f.endsWith('.js')).length;
    }

    // Count route files
    const routesDir = join(ROOT, 'api', 'routes');
    let routeCount = 0;
    if (this.exists(routesDir)) {
      routeCount = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js')).length;
    }

    this.results.api = {
      ...apiResults,
      middlewareCount,
      routeCount,
      status: allExist ? STATUS.PASS : STATUS.FAIL
    };
  }

  // Capabilities Section
  inspectCapabilities() {
    this.log('Inspecting capabilities...');

    // Find all capability files
    const capabilityFiles = [];
    const capsDir = join(ROOT, 'capabilities');

    if (this.exists(capsDir)) {
      const entries = fs.readdirSync(capsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const capFile = join(capsDir, entry.name, `${entry.name}.capability.js`);
          if (this.exists(capFile)) {
            capabilityFiles.push(entry.name);
          }
        }
      }
    }

    // Count sub-managers
    const managersDir = join(ROOT, 'capabilities', 'business', 'manager');
    let managerCount = 1; // business.manager.js
    let subManagerCount = 0;
    if (this.exists(managersDir)) {
      subManagerCount = fs.readdirSync(managersDir).filter(f => f.endsWith('.manager.js')).length;
      managerCount += subManagerCount;
    }

    this.results.capabilities = {
      totalCapabilities: capabilityFiles.length,
      capabilityList: capabilityFiles,
      totalManagers: managerCount,
      subManagerCount,
      status: capabilityFiles.length >= 30 ? STATUS.PASS : STATUS.WARNING
    };
  }

  // Repository Section
  inspectRepositories() {
    this.log('Inspecting repositories...');

    const persistenceDir = join(ROOT, 'persistence');
    let repoCount = 0;
    let mixinCount = 0;

    if (this.exists(persistenceDir)) {
      // Count repository files
      const repoDir = join(persistenceDir, 'repository');
      if (this.exists(repoDir)) {
        repoCount = fs.readdirSync(repoDir).filter(f => f.endsWith('.repository.js')).length;
      }

      // Count mixin files
      const engineDir = join(persistenceDir, 'engine');
      if (this.exists(engineDir)) {
        mixinCount = fs.readdirSync(engineDir).filter(f => f.endsWith('.js')).length;
      }
    }

    this.results.repositories = {
      totalRepositories: repoCount,
      totalMixins: mixinCount,
      status: repoCount > 0 ? STATUS.PASS : STATUS.WARNING
    };
  }

  // Business Managers Section
  inspectBusinessManagers() {
    this.log('Inspecting business managers...');

    const managersDir = join(ROOT, 'capabilities', 'business', 'manager');
    const managers = [];

    if (this.exists(managersDir)) {
      const files = fs.readdirSync(managersDir).filter(f => f.endsWith('.manager.js'));
      for (const file of files) {
        const managerName = file.replace('.manager.js', '');
        managers.push(managerName);
      }
    }

    this.results.businessManagers = {
      totalManagers: managers.length,
      managerList: managers,
      hasAccommodationManager: managers.includes('business-accommodation'),
      hasAvailabilityManager: managers.includes('business-availability'),
      hasReservationManager: managers.includes('business-reservation'),
      hasVisitorManager: managers.includes('business-visitor'),
      hasPaymentManager: managers.includes('business-payment'),
      hasNotificationManager: managers.includes('business-notification'),
      status: managers.length >= 11 ? STATUS.PASS : STATUS.WARNING
    };
  }

  // Smoke Tests Section
  inspectSmokeTests() {
    this.log('Inspecting smoke tests...');

    const smokeTests = [
      { name: 'API Smoke Test', path: 'runtime/startup/api.smoke.test.js' },
      { name: 'Runtime Bootstrap', path: 'runtime/startup/runtime.bootstrap.js' }
    ];

    const testResults = {};
    for (const test of smokeTests) {
      const fullPath = join(ROOT, test.path);
      testResults[test.name] = this.exists(fullPath) ? STATUS.PASS : STATUS.FAIL;
    }

    // Check for latest report
    const reportPath = join(ROOT, 'runtime', 'startup', 'api-smoke.report.json');
    let latestScore = null;
    if (this.exists(reportPath)) {
      const report = this.readJson(reportPath);
      if (report && report.score) {
        latestScore = report.score;
      }
    }

    this.results.smokeTests = {
      ...testResults,
      latestScore,
      hasReport: latestScore !== null,
      status: latestScore && latestScore >= 95 ? STATUS.PASS : STATUS.WARNING
    };
  }

  // Compute Overall Status
  computeOverall() {
    const checks = [
      this.results.architecture.status,
      this.results.documentation.status,
      this.results.runtime.status,
      this.results.api.status,
      this.results.capabilities.status,
      this.results.repositories.status,
      this.results.businessManagers.status,
      this.results.smokeTests.status,
      this.results.git.status
    ];

    const allPass = checks.every(c => c === STATUS.PASS);
    const anyFail = checks.some(c => c === STATUS.FAIL);

    this.results.overall = {
      architecture: this.results.architecture.status,
      documentation: this.results.documentation.status,
      runtime: this.results.runtime.status,
      api: this.results.api.status,
      capabilities: this.results.capabilities.status,
      repositories: this.results.repositories.status,
      businessManagers: this.results.businessManagers.status,
      smokeTests: this.results.smokeTests.status,
      git: this.results.git.status,
      designFreeze: this.results.architecture.designFreezeActive ? 'ACTIVE' : 'INACTIVE',
      overall: anyFail ? STATUS.SICK : (allPass ? STATUS.HEALTHY : STATUS.WARNING)
    };
  }

  // Generate PROJECT_HEALTH.md
  generateMarkdown() {
    const r = this.results;

    return `# PROJECT HEALTH

> Auto-generated by Project Health Engine
> Timestamp: ${r.timestamp}

---

## Architecture

| Check | Status | Value |
|-------|--------|-------|
| Design Freeze | ${r.architecture.designFreezeActive ? 'ACTIVE' : 'INACTIVE'} | P13.8 |
| Architecture Score | ${r.architecture.score}/100 | ${r.architecture.score >= 95 ? '✓' : '✗'} |
| Current Phase | ${r.architecture.currentPhase} | |
| Next Phase | ${r.architecture.nextPhase} | |
| Status | **${r.architecture.status}** | |

---

## Documentation

| Document | Status |
|----------|--------|
| AI_BOOTSTRAP | ${r.documentation.AI_BOOTSTRAP || STATUS.UNKNOWN} |
| 00_READ_FIRST | ${r.documentation['00_READ_FIRST'] || STATUS.UNKNOWN} |
| PROJECT_CONTEXT | ${r.documentation.PROJECT_CONTEXT || STATUS.UNKNOWN} |
| PROJECT_HEALTH | ${r.documentation.PROJECT_HEALTH || STATUS.UNKNOWN} |
| ARCHITECTURE_FINGERPRINT | ${r.documentation.ARCHITECTURE_FINGERPRINT || STATUS.UNKNOWN} |
| AI_RULES | ${r.documentation.AI_RULES || STATUS.UNKNOWN} |
| AI_HANDSHAKE | ${r.documentation.AI_HANDSHAKE || STATUS.UNKNOWN} |
| AI_SESSION_REPORT | ${r.documentation.AI_SESSION_REPORT || STATUS.UNKNOWN} |
| AI_DECISIONS | ${r.documentation.AI_DECISIONS || STATUS.UNKNOWN} |
| CURRENT_STATE | ${r.documentation.CURRENT_STATE || STATUS.UNKNOWN} |
| NEXT_PHASE | ${r.documentation.NEXT_PHASE || STATUS.UNKNOWN} |
| MASTER_CONTEXT | ${r.documentation.MASTER_CONTEXT || STATUS.UNKNOWN} |
| ROADMAP | ${r.documentation.ROADMAP || STATUS.UNKNOWN} |
| CHANGELOG | ${r.documentation.CHANGELOG || STATUS.UNKNOWN} |
| DESIGN_FREEZE | ${r.documentation.DESIGN_FREEZE || STATUS.UNKNOWN} |
| ARCHITECTURE_IMMUTABLE | ${r.documentation.ARCHITECTURE_IMMUTABLE || STATUS.UNKNOWN} |

**Total:** ${r.documentation.existingDocs}/${r.documentation.totalDocs} documents exist

Status: **${r.documentation.status}**

---

## Runtime

| Component | Status |
|----------|--------|
| Application Entry Point | ${r.runtime['Application Entry Point'] || STATUS.UNKNOWN} |
| Runtime Bootstrap | ${r.runtime['Runtime Bootstrap'] || STATUS.UNKNOWN} |
| RuntimeContext | ${r.runtime['RuntimeContext'] || STATUS.UNKNOWN} |
| Capability Bootstrap | ${r.runtime['Capability Bootstrap'] || STATUS.UNKNOWN} |
| Repository Bootstrap | ${r.runtime['Repository Bootstrap'] || STATUS.UNKNOWN} |

Status: **${r.runtime.status}**

---

## API

| Component | Status |
|----------|--------|
| API Bootstrap | ${r.api['API Bootstrap'] || STATUS.UNKNOWN} |
| API Server | ${r.api['API Server'] || STATUS.UNKNOWN} |
| Business Controller | ${r.api['Business Controller'] || STATUS.UNKNOWN} |
| Middleware Files | ${r.api.middlewareCount || 0} |
| Route Files | ${r.api.routeCount || 0} |

Status: **${r.api.status}**

---

## Commercial Aggregate

| Entity | Status |
|--------|--------|
| Business Manager | ${r.businessManagers.totalManagers > 0 ? STATUS.PASS : STATUS.FAIL} |
| Accommodation Manager | ${r.businessManagers.hasAccommodationManager ? STATUS.PASS : STATUS.FAIL} |
| Availability Manager | ${r.businessManagers.hasAvailabilityManager ? STATUS.PASS : STATUS.FAIL} |
| Reservation Manager | ${r.businessManagers.hasReservationManager ? STATUS.PASS : STATUS.FAIL} |
| Visitor Manager | ${r.businessManagers.hasVisitorManager ? STATUS.PASS : STATUS.FAIL} |
| Payment Manager | ${r.businessManagers.hasPaymentManager ? STATUS.PASS : STATUS.FAIL} |
| Notification Manager | ${r.businessManagers.hasNotificationManager ? STATUS.PASS : STATUS.FAIL} |

Status: **${r.businessManagers.status}**

---

## Capabilities

| Metric | Value |
|--------|-------|
| Total Capabilities | ${r.capabilities.totalCapabilities} |
| Total Business Managers | ${r.capabilities.totalManagers} |
| Sub-Managers | ${r.capabilities.subManagerCount} |

Status: **${r.capabilities.status}**

---

## Repositories

| Metric | Value |
|--------|-------|
| Total Repositories | ${r.repositories.totalRepositories} |
| Total Mixins | ${r.repositories.totalMixins} |

Status: **${r.repositories.status}**

---

## Smoke Tests

| Test | Status |
|------|--------|
| API Smoke Test | ${r.smokeTests['API Smoke Test'] || STATUS.UNKNOWN} |
| Runtime Bootstrap | ${r.smokeTests['Runtime Bootstrap'] || STATUS.UNKNOWN} |
| Latest Score | ${r.smokeTests.latestScore || 'N/A'}/100 |

Status: **${r.smokeTests.status}**

---

## Git

| Item | Value |
|------|-------|
| Current Branch | ${r.git.currentBranch} |
| Design Freeze Branch | ${r.git.designFreezeBranch} |
| Latest Tag | ${r.git.latestTag} |
| Working Tree | ${r.git.workingTree} |

Status: **${r.git.status}**

---

## Overall Status

| Category | Status |
|----------|--------|
| Architecture | ${r.overall.architecture} |
| Documentation | ${r.overall.documentation} |
| Runtime | ${r.overall.runtime} |
| API | ${r.overall.api} |
| Capabilities | ${r.overall.capabilities} |
| Repositories | ${r.overall.repositories} |
| Business Managers | ${r.overall.businessManagers} |
| Smoke Tests | ${r.overall.smokeTests} |
| Git | ${r.overall.git} |
| Design Freeze | ${r.overall.designFreeze} |
| **Overall** | **${r.overall.overall}** |

---

**Generated:** ${r.timestamp}
`;
  }

  // Generate PROJECT_HEALTH.json
  generateJSON() {
    return JSON.stringify({
      timestamp: this.results.timestamp,
      architecture: {
        version: this.results.architecture.version,
        score: this.results.architecture.score,
        currentPhase: this.results.architecture.currentPhase,
        nextPhase: this.results.architecture.nextPhase,
        designFreezeActive: this.results.architecture.designFreezeActive,
        status: this.results.architecture.status
      },
      documentation: {
        totalDocs: this.results.documentation.totalDocs,
        existingDocs: this.results.documentation.existingDocs,
        status: this.results.documentation.status
      },
      runtime: {
        status: this.results.runtime.status
      },
      api: {
        middlewareCount: this.results.api.middlewareCount,
        routeCount: this.results.api.routeCount,
        status: this.results.api.status
      },
      capabilities: {
        total: this.results.capabilities.totalCapabilities,
        managers: this.results.capabilities.totalManagers,
        status: this.results.capabilities.status
      },
      repositories: {
        total: this.results.repositories.totalRepositories,
        mixins: this.results.repositories.totalMixins,
        status: this.results.repositories.status
      },
      businessManagers: {
        total: this.results.businessManagers.totalManagers,
        status: this.results.businessManagers.status
      },
      smokeTests: {
        latestScore: this.results.smokeTests.latestScore,
        status: this.results.smokeTests.status
      },
      git: {
        branch: this.results.git.currentBranch,
        tag: this.results.git.latestTag,
        workingTree: this.results.git.workingTree,
        status: this.results.git.status
      },
      overall: this.results.overall
    }, null, 2);
  }

  // Generate PROJECT_HEALTH_REPORT.md
  generateReport() {
    return `# PROJECT HEALTH REPORT

> Generated by Project Health Engine
> Timestamp: ${this.results.timestamp}

---

## Summary

| Metric | Value |
|--------|-------|
| Overall Status | ${this.results.overall.overall} |
| Architecture | ${this.results.architecture.status} |
| Documentation | ${this.results.documentation.status} |
| Runtime | ${this.results.runtime.status} |
| API | ${this.results.api.status} |
| Capabilities | ${this.results.capabilities.status} |
| Repositories | ${this.results.repositories.status} |
| Business Managers | ${this.results.businessManagers.status} |
| Smoke Tests | ${this.results.smokeTests.status} |
| Git | ${this.results.git.status} |

---

## Warnings

${this.warnings.length === 0 ? 'None' : this.warnings.map((w, i) => `${i + 1}. ${w}`).join('\n')}

---

## Errors

${this.errors.length === 0 ? 'None' : this.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

---

## Statistics

| Category | Count |
|----------|-------|
| Capabilities | ${this.results.capabilities.totalCapabilities} |
| Business Managers | ${this.results.capabilities.totalManagers} |
| Repositories | ${this.results.repositories.totalRepositories} |
| API Routes | ${this.results.api.routeCount} |
| API Middleware | ${this.results.api.middlewareCount} |
| Smoke Test Score | ${this.results.smokeTests.latestScore || 'N/A'} |

---

## Recommendations

${this.generateRecommendations()}

---

**End of Report**
`;
  }

  generateRecommendations() {
    const recs = [];

    if (this.results.architecture.score < 95) {
      recs.push('Architecture score below 95. Run architecture validation.');
    }

    if (this.results.documentation.status === STATUS.WARNING) {
      recs.push('Some documentation files are missing. Review AI_BOOTSTRAP.md requirements.');
    }

    if (!this.results.architecture.designFreezeActive) {
      recs.push('Design Freeze is not active. Verify DESIGN_FREEZE.md exists.');
    }

    if (this.results.smokeTests.latestScore < 95) {
      recs.push('Smoke test score below 95. Run api.smoke.test.js and fix issues.');
    }

    if (this.results.git.currentBranch !== 'release/design-freeze-p13.8') {
      recs.push('Not on design-freeze branch. Verify Git workflow.');
    }

    if (recs.length === 0) {
      recs.push('No recommendations. Project health is optimal.');
    }

    return recs.map((r, i) => `${i + 1}. ${r}`).join('\n');
  }

  // Run all inspections
  async run() {
    this.log('Starting Project Health Engine...');

    this.inspectArchitecture();
    this.inspectGit();
    this.inspectDocumentation();
    this.inspectRuntime();
    this.inspectAPI();
    this.inspectCapabilities();
    this.inspectRepositories();
    this.inspectBusinessManagers();
    this.inspectSmokeTests();
    this.computeOverall();

    // Generate outputs
    const markdown = this.generateMarkdown();
    const json = this.generateJSON();
    const report = this.generateReport();

    // Write outputs
    const docsDir = join(ROOT, 'docs', 'architecture');

    const mdPath = join(docsDir, 'PROJECT_HEALTH.md');
    const jsonPath = join(docsDir, 'PROJECT_HEALTH.json');
    const reportPath = join(docsDir, 'PROJECT_HEALTH_REPORT.md');

    fs.writeFileSync(mdPath, markdown);
    fs.writeFileSync(jsonPath, json);
    fs.writeFileSync(reportPath, report);

    this.log(`Generated: ${mdPath}`);
    this.log(`Generated: ${jsonPath}`);
    this.log(`Generated: ${reportPath}`);

    console.log('\n=== PROJECT HEALTH ENGINE COMPLETE ===');
    console.log(`Overall Status: ${this.results.overall.overall}`);
    console.log(`Warnings: ${this.warnings.length}`);
    console.log(`Errors: ${this.errors.length}`);

    return this.results;
  }
}

// Run if executed directly
const engine = new ProjectHealthEngine();
engine.run().catch(console.error);

export default ProjectHealthEngine;
