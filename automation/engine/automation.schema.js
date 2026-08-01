/**
 * Automation Engine — Schemas
 *
 * Defines rule structure: triggers, conditions, actions
 * Business-agnostic: rules are generic event-driven automations
 */
import { createSchema } from '../../capabilities/core/schema.js'

export const RULE_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ERROR: 'error',
}

export const TRIGGER_TYPES = {
  EVENT: 'event',
  SCHEDULE: 'schedule',
  MANUAL: 'manual',
}

export const ACTION_TYPES = {
  WEBHOOK: 'webhook',
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  SET_VARIABLE: 'set_variable',
  CALL_SERVICE: 'call_service',
  LOG: 'log',
}

export const CONDITION_OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  CONTAINS: 'contains',
  IN: 'in',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
}

export const RULE_SCHEMA = createSchema({
  id: 'automation_rule',
  name: 'Automation Rule',
  description: 'An event-driven automation rule',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string', required: false },
    status: { type: 'string', required: true, values: Object.values(RULE_STATUS) },
    trigger: { type: 'object', required: true },
    conditions: { type: 'array', required: false },
    actions: { type: 'array', required: true },
    cooldown: { type: 'number', required: false },
    maxExecutions: { type: 'number', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
  },
})

export const RULE_EXECUTION_SCHEMA = createSchema({
  id: 'rule_execution',
  name: 'Rule Execution',
  description: 'Record of a rule execution',
  fields: {
    id: { type: 'string', required: true },
    ruleId: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    triggeredBy: { type: 'string', required: true },
    status: { type: 'string', required: true },
    actionsExecuted: { type: 'number', required: true },
    actionsSucceeded: { type: 'number', required: true },
    actionsFailed: { type: 'number', required: true },
    error: { type: 'string', required: false },
    executedAt: { type: 'string', required: true },
  },
})

export function validateRule(data) {
  return RULE_SCHEMA.validate(data)
}

export function validateRuleExecution(data) {
  return RULE_EXECUTION_SCHEMA.validate(data)
}
