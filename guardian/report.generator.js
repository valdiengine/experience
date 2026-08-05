/**
 * Report Generator
 *
 * Generates:
 * - GUARDIAN_REPORT.md
 * - guardian-report.json
 * - guardian-history.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ReportGenerator {
  constructor(root) {
    this.root = root;
    this.docsDir = path.join(root, 'docs', 'architecture');
    this.reportsDir = path.join(root, 'guardian');
  }

  async generate(results) {
    console.log('[GUARDIAN:REPORT] Generating reports...');

    // Ensure directories exist
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    // Generate Markdown Report
    const mdReport = this.generateMarkdown(results);
    const mdPath = path.join(this.docsDir, 'GUARDIAN_REPORT.md');
    fs.writeFileSync(mdPath, mdReport);
    console.log('[GUARDIAN:REPORT] Generated:', mdPath);

    // Generate JSON Report
    const jsonReport = this.generateJSON(results);
    const jsonPath = path.join(this.reportsDir, 'guardian-report.json');
    fs.writeFileSync(jsonPath, jsonReport);
    console.log('[GUARDIAN:REPORT] Generated:', jsonPath);

    // Append to History
    const historyPath = path.join(this.reportsDir, 'guardian-history.md');
    this.appendHistory(historyPath, results);
    console.log('[GUARDIAN:REPORT] Appended to:', historyPath);
  }

  generateMarkdown(results) {
    const sections = [];

    sections.push(`# GUARDIAN REPORT

> Generated: ${results.timestamp}
> Architecture Guardian - Architecture Protection System

---

## Summary

| Metric | Value |
|--------|-------|
| Overall Score | ${results.score}/${results.maxScore} |
| Violations | ${results.violations.length} |
| Warnings | ${results.warnings.length} |

---

## Architecture

${this.formatSection(results.architecture)}

## Runtime

${this.formatSection(results.runtime)}

## API

${this.formatSection(results.api)}

## Repository

${this.formatSection(results.repository)}

## Documentation

${this.formatSection(results.documentation)}

## Dependency

${this.formatSection(results.dependency)}

## Git

${this.formatSection(results.git)}

## AI Operating System

${this.formatSection(results.ai)}

---

## Violations

${results.violations.length === 0 ? 'None' : results.violations.map((v, i) =>
  `${i + 1}. **[${v.level}]** ${v.name}: ${v.message}`
).join('\n')}

---

## Warnings

${results.warnings.length === 0 ? 'None' : results.warnings.map((w, i) =>
  `${i + 1}. ${w.message}`
).join('\n')}

---

## Recommendations

${this.generateRecommendations(results)}

---

**Report Generated:** ${results.timestamp}
`);

    return sections.join('\n');
  }

  formatSection(section) {
    if (!section) return '| Status | N/A |';

    const checks = section.checks || [];
    const status = section.status || 'UNKNOWN';

    const rows = checks.map(c =>
      `| ${c.name} | ${c.status} | ${c.message || ''} |`
    ).join('\n');

    return `| Check | Status | Message |
|--------|--------|---------|
${rows}

**Section Status:** ${status}`;
  }

  generateRecommendations(results) {
    const recs = [];

    if (results.score < 50) {
      recs.push('Critical: Architecture score below 50. Full audit required.');
    } else if (results.score < 80) {
      recs.push('Warning: Architecture score below 80. Review violations.');
    }

    const p1Violations = results.violations.filter(v => v.level === 'P1');
    if (p1Violations.length > 0) {
      recs.push(`Critical: ${p1Violations.length} Design Freeze violations detected.`);
    }

    const p2Violations = results.violations.filter(v => v.level === 'P2');
    if (p2Violations.length > 0) {
      recs.push(`Warning: ${p2Violations.length} Architecture inconsistencies detected.`);
    }

    if (results.violations.length === 0) {
      recs.push('All checks passed. Architecture is healthy.');
    }

    return recs.map((r, i) => `${i + 1}. ${r}`).join('\n');
  }

  generateJSON(results) {
    return JSON.stringify({
      timestamp: results.timestamp,
      score: results.score,
      maxScore: results.maxScore,
      architecture: results.architecture,
      runtime: results.runtime,
      api: results.api,
      repository: results.repository,
      documentation: results.documentation,
      dependency: results.dependency,
      git: results.git,
      ai: results.ai,
      violations: results.violations,
      warnings: results.warnings,
      overall: {
        status: results.score >= 80 ? 'HEALTHY' : 'SICK',
        violations: results.violations.length,
        warnings: results.warnings.length
      }
    }, null, 2);
  }

  appendHistory(historyPath, results) {
    const entry = `

## ${results.timestamp}

| Metric | Value |
|--------|-------|
| Score | ${results.score}/${results.maxScore} |
| Violations | ${results.violations.length} |
| Warnings | ${results.warnings.length} |
| Status | ${results.score >= 80 ? 'HEALTHY' : 'SICK'} |

### Violations

${results.violations.length === 0 ? 'None' : results.violations.map(v => `- [${v.level}] ${v.name}: ${v.message}`).join('\n')}

---

`;

    if (fs.existsSync(historyPath)) {
      const existing = fs.readFileSync(historyPath, 'utf-8');
      const header = existing.split('\n## ')[0];
      fs.writeFileSync(historyPath, header + '\n## ' + entry.slice(3));
    } else {
      const header = `# GUARDIAN HISTORY

> Append-only log of all Guardian runs.

---
`;
      fs.writeFileSync(historyPath, header + '\n## ' + entry.slice(3));
    }
  }
}

export default ReportGenerator;
