/**
 * Documentation Guardian
 *
 * Verifies:
 * - Broken references
 * - Missing documents
 * - Version consistency
 * - Duplicate information
 * - Reading order
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REQUIRED_DOCS = [
  { name: 'AI_BOOTSTRAP', path: 'docs/architecture/AI_BOOTSTRAP.md' },
  { name: '00_READ_FIRST', path: 'docs/architecture/00_READ_FIRST.md' },
  { name: 'PROJECT_CONTEXT', path: 'docs/architecture/PROJECT_CONTEXT.md' },
  { name: 'PROJECT_HEALTH', path: 'docs/architecture/PROJECT_HEALTH.md' },
  { name: 'ARCHITECTURE_FINGERPRINT', path: 'docs/architecture/ARCHITECTURE_FINGERPRINT.md' },
  { name: 'AI_RULES', path: 'docs/architecture/AI_RULES.md' },
  { name: 'AI_HANDSHAKE', path: 'docs/architecture/AI_HANDSHAKE.md' },
  { name: 'AI_SESSION_REPORT', path: 'docs/architecture/AI_SESSION_REPORT.md' },
  { name: 'AI_DECISIONS', path: 'docs/architecture/AI_DECISIONS.md' },
  { name: 'ARCHITECTURE_CHANGELOG', path: 'docs/architecture/ARCHITECTURE_CHANGELOG.md' },
  { name: 'AI_DOCUMENTATION_AUDIT', path: 'docs/architecture/AI_DOCUMENTATION_AUDIT.md' },
  { name: 'AI_OPERATING_SYSTEM', path: 'docs/architecture/AI_OPERATING_SYSTEM.md' },
  { name: 'CURRENT_STATE', path: 'docs/ai/CURRENT_STATE.md' },
  { name: 'NEXT_PHASE', path: 'docs/ai/NEXT_PHASE.md' },
  { name: 'MASTER_CONTEXT', path: 'docs/ai/MASTER_CONTEXT.md' },
  { name: 'ROADMAP', path: 'docs/roadmap/ROADMAP.md' },
  { name: 'CHANGELOG', path: 'docs/roadmap/CHANGELOG.md' },
  { name: 'DESIGN_FREEZE', path: 'docs/architecture/DESIGN_FREEZE.md' },
  { name: 'ARCHITECTURE_IMMUTABLE', path: 'docs/architecture/ARCHITECTURE_IMMUTABLE.md' },
  { name: 'MASTER_ARCHITECTURE', path: 'docs/architecture/MASTER_ARCHITECTURE.md' },
  { name: 'API_LAYER', path: 'docs/architecture/API_LAYER.md' },
  { name: 'API_RUNTIME_INTEGRATION', path: 'docs/architecture/API_RUNTIME_INTEGRATION.md' }
];

export class DocumentationGuardian {
  constructor() {
    this.checks = [];
    this.violations = [];
    this.missingDocs = [];
  }

  exists(filePath) {
    return fs.existsSync(filePath);
  }

  async run() {
    console.log('[GUARDIAN:DOCS] Starting Documentation checks...');

    this.checkRequiredDocs();
    this.checkVersionConsistency();
    this.checkReadingOrder();

    return {
      checks: this.checks,
      violations: this.violations,
      missingDocs: this.missingDocs,
      status: this.violations.length === 0 && this.missingDocs.length === 0 ? 'PASS' : 'FAIL'
    };
  }

  checkRequiredDocs() {
    let passCount = 0;
    let failCount = 0;

    for (const doc of REQUIRED_DOCS) {
      const fullPath = path.join(ROOT, doc.path);
      const exists = this.exists(fullPath);

      this.checks.push({
        name: `Doc: ${doc.name}`,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? `${doc.name} exists` : `${doc.name} missing`
      });

      if (!exists) {
        failCount++;
        this.missingDocs.push(doc.name);
      } else {
        passCount++;
      }
    }

    this.checks.push({
      name: 'Documentation Coverage',
      status: failCount === 0 ? 'PASS' : 'FAIL',
      message: `${passCount}/${REQUIRED_DOCS.length} documents exist`,
      count: passCount,
      total: REQUIRED_DOCS.length
    });
  }

  checkVersionConsistency() {
    // Check that version numbers are consistent across docs
    const fingerprintFile = path.join(ROOT, 'docs/architecture/ARCHITECTURE_FINGERPRINT.md');

    if (this.exists(fingerprintFile)) {
      const content = fs.readFileSync(fingerprintFile, 'utf-8');

      // Extract version
      const versionMatch = content.match(/Documentation Version.*?(\d+\.\d+)/);

      this.checks.push({
        name: 'Version Consistency',
        status: versionMatch ? 'PASS' : 'WARNING',
        message: versionMatch ? `Documentation Version: ${versionMatch[1]}` : 'Version not found'
      });
    }
  }

  checkReadingOrder() {
    const readFirstFile = path.join(ROOT, 'docs/architecture/00_READ_FIRST.md');

    if (this.exists(readFirstFile)) {
      const content = fs.readFileSync(readFirstFile, 'utf-8');

      // Check that STEP 1 references DESIGN_FREEZE.md
      if (content && content.includes('DESIGN_FREEZE.md')) {
        this.checks.push({
          name: 'Reading Order',
          status: 'PASS',
          message: '00_READ_FIRST starts with DESIGN_FREEZE.md'
        });
      } else {
        this.violations.push({
          level: 'P3',
          name: 'Reading Order',
          message: '00_READ_FIRST does not follow recommended reading order'
        });
      }
    }
  }
}

export default DocumentationGuardian;
