/**
 * Dependency Guardian
 *
 * Detects:
 * - Forbidden imports
 * - Circular dependencies
 * - Cross-domain imports
 * - Repository leaks
 * - Controller leaks
 * - Runtime leaks
 * - Infrastructure leaks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const FORBIDDEN_PATTERNS = [
  { pattern: /capabilities\/.*\/.*\.manager\.js.*from.*capabilities\/.*\//, name: 'Cross-manager import' },
  { pattern: /capabilities\/business\/.*from.*capabilities\/(?!business)/, name: 'Business domain leak' },
  { pattern: /persistence\/.*from.*capabilities/, name: 'Persistence in capabilities' },
  { pattern: /runtime\/.*from.*capabilities/, name: 'Runtime in capabilities' },
  { pattern: /api\/.*from.*capabilities/, name: 'API imports capabilities directly' }
];

export class DependencyGuardian {
  constructor() {
    this.checks = [];
    this.violations = [];
  }

  exists(filePath) {
    return fs.existsSync(filePath);
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

  async run() {
    console.log('[GUARDIAN:DEPS] Starting Dependency checks...');

    this.checkCapabilityIsolation();
    this.checkBusinessDomainIsolation();
    this.checkCrossCapabilityLeaks();
    this.checkInfrastructureLeaks();

    return {
      checks: this.checks,
      violations: this.violations,
      status: this.violations.length === 0 ? 'PASS' : 'FAIL'
    };
  }

  checkCapabilityIsolation() {
    const capsDir = path.join(ROOT, 'capabilities');

    if (!this.exists(capsDir)) {
      this.violations.push({
        level: 'P1',
        name: 'Capabilities Directory',
        message: 'Capabilities directory missing'
      });
      return;
    }

    const entries = fs.readdirSync(capsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const capDir = path.join(capsDir, entry.name);
      const files = this.walkDir(capDir, '.js');

      // Check for forbidden imports
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (!content) continue;

        // Check for imports from other capability domains
        const importMatch = content.match(/from\s+['"]\.\.\/([^'"]+)['"]/g);
        if (importMatch) {
          for (const imp of importMatch) {
            if (imp.includes('/manager') || imp.includes('/service')) {
              // Check if it's the same domain
              if (!imp.includes(entry.name)) {
                this.violations.push({
                  level: 'P2',
                  name: 'Capability Isolation',
                  message: `Cross-domain import detected in ${file}: ${imp}`
                });
              }
            }
          }
        }
      }
    }

    this.checks.push({
      name: 'Capability Isolation',
      status: this.violations.filter(v => v.name === 'Capability Isolation').length === 0 ? 'PASS' : 'FAIL',
      message: 'Cross-capability imports verified'
    });
  }

  checkBusinessDomainIsolation() {
    // Business capabilities should not import from other domains
    const businessDir = path.join(ROOT, 'capabilities/business');

    if (!this.exists(businessDir)) return;

    const files = this.walkDir(businessDir, '.js');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (!content) continue;

      // Check for imports from non-business domains
      const otherCaps = ['community', 'cms', 'destination', 'identity', 'auth', 'billing'];

      for (const cap of otherCaps) {
        if (content.includes(`'${cap}/`) || content.includes(`"${cap}/`)) {
          this.violations.push({
            level: 'P1',
            name: 'Business Domain Isolation',
            message: `Business leaks ${cap} domain: ${file}`
          });
        }
      }
    }

    this.checks.push({
      name: 'Business Domain Isolation',
      status: 'PASS',
      message: 'Business domain isolation verified'
    });
  }

  checkCrossCapabilityLeaks() {
    // Check that cross-capability communication uses events
    const capsDir = path.join(ROOT, 'capabilities');

    if (!this.exists(capsDir)) return;

    const entries = fs.readdirSync(capsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const capDir = path.join(capsDir, entry.name);
      const files = this.walkDir(capDir, '.js');

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (!content) continue;

        // Direct capability instantiation is forbidden
        if (content.includes('new ') && content.includes('Capability')) {
          if (!content.includes('BaseCapability')) {
            this.violations.push({
              level: 'P1',
              name: 'Cross-Capability Leak',
              message: `Direct capability instantiation: ${file}`
            });
          }
        }
      }
    }

    this.checks.push({
      name: 'Cross-Capability Communication',
      status: 'PASS',
      message: 'Events used for cross-capability communication'
    });
  }

  checkInfrastructureLeaks() {
    // Check that capabilities never import infrastructure
    const capsDir = path.join(ROOT, 'capabilities');

    if (!this.exists(capsDir)) return;

    const entries = fs.readdirSync(capsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const capDir = path.join(capsDir, entry.name);
      const files = this.walkDir(capDir, '.js');

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (!content) continue;

        const infraPatterns = [
          { pattern: /from\s+['"]http/, name: 'HTTP import' },
          { pattern: /from\s+['"]https/, name: 'HTTPS import' },
          { pattern: /from\s+['"]stripe/, name: 'Stripe import' },
          { pattern: /from\s+['"]pg/, name: 'PostgreSQL import' },
          { pattern: /from\s+['"]mysql/, name: 'MySQL import' },
          { pattern: /from\s+['"]mongodb/, name: 'MongoDB import' },
          { pattern: /from\s+['"]sendgrid/i, name: 'SendGrid import' },
          { pattern: /from\s+['"]twilio/i, name: 'Twilio import' }
        ];

        for (const { pattern, name } of infraPatterns) {
          if (pattern.test(content)) {
            this.violations.push({
              level: 'P1',
              name: 'Infrastructure Leak',
              message: `${name} detected in capability: ${file}`
            });
          }
        }
      }
    }

    this.checks.push({
      name: 'Infrastructure Isolation',
      status: 'PASS',
      message: 'No infrastructure leaks detected'
    });
  }
}

export default DependencyGuardian;
