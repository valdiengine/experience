/**
 * Architecture Guardian
 *
 * Main entry point for the Architecture Protection System.
 * Inspects repository and detects architectural violations.
 *
 * NEVER modifies code. Only analyzes, reports, and warns.
 */

import { ArchitectureGuardian } from './architecture.guardian.js';
import { RuntimeGuardian } from './runtime.guardian.js';
import { APIGuardian } from './api.guardian.js';
import { RepositoryGuardian } from './repository.guardian.js';
import { DocumentationGuardian } from './documentation.guardian.js';
import { DependencyGuardian } from './dependency.guardian.js';
import { GitGuardian } from './git.guardian.js';
import { AIGuardian } from './ai.guardian.js';
import { DatabaseGuardian } from './database.guardian.js';
import { StorageGuardian } from './storage.guardian.js';
import { MediaGuardian } from './media.guardian.js';
import { ReportGenerator } from './report.generator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

export class GuardianOrchestrator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      architecture: null,
      runtime: null,
      api: null,
      repository: null,
      documentation: null,
      dependency: null,
      git: null,
      ai: null,
      database: null,
      storage: null,
      media: null,
      violations: [],
      warnings: [],
      score: 0,
      maxScore: 100
    };

    this.guardians = {
      architecture: new ArchitectureGuardian(),
      runtime: new RuntimeGuardian(),
      api: new APIGuardian(),
      repository: new RepositoryGuardian(),
      documentation: new DocumentationGuardian(),
      dependency: new DependencyGuardian(),
      git: new GitGuardian(),
      ai: new AIGuardian(),
      database: new DatabaseGuardian(),
      storage: new StorageGuardian(),
      media: new MediaGuardian()
    };
  }

  addViolation(level, category, message, file = null, line = null) {
    this.results.violations.push({
      level,
      category,
      message,
      file,
      line,
      timestamp: new Date().toISOString()
    });
  }

  addWarning(message, category) {
    this.results.warnings.push({
      message,
      category,
      timestamp: new Date().toISOString()
    });
  }

  async run() {
    console.log('[GUARDIAN] Starting Architecture Guardian...');
    console.log('[GUARDIAN] Timestamp:', this.results.timestamp);

    // Run all guardians
    console.log('\n[GUARDIAN] Running Architecture Guardian...');
    this.results.architecture = await this.guardians.architecture.run();

    console.log('[GUARDIAN] Running Runtime Guardian...');
    this.results.runtime = await this.guardians.runtime.run();

    console.log('[GUARDIAN] Running API Guardian...');
    this.results.api = await this.guardians.api.run();

    console.log('[GUARDIAN] Running Repository Guardian...');
    this.results.repository = await this.guardians.repository.run();

    console.log('[GUARDIAN] Running Documentation Guardian...');
    this.results.documentation = await this.guardians.documentation.run();

    console.log('[GUARDIAN] Running Dependency Guardian...');
    this.results.dependency = await this.guardians.dependency.run();

    console.log('[GUARDIAN] Running Git Guardian...');
    this.results.git = await this.guardians.git.run();

    console.log('[GUARDIAN] Running AI Guardian...');
    this.results.ai = await this.guardians.ai.run();

    console.log('[GUARDIAN] Running Database Guardian...');
    this.results.database = await this.guardians.database.run();

    console.log('[GUARDIAN] Running Storage Guardian...');
    this.results.storage = await this.guardians.storage.run();

    // Calculate score
    this.calculateScore();

    // Generate reports
    const reportGenerator = new ReportGenerator(ROOT);
    await reportGenerator.generate(this.results);

    console.log('\n[GUARDIAN] === GUARDIAN COMPLETE ===');
    console.log('[GUARDIAN] Score:', this.results.score + '/' + this.results.maxScore);
    console.log('[GUARDIAN] Violations:', this.results.violations.length);
    console.log('[GUARDIAN] Warnings:', this.results.warnings.length);

    return this.results;
  }

  calculateScore() {
    const criticalViolations = this.results.violations.filter(v => v.level === 'P0' || v.level === 'P1');
    const majorViolations = this.results.violations.filter(v => v.level === 'P2');
    const minorViolations = this.results.violations.filter(v => v.level === 'P3' || v.level === 'P4');

    const penalty = criticalViolations.length * 25 + majorViolations.length * 10 + minorViolations.length * 2;
    this.results.score = Math.max(0, 100 - penalty);
  }

  static get VIOLATION_LEVELS() {
    return VIOLATION_LEVELS;
  }
}

export default GuardianOrchestrator;
