/**
 * Workflow Engine — Schemas
 *
 * Defines workflow structure: nodes, edges, definitions, execution state
 * Business-agnostic: workflows are generic multi-step flows
 */
import { createSchema } from '../../capabilities/core/schema.js'

export const NODE_TYPES = {
  TRIGGER: 'trigger',
  CONDITION: 'condition',
  ACTION: 'action',
  DELAY: 'delay',
  BRANCH: 'branch',
  PARALLEL: 'parallel',
  MERGE: 'merge',
  END: 'end',
}

export const TRIGGER_TYPES = {
  EVENT: 'event',
  SCHEDULE: 'schedule',
  MANUAL: 'manual',
  WEBHOOK: 'webhook',
}

export const CONDITION_OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  IN: 'in',
  NOT_IN: 'not_in',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
}

export const WORKFLOW_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ERROR: 'error',
  COMPLETED: 'completed',
}

export const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

export const WORKFLOW_SCHEMA = createSchema({
  id: 'workflow',
  name: 'Workflow',
  description: 'A multi-step workflow definition',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string', required: false },
    status: { type: 'string', required: true, values: Object.values(WORKFLOW_STATUS) },
    nodes: { type: 'array', required: true },
    edges: { type: 'array', required: true },
    variables: { type: 'object', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
    version: { type: 'number', required: false },
  },
})

export const NODE_SCHEMA = createSchema({
  id: 'workflow_node',
  name: 'Workflow Node',
  description: 'A single step in a workflow',
  fields: {
    id: { type: 'string', required: true },
    type: { type: 'string', required: true, values: Object.values(NODE_TYPES) },
    name: { type: 'string', required: true },
    config: { type: 'object', required: false },
    position: { type: 'object', required: false },
  },
})

export const EDGE_SCHEMA = createSchema({
  id: 'workflow_edge',
  name: 'Workflow Edge',
  description: 'A connection between two nodes',
  fields: {
    id: { type: 'string', required: true },
    source: { type: 'string', required: true },
    target: { type: 'string', required: true },
    condition: { type: 'object', required: false },
    label: { type: 'string', required: false },
  },
})

export const EXECUTION_SCHEMA = createSchema({
  id: 'workflow_execution',
  name: 'Workflow Execution',
  description: 'Runtime state of a workflow execution',
  fields: {
    id: { type: 'string', required: true },
    workflowId: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    status: { type: 'string', required: true, values: Object.values(EXECUTION_STATUS) },
    currentNodeId: { type: 'string', required: false },
    variables: { type: 'object', required: false },
    history: { type: 'array', required: false },
    startedAt: { type: 'string', required: true },
    completedAt: { type: 'string', required: false },
    error: { type: 'string', required: false },
  },
})

export function validateWorkflow(data) {
  return WORKFLOW_SCHEMA.validate(data)
}

export function validateNode(data) {
  return NODE_SCHEMA.validate(data)
}

export function validateEdge(data) {
  return EDGE_SCHEMA.validate(data)
}

export function validateExecution(data) {
  return EXECUTION_SCHEMA.validate(data)
}
