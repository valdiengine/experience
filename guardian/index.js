/**
 * Architecture Guardian - Entry Point
 *
 * Run: node guardian/index.js
 *
 * Executes all guardians and generates reports.
 */

import { GuardianOrchestrator } from './guardian.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     ARCHITECTURE GUARDIAN - Protection System  ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');

  const guardian = new GuardianOrchestrator();

  try {
    await guardian.run();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║              GUARDIAN COMPLETE                   ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('Score:', guardian.results.score + '/' + guardian.results.maxScore);
    console.log('Violations:', guardian.results.violations.length);
    console.log('Warnings:', guardian.results.warnings.length);
    console.log('');

    if (guardian.results.violations.length > 0) {
      console.log('VIOLATIONS:');
      guardian.results.violations.forEach(v => {
        console.log(`  [${v.level}] ${v.name}: ${v.message}`);
      });
      console.log('');
    }

    console.log('Reports generated:');
    console.log('  - docs/architecture/GUARDIAN_REPORT.md');
    console.log('  - guardian/guardian-report.json');
    console.log('  - guardian/guardian-history.md');

  } catch (error) {
    console.error('Guardian error:', error);
    process.exit(1);
  }
}

main();
