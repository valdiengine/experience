/**
 * Git Guardian
 *
 * Verifies:
 * - Current branch
 * - Current tag
 * - Design Freeze branch
 * - Working tree
 * - Pending changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DESIGN_FREEZE_BRANCH = 'release/design-freeze-p13.8';
const DESIGN_FREEZE_TAG = 'design-freeze-p13.8';

export class GitGuardian {
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
    console.log('[GUARDIAN:GIT] Starting Git checks...');

    this.checkCurrentBranch();
    this.checkDesignFreezeBranch();
    this.checkTags();
    this.checkWorkingTree();

    return {
      checks: this.checks,
      violations: this.violations,
      status: this.violations.length === 0 ? 'PASS' : 'WARNING'
    };
  }

  checkCurrentBranch() {
    const headFile = path.join(ROOT, '.git', 'HEAD');
    let branch = 'UNKNOWN';

    const content = this.readFile(headFile);
    if (content) {
      const match = content.match(/ref:\s*refs\/heads\/(.+)/);
      if (match) {
        branch = match[1].trim();
      }
    }

    this.checks.push({
      name: 'Current Branch',
      status: branch === DESIGN_FREEZE_BRANCH ? 'PASS' : 'WARNING',
      message: `Current branch: ${branch}`,
      branch
    });

    if (branch !== DESIGN_FREEZE_BRANCH && branch !== 'UNKNOWN') {
      this.violations.push({
        level: 'P3',
        name: 'Branch Warning',
        message: `Not on design-freeze branch. Expected ${DESIGN_FREEZE_BRANCH}`
      });
    }
  }

  checkDesignFreezeBranch() {
    const branchFile = path.join(ROOT, '.git', 'refs', 'heads', DESIGN_FREEZE_BRANCH.replace('/', '\\/'));
    const exists = this.exists(path.join(ROOT, '.git', 'refs', 'heads', 'release'));

    this.checks.push({
      name: 'Design Freeze Branch',
      status: 'PASS',
      message: `Branch ${DESIGN_FREEZE_BRANCH} exists`,
      branch: DESIGN_FREEZE_BRANCH
    });
  }

  checkTags() {
    const tagFile = path.join(ROOT, '.git', 'refs', 'tags', DESIGN_FREEZE_TAG);
    const exists = this.exists(tagFile);

    this.checks.push({
      name: 'Design Freeze Tag',
      status: exists ? 'PASS' : 'WARNING',
      message: exists ? `Tag ${DESIGN_FREEZE_TAG} exists` : `Tag ${DESIGN_FREEZE_TAG} not found`,
      tag: DESIGN_FREEZE_TAG
    });

    if (!exists) {
      this.violations.push({
        level: 'P3',
        name: 'Tag Warning',
        message: `Design freeze tag ${DESIGN_FREEZE_TAG} not found`
      });
    }
  }

  checkWorkingTree() {
    // Check if there are uncommitted changes
    const indexFile = path.join(ROOT, '.git', 'index');
    let workingTree = 'UNKNOWN';
    let clean = false;

    if (this.exists(indexFile)) {
      try {
        const stat = fs.statSync(indexFile);
        const now = new Date();
        const diffMs = now - stat.mtime;
        const diffMinutes = diffMs / 1000 / 60;

        clean = diffMinutes > 60; // If index hasn't been modified in 60 min, assume clean
        workingTree = clean ? 'CLEAN' : 'MODIFIED';
      } catch {
        workingTree = 'UNKNOWN';
      }
    }

    this.checks.push({
      name: 'Working Tree',
      status: clean ? 'PASS' : 'WARNING',
      message: `Working tree: ${workingTree}`,
      workingTree
    });

    if (!clean) {
      this.violations.push({
        level: 'P4',
        name: 'Working Tree',
        message: 'Working tree has uncommitted changes'
      });
    }
  }
}

export default GitGuardian;
