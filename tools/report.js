#!/usr/bin/env node

/**
 * Report Tool - Repository Dashboard Generator
 *
 * Generates the final repository dashboard report.
 *
 * Run: node tools/report.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

class ReportTool {
  constructor() {
    this.data = {};
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

  async run() {
    console.log('[REPORT] Generating Repository Dashboard...\n');

    this.loadData();
    this.printDashboard();

    return this.data;
  }

  loadData() {
    // Load architecture fingerprint
    const fingerprint = this.readJson(path.join(ROOT, 'docs/architecture/PROJECT_HEALTH.json'));

    if (fingerprint) {
      this.data = fingerprint;
      return;
    }

    // Fallback to manual inspection
    this.data = {
      timestamp: new Date().toISOString(),
      architectureVersion: 'P13.8 Design Freeze + P14.x',
      currentPhase: 'P14.1',
      overall: 'UNKNOWN'
    };

    // Load from files
    const roadmap = this.readFile(path.join(ROOT, 'docs/roadmap/ROADMAP.md'));
    if (roadmap) {
      const match = roadmap.match(/Phases completed:.*P(\d+\.\d+)/);
      if (match) this.data.currentPhase = `P${match[1]}`;
    }

    const gitDir = path.join(ROOT, '.git');
    const headFile = path.join(gitDir, 'HEAD');
    let branch = 'UNKNOWN';
    const headContent = this.readFile(headFile);
    if (headContent) {
      const match = headContent.match(/ref:\s*refs\/heads\/(.+)/);
      if (match) branch = match[1].trim();
    }
    this.data.gitBranch = branch;

    // Check design freeze
    const designFreeze = this.readFile(path.join(ROOT, 'docs/architecture/DESIGN_FREEZE.md'));
    this.data.designFreezeActive = !!designFreeze && designFreeze.includes('DESIGN FREEZE APPROVED');

    // Check capabilities
    const capsDir = path.join(ROOT, 'capabilities');
    let capCount = 0;
    if (this.exists(capsDir)) {
      const entries = fs.readdirSync(capsDir, { withFileTypes: true });
      capCount = entries.filter(e => e.isDirectory()).length;
    }
    this.data.capabilities = capCount;

    // Check managers
    const managersDir = path.join(ROOT, 'capabilities/business/manager');
    let managerCount = 1;
    if (this.exists(managersDir)) {
      managerCount += fs.readdirSync(managersDir).filter(f => f.endsWith('.manager.js')).length;
    }
    this.data.managers = managerCount;

    // Determine overall
    if (branch === 'release/design-freeze-p13.8' && this.data.designFreezeActive && capCount >= 30) {
      this.data.overall = 'HEALTHY';
    } else {
      this.data.overall = 'WARNING';
    }
  }

  printDashboard() {
    const r = this.data;

    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║                    VALDI PLATFORM                       ║
║              SELF-EXPLAINING REPOSITORY                  ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Architecture ..................... ${r.designFreezeActive ? COLORS.green + 'ACTIVE' + COLORS.reset : COLORS.red + 'INACTIVE' + COLORS.reset}      ║
║  Git Branch ...................... ${r.gitBranch === 'release/design-freeze-p13.8' ? COLORS.green + r.gitBranch + COLORS.reset : COLORS.yellow + r.gitBranch + COLORS.reset}      ║
║  Capabilities .................... ${r.capabilities >= 30 ? COLORS.green + r.capabilities + COLORS.reset : COLORS.yellow + r.capabilities + COLORS.reset}            ║
║  Business Managers ............... ${r.managers >= 11 ? COLORS.green + r.managers + COLORS.reset : COLORS.yellow + r.managers + COLORS.reset}            ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Architecture Version                                         ║
║    ${r.architectureVersion || 'P13.8 Design Freeze + P14.x Runtime/API'}  ║
║                                                          ║
║  Current Phase                                              ║
║    ${r.currentPhase || 'P14.1'}  ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Overall Status                                             ║
║    ${r.overall === 'HEALTHY' ? COLORS.green + '✓ HEALTHY' + COLORS.reset : COLORS.yellow + '⚠ WARNING' + COLORS.reset}                                                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);
  }
}

const tool = new ReportTool();
tool.run().catch(console.error);
