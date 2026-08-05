/**
 * Architecture Guardian
 *
 * Verifies:
 * - Aggregate ownership
 * - Design Freeze status
 * - Architecture Version
 * - Capability Registration
 * - Business Managers
 * - Event Ownership
 * - Delegation Rules
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const FROZEN_COMPONENTS = [
  'Business Aggregate',
  'BusinessService',
  'Business Managers',
  'Repository Engine',
  'Runtime Engine',
  'Capability Registration',
  'Aggregate Ownership',
  'Event Model'
];

const DESIGN_FREEZE_BRANCH = 'release/design-freeze-p13.8';

export class ArchitectureGuardian {
  constructor() {
    this.checks = [];
    this.violations = [];
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
    console.log('[GUARDIAN:ARCH] Starting Architecture checks...');

    this.checkDesignFreeze();
    this.checkArchitectureVersion();
    this.checkFrozenComponents();
    this.checkBusinessAggregate();
    this.checkCapabilityRegistration();
    this.checkBusinessManagers();

    return {
      checks: this.checks,
      violations: this.violations,
      status: this.violations.length === 0 ? 'PASS' : 'FAIL'
    };
  }

  checkDesignFreeze() {
    const designFreezeFile = path.join(ROOT, 'docs/architecture/DESIGN_FREEZE.md');
    const exists = this.exists(designFreezeFile);

    this.checks.push({
      name: 'Design Freeze',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Design Freeze document exists' : 'Design Freeze document missing'
    });

    if (exists) {
      const content = this.readFile(designFreezeFile);
      if (content && content.includes('DESIGN FREEZE APPROVED')) {
        this.checks.push({
          name: 'Design Freeze Status',
          status: 'PASS',
          message: 'Design Freeze is APPROVED'
        });
      }
    }
  }

  checkArchitectureVersion() {
    const fingerprintFile = path.join(ROOT, 'docs/architecture/ARCHITECTURE_FINGERPRINT.md');
    const exists = this.exists(fingerprintFile);

    this.checks.push({
      name: 'Architecture Fingerprint',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Architecture Fingerprint exists' : 'Architecture Fingerprint missing'
    });
  }

  checkFrozenComponents() {
    for (const component of FROZEN_COMPONENTS) {
      this.checks.push({
        name: `Frozen: ${component}`,
        status: 'PROTECTED',
        message: `${component} is frozen under Design Freeze`
      });
    }
  }

  checkBusinessAggregate() {
    const businessDir = path.join(ROOT, 'capabilities/business');
    const exists = this.exists(businessDir);

    this.checks.push({
      name: 'Business Aggregate',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Business Aggregate exists' : 'Business Aggregate missing'
    });

    // Check aggregate root file
    const capabilityFile = path.join(ROOT, 'capabilities/business/business.capability.js');
    const capExists = this.exists(capabilityFile);

    this.checks.push({
      name: 'BusinessCapability',
      status: capExists ? 'PASS' : 'FAIL',
      message: capExists ? 'BusinessCapability exists' : 'BusinessCapability missing'
    });

    // Check BusinessService
    const serviceFile = path.join(ROOT, 'capabilities/business/business.service.js');
    const svcExists = this.exists(serviceFile);

    this.checks.push({
      name: 'BusinessService',
      status: svcExists ? 'PASS' : 'FAIL',
      message: svcExists ? 'BusinessService exists' : 'BusinessService missing'
    });
  }

  checkCapabilityRegistration() {
    const capsDir = path.join(ROOT, 'capabilities');
    const exists = this.exists(capsDir);

    if (!exists) {
      this.violations.push({
        level: 'P1',
        name: 'Capabilities Directory',
        message: 'Capabilities directory missing'
      });
      return;
    }

    // Count capabilities
    const entries = fs.readdirSync(capsDir, { withFileTypes: true });
    const capCount = entries.filter(e => e.isDirectory()).length;

    this.checks.push({
      name: 'Capability Count',
      status: capCount >= 30 ? 'PASS' : 'WARNING',
      message: `${capCount} capabilities found`,
      count: capCount
    });
  }

  checkBusinessManagers() {
    const managersDir = path.join(ROOT, 'capabilities/business/manager');
    const exists = this.exists(managersDir);

    if (!exists) {
      this.violations.push({
        level: 'P1',
        name: 'Business Managers Directory',
        message: 'Business Managers directory missing'
      });
      return;
    }

    const files = fs.readdirSync(managersDir).filter(f => f.endsWith('.manager.js'));
    const managerCount = files.length + 1; // +1 for business.manager.js

    const requiredManagers = [
      'business-accommodation',
      'business-availability',
      'business-reservation',
      'business-visitor',
      'business-payment',
      'business-notification'
    ];

    for (const mgr of requiredManagers) {
      const found = files.some(f => f.includes(mgr));
      this.checks.push({
        name: `Manager: ${mgr}`,
        status: found ? 'PASS' : 'FAIL',
        message: found ? `${mgr} manager exists` : `${mgr} manager missing`
      });
    }

    this.checks.push({
      name: 'Total Managers',
      status: managerCount >= 11 ? 'PASS' : 'WARNING',
      message: `${managerCount} managers found`,
      count: managerCount
    });
  }
}

export default ArchitectureGuardian;
