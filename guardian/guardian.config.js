/**
 * Guardian Configuration
 *
 * Defines the architecture rules and violation levels.
 */

export const VIOLATION_LEVELS = {
  P0: {
    name: 'Architecture Broken',
    weight: 100,
    description: 'Critical architecture breach. Immediate action required.',
    color: 'red'
  },
  P1: {
    name: 'Design Freeze Violation',
    weight: 50,
    description: 'Violation of frozen components. Not allowed.',
    color: 'red'
  },
  P2: {
    name: 'Architecture Inconsistency',
    weight: 20,
    description: 'Architecture pattern violation. Review required.',
    color: 'orange'
  },
  P3: {
    name: 'Documentation Inconsistency',
    weight: 10,
    description: 'Documentation issue. Should be fixed.',
    color: 'yellow'
  },
  P4: {
    name: 'Recommendation',
    weight: 1,
    description: 'Optimization suggestion. Consider fixing.',
    color: 'blue'
  }
};

export const FROZEN_COMPONENTS = [
  'Business Aggregate',
  'BusinessService',
  'Business Managers',
  'Repository Engine',
  'Runtime Engine',
  'Capability Registration',
  'Aggregate Ownership',
  'Event Model'
];

export const GUARDIAN_RULES = {
  NEVER_MODIFY: [
    'Business Aggregate',
    'BusinessService',
    'Business Managers',
    'Repository Engine',
    'Runtime Engine',
    'Capability Registration',
    'Aggregate Ownership',
    'Event Model'
  ],

  NEVER_BYPASS: [
    'BusinessService',
    'Business Managers',
    'Repository'
  ],

  NEVER_LEAK: [
    'infrastructure',
    'persistence',
    'runtime'
  ]
};

export const DESIGN_FREEZE = {
  branch: 'release/design-freeze-p13.8',
  tag: 'design-freeze-p13.8',
  version: 'P13.8',
  date: '2026-08-01',
  score: 98
};

export const GUARDIAN_CONFIG = {
  enabled: true,
  verbose: true,
  failOnP1: true,
  failOnP0: true,
  warnOnP2: true,
  warnOnP3: true,
  scoreThreshold: 80,
  reportPath: 'docs/architecture/GUARDIAN_REPORT.md',
  jsonReportPath: 'guardian/guardian-report.json',
  historyPath: 'guardian/guardian-history.md'
};

export default {
  VIOLATION_LEVELS,
  FROZEN_COMPONENTS,
  GUARDIAN_RULES,
  DESIGN_FREEZE,
  GUARDIAN_CONFIG
};
