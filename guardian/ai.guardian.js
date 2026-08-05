/**
 * AI Guardian
 *
 * Verifies:
 * - AI_BOOTSTRAP
 * - PROJECT_CONTEXT
 * - AI_RULES
 * - AI_HANDSHAKE
 * - PROJECT_HEALTH
 * - Architecture Fingerprint
 * - Session Report
 * - Consistency
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const AI_OS_DOCS = [
  { name: 'AI_BOOTSTRAP', path: 'docs/architecture/AI_BOOTSTRAP.md' },
  { name: '00_READ_FIRST', path: 'docs/architecture/00_READ_FIRST.md' },
  { name: 'PROJECT_CONTEXT', path: 'docs/architecture/PROJECT_CONTEXT.md' },
  { name: 'PROJECT_HEALTH', path: 'docs/architecture/PROJECT_HEALTH.md' },
  { name: 'ARCHITECTURE_FINGERPRINT', path: 'docs/architecture/ARCHITECTURE_FINGERPRINT.md' },
  { name: 'AI_RULES', path: 'docs/architecture/AI_RULES.md' },
  { name: 'AI_HANDSHAKE', path: 'docs/architecture/AI_HANDSHAKE.md' },
  { name: 'AI_SESSION_REPORT', path: 'docs/architecture/AI_SESSION_REPORT.md' },
  { name: 'AI_DECISIONS', path: 'docs/architecture/AI_DECISIONS.md' },
  { name: 'AI_DOCUMENTATION_AUDIT', path: 'docs/architecture/AI_DOCUMENTATION_AUDIT.md' },
  { name: 'AI_OPERATING_SYSTEM', path: 'docs/architecture/AI_OPERATING_SYSTEM.md' },
  { name: 'AI_DOCUMENTATION_FLOW', path: 'docs/architecture/AI_DOCUMENTATION_FLOW.md' }
];

export class AIGuardian {
  constructor() {
    this.checks = [];
    this.violations = [];
  }

  exists(filePath) {
    return fs.existsSync(filePath);
  }

  async run() {
    console.log('[GUARDIAN:AI] Starting AI Operating System checks...');

    this.checkAIOSDocuments();
    this.checkConsistency();

    return {
      checks: this.checks,
      violations: this.violations,
      status: this.violations.length === 0 ? 'PASS' : 'FAIL'
    };
  }

  checkAIOSDocuments() {
    let passCount = 0;
    let failCount = 0;

    for (const doc of AI_OS_DOCS) {
      const fullPath = path.join(ROOT, doc.path);
      const exists = this.exists(fullPath);

      this.checks.push({
        name: `AI OS: ${doc.name}`,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? `${doc.name} exists` : `${doc.name} missing`
      });

      if (exists) {
        passCount++;
      } else {
        failCount++;
      }
    }

    this.checks.push({
      name: 'AI OS Coverage',
      status: failCount === 0 ? 'PASS' : 'FAIL',
      message: `${passCount}/${AI_OS_DOCS.length} AI OS documents exist`,
      count: passCount,
      total: AI_OS_DOCS.length
    });
  }

  checkConsistency() {
    // Check that architecture version is consistent
    const fingerprintFile = path.join(ROOT, 'docs/architecture/ARCHITECTURE_FINGERPRINT.md');
    const bootstrapFile = path.join(ROOT, 'docs/architecture/AI_BOOTSTRAP.md');

    let fingerprintVersion = null;
    let bootstrapVersion = null;

    if (this.exists(fingerprintFile)) {
      const content = fs.readFileSync(fingerprintFile, 'utf-8');
      const match = content.match(/Architecture Version.*?(P\d+\.\d+.*?)(?:\n|$)/);
      if (match) {
        fingerprintVersion = match[1].trim();
      }
    }

    if (this.exists(bootstrapFile)) {
      const content = fs.readFileSync(bootstrapFile, 'utf-8');
      const match = content.match(/Architecture Version.*?(P\d+\.\d+.*?)(?:\n|$)/);
      if (match) {
        bootstrapVersion = match[1].trim();
      }
    }

    if (fingerprintVersion && bootstrapVersion) {
      const consistent = fingerprintVersion === bootstrapVersion;

      this.checks.push({
        name: 'Version Consistency',
        status: consistent ? 'PASS' : 'FAIL',
        message: consistent
          ? `Versions consistent: ${fingerprintVersion}`
          : `Version mismatch: fingerprint=${fingerprintVersion}, bootstrap=${bootstrapVersion}`
      });

      if (!consistent) {
        this.violations.push({
          level: 'P2',
          name: 'Version Consistency',
          message: `Architecture version mismatch between documents`
        });
      }
    } else {
      this.checks.push({
        name: 'Version Consistency',
        status: 'WARNING',
        message: 'Could not extract version from documents'
      });
    }
  }
}

export default AIGuardian;
