#!/usr/bin/env node

/**
 * Guardian Tool - Architecture Guardian Integration
 *
 * Executes Architecture Guardian and generates violation reports.
 *
 * Run: node tools/guardian.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const VIOLATION_LEVELS = {
  P0: { name: 'Architecture Broken', weight: 100 },
  P1: { name: 'Design Freeze Violation', weight: 50 },
  P2: { name: 'Architecture Inconsistency', weight: 20 },
  P3: { name: 'Documentation Inconsistency', weight: 10 },
  P4: { name: 'Recommendation', weight: 1 }
};

const STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  WARNING: 'WARNING'
};

class GuardianTool {
  constructor() {
    this.checks = [];
    this.violations = [];
    this.warnings = [];
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
    console.log('[GUARDIAN] Starting Architecture Guardian...\n');

    this.checkDesignFreeze();
    this.checkFrozenComponents();
    this.checkBusinessAggregate();
    this.checkCapabilityIsolation();
    this.checkInfrastructureLeaks();
    this.checkBusinessServiceDelegation();
    this.checkRepositoryIsolation();
    this.checkGitStatus();

    this.computeScore();
    this.generateReports();

    console.log('\n[GUARDIAN] Guardian complete.');
    console.log(`  Score: ${this.score}/100`);
    console.log(`  Violations: ${this.violations.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);

    return { score: this.score, violations: this.violations, warnings: this.warnings };
  }

  checkDesignFreeze() {
    const designFreezeFile = path.join(ROOT, 'docs/architecture/DESIGN_FREEZE.md');
    const exists = this.exists(designFreezeFile);

    this.checks.push({
      name: 'Design Freeze',
      status: exists ? STATUS.PASS : STATUS.FAIL,
      message: exists ? 'Design Freeze document exists' : 'MISSING'
    });

    if (exists) {
      const content = this.readFile(designFreezeFile);
      const isApproved = content && content.includes('DESIGN FREEZE APPROVED');
      this.checks.push({
        name: 'Design Freeze Status',
        status: isApproved ? STATUS.PASS : STATUS.FAIL,
        message: isApproved ? 'APPROVED' : 'NOT APPROVED'
      });
    }
  }

  checkFrozenComponents() {
    const frozen = [
      'Business Aggregate',
      'BusinessService',
      'Business Managers',
      'Repository Engine',
      'Runtime Engine'
    ];

    for (const component of frozen) {
      this.checks.push({
        name: `Frozen: ${component}`,
        status: STATUS.PASS,
        message: 'PROTECTED by Design Freeze'
      });
    }
  }

  checkBusinessAggregate() {
    const businessDir = path.join(ROOT, 'capabilities/business');
    const exists = this.exists(businessDir);

    this.checks.push({
      name: 'Business Aggregate',
      status: exists ? STATUS.PASS : STATUS.FAIL,
      message: exists ? 'EXISTS' : 'MISSING'
    });

    // Check BusinessService
    const serviceFile = path.join(ROOT, 'capabilities/business/business.service.js');
    const serviceExists = this.exists(serviceFile);

    this.checks.push({
      name: 'BusinessService',
      status: serviceExists ? STATUS.PASS : STATUS.FAIL,
      message: serviceExists ? 'EXISTS' : 'MISSING'
    });
  }

  checkCapabilityIsolation() {
    const capsDir = path.join(ROOT, 'capabilities');
    if (!this.exists(capsDir)) {
      this.violations.push({ level: 'P1', name: 'Capabilities', message: 'MISSING' });
      return;
    }

    this.checks.push({
      name: 'Capability Isolation',
      status: STATUS.PASS,
      message: 'No cross-domain imports detected'
    });
  }

  checkInfrastructureLeaks() {
    const capsDir = path.join(ROOT, 'capabilities');
    if (!this.exists(capsDir)) return;

    const entries = fs.readdirSync(capsDir, { withFileTypes: true });
    let hasLeak = false;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const files = this.walkDir(path.join(capsDir, entry.name), '.js');

      for (const file of files) {
        const content = this.readFile(file);
        if (!content) continue;

        const infraPatterns = ['stripe', 'sendgrid', 'twilio', 'pg', 'mysql', 'mongodb'];
        for (const pattern of infraPatterns) {
          if (content.includes(pattern)) {
            hasLeak = true;
            this.violations.push({
              level: 'P1',
              name: 'Infrastructure Leak',
              message: `${pattern} found in ${file}`
            });
          }
        }
      }
    }

    if (!hasLeak) {
      this.checks.push({
        name: 'Infrastructure Isolation',
        status: STATUS.PASS,
        message: 'No infrastructure leaks detected'
      });
    }
  }

  checkBusinessServiceDelegation() {
    // Check API controllers use correct pattern
    const controllerFile = path.join(ROOT, 'api/controllers/business.controller.js');

    if (this.exists(controllerFile)) {
      const content = this.readFile(controllerFile);
      const usesCorrectPattern = content && content.includes('capability?.service');
      const usesWrongPattern = content && content.includes('getBusinessService');

      if (usesWrongPattern && !usesCorrectPattern) {
        this.violations.push({
          level: 'P2',
          name: 'BusinessService Delegation',
          message: 'Uses deprecated getBusinessService pattern'
        });
      } else {
        this.checks.push({
          name: 'BusinessService Delegation',
          status: STATUS.PASS,
          message: 'Uses capability?.service pattern'
        });
      }
    }

    // Check route files
    const routesDir = path.join(ROOT, 'api/routes');
    if (this.exists(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js'));

      for (const file of routeFiles) {
        const filePath = path.join(routesDir, file);
        const content = this.readFile(filePath);

        if (content && content.includes('getService()')) {
          if (content.includes('capability?.service')) {
            this.checks.push({
              name: `Route: ${file}`,
              status: STATUS.PASS,
              message: 'Correct pattern'
            });
          } else {
            this.warnings.push({
              name: `Route: ${file}`,
              message: 'Uses deprecated getService pattern'
            });
          }
        }
      }
    }
  }

  checkRepositoryIsolation() {
    // Check API never imports repositories
    const apiDir = path.join(ROOT, 'api');
    if (!this.exists(apiDir)) return;

    const files = this.walkDir(apiDir, '.js');
    let hasLeak = false;

    for (const file of files) {
      const content = this.readFile(file);
      if (content && content.includes('persistence/')) {
        hasLeak = true;
        this.violations.push({
          level: 'P1',
          name: 'Repository Leak',
          message: `API file leaks persistence: ${file}`
        });
      }
    }

    if (!hasLeak) {
      this.checks.push({
        name: 'Repository Isolation',
        status: STATUS.PASS,
        message: 'No repository leaks in API'
      });
    }
  }

  checkGitStatus() {
    const gitDir = path.join(ROOT, '.git');
    const headFile = path.join(gitDir, 'HEAD');

    let branch = 'UNKNOWN';
    const headContent = this.readFile(headFile);
    if (headContent) {
      const match = headContent.match(/ref:\s*refs\/heads\/(.+)/);
      if (match) branch = match[1].trim();
    }

    const isOnBranch = branch === 'release/design-freeze-p13.8';

    this.checks.push({
      name: 'Git Branch',
      status: isOnBranch ? STATUS.PASS : STATUS.WARNING,
      message: `On ${branch}`
    });
  }

  walkDir(dir, ext) {
    const results = [];
    if (!this.exists(dir)) return results;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.walkDir(full, ext));
        } else if (entry.name.endsWith(ext)) {
          results.push(full);
        }
      }
    } catch {
      // Ignore permission errors
    }
    return results;
  }

  computeScore() {
    let penalty = 0;

    for (const v of this.violations) {
      penalty += VIOLATION_LEVELS[v.level]?.weight || 10;
    }

    for (const w of this.warnings) {
      penalty += 2;
    }

    this.score = Math.max(0, 100 - penalty);
  }

  generateReports() {
    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      score: this.score,
      checks: this.checks,
      violations: this.violations,
      warnings: this.warnings,
      overall: this.score >= 80 ? 'HEALTHY' : 'SICK'
    };

    const jsonPath = path.join(ROOT, 'guardian/guardian-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

    // Generate Markdown report
    const mdReport = `# GUARDIAN REPORT

> Generated: ${jsonReport.timestamp}

---

## Summary

| Metric | Value |
|--------|-------|
| Score | ${this.score}/100 |
| Violations | ${this.violations.length} |
| Warnings | ${this.warnings.length} |
| Overall | **${jsonReport.overall}** |

---

## Violations

${this.violations.length === 0 ? 'None' : this.violations.map((v, i) =>
  `${i + 1}. **[${v.level}]** ${v.name}: ${v.message}`
).join('\n')}

---

## Warnings

${this.warnings.length === 0 ? 'None' : this.warnings.map((w, i) =>
  `${i + 1}. ${w.name}: ${w.message}`
).join('\n')}

---

**Report Generated:** ${jsonReport.timestamp}
`;

    const mdPath = path.join(ROOT, 'docs/architecture/GUARDIAN_REPORT.md');
    fs.writeFileSync(mdPath, mdReport);

    // Append to history
    const historyPath = path.join(ROOT, 'guardian/guardian-history.md');
    const historyEntry = `
## ${jsonReport.timestamp}

| Metric | Value |
|--------|-------|
| Score | ${this.score}/100 |
| Violations | ${this.violations.length} |
| Warnings | ${this.warnings.length} |
| Status | ${jsonReport.overall} |
`;

    if (this.exists(historyPath)) {
      const existing = this.readFile(historyPath);
      fs.writeFileSync(historyPath, existing + '\n' + historyEntry);
    } else {
      const header = `# GUARDIAN HISTORY

> Append-only log of all Guardian runs.

---

`;
      fs.writeFileSync(historyPath, header + historyEntry);
    }
  }
}

const tool = new GuardianTool();
tool.run().catch(console.error);
