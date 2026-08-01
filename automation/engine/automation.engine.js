/**
 * Automation Engine — Engine
 *
 * Core rule engine: listens to events, evaluates conditions, executes actions
 * Business-agnostic: engine is a generic event-driven automation system
 */
import { RULE_STATUS, ACTION_TYPES } from './automation.schema.js'
import { AUTOMATION_EVENTS } from './automation.events.js'
import { RuleContext } from './rule.context.js'
import { WebhookAction } from './actions/webhook.action.js'
import { NotificationAction } from './actions/notification.action.js'
import { LogAction } from './actions/log.action.js'
import { ServiceAction } from './actions/service.action.js'
import { PREDEFINED_RULES } from './rules/predefined.rules.js'

const ACTION_EXECUTORS = {
  [ACTION_TYPES.WEBHOOK]: WebhookAction,
  [ACTION_TYPES.NOTIFICATION]: NotificationAction,
  [ACTION_TYPES.EMAIL]: NotificationAction,
  [ACTION_TYPES.LOG]: LogAction,
  [ACTION_TYPES.CALL_SERVICE]: ServiceAction,
  [ACTION_TYPES.SET_VARIABLE]: null, // Handled inline
}

function generateId() {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export class AutomationEngine {
  #rules = new Map()
  #executions = new Map()
  #eventBus = null
  #services = null
  #cooldowns = new Map()
  #executionCounts = new Map()

  constructor(eventBus, services = null) {
    this.#eventBus = eventBus
    this.#services = services
    this.#loadPredefinedRules()
    this.#setupEventListeners()
  }

  #loadPredefinedRules() {
    for (const rule of PREDEFINED_RULES) {
      this.#rules.set(rule.id, { ...rule })
    }
  }

  #setupEventListeners() {
    // Listen to all events and check rules
    this.#eventBus?.on('*', (eventName, data) => {
      this.#handleEvent(eventName, data)
    })
  }

  /**
   * Register a rule
   * @param {object} rule - Rule definition
   * @returns {{ success: boolean, rule?: object, error?: string }}
   */
  register(rule) {
    if (!rule.id || !rule.name || !rule.trigger || !rule.actions) {
      return { success: false, error: 'Rule must have id, name, trigger, and actions' }
    }

    const entry = {
      ...rule,
      status: rule.status || RULE_STATUS.ACTIVE,
      cooldown: rule.cooldown || 0,
      maxExecutions: rule.maxExecutions || Infinity,
      createdAt: rule.createdAt || new Date().toISOString(),
    }

    this.#rules.set(entry.id, entry)
    this.#eventBus?.emit(AUTOMATION_EVENTS.RULE_CREATED, { rule: entry })
    return { success: true, rule: entry }
  }

  /**
   * Get a rule by ID
   * @param {string} ruleId
   * @returns {object|null}
   */
  get(ruleId) {
    return this.#rules.get(ruleId) || null
  }

  /**
   * List rules for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  list(tenantId) {
    return [...this.#rules.values()].filter(r => r.tenantId === tenantId)
  }

  /**
   * Activate a rule
   * @param {string} ruleId
   * @returns {{ success: boolean }}
   */
  activate(ruleId) {
    const rule = this.#rules.get(ruleId)
    if (!rule) return { success: false }
    rule.status = RULE_STATUS.ACTIVE
    this.#eventBus?.emit(AUTOMATION_EVENTS.RULE_ACTIVATED, { ruleId })
    return { success: true }
  }

  /**
   * Pause a rule
   * @param {string} ruleId
   * @returns {{ success: boolean }}
   */
  pause(ruleId) {
    const rule = this.#rules.get(ruleId)
    if (!rule) return { success: false }
    rule.status = RULE_STATUS.PAUSED
    this.#eventBus?.emit(AUTOMATION_EVENTS.RULE_PAUSED, { ruleId })
    return { success: true }
  }

  /**
   * Delete a rule
   * @param {string} ruleId
   * @returns {{ success: boolean }}
   */
  delete(ruleId) {
    if (!this.#rules.has(ruleId)) return { success: false }
    this.#rules.delete(ruleId)
    this.#eventBus?.emit(AUTOMATION_EVENTS.RULE_DELETED, { ruleId })
    return { success: true }
  }

  /**
   * Manually trigger a rule
   * @param {string} ruleId
   * @param {object} [data] - Event data
   * @returns {Promise<{ success: boolean, executionId?: string, error?: string }>}
   */
  async trigger(ruleId, data = {}) {
    const rule = this.#rules.get(ruleId)
    if (!rule) return { success: false, error: 'Rule not found' }

    return this.#executeRule(rule, `manual:${ruleId}`, data)
  }

  /**
   * Get execution history for a tenant
   * @param {string} tenantId
   * @param {number} [limit=50]
   * @returns {object[]}
   */
  getExecutions(tenantId, limit = 50) {
    return [...this.#executions.values()]
      .filter(e => e.tenantId === tenantId)
      .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))
      .slice(0, limit)
  }

  /**
   * Get stats for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getStats(tenantId) {
    const rules = this.list(tenantId)
    const executions = [...this.#executions.values()].filter(e => e.tenantId === tenantId)

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.status === RULE_STATUS.ACTIVE).length,
      totalExecutions: executions.length,
      succeeded: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
    }
  }

  async #handleEvent(eventName, data) {
    // Find rules that match this event
    for (const rule of this.#rules.values()) {
      if (rule.tenantId !== data?.tenantId) continue
      if (rule.status !== RULE_STATUS.ACTIVE) continue
      if (rule.trigger.type !== 'event') continue
      if (rule.trigger.eventName !== eventName) continue

      await this.#executeRule(rule, eventName, data)
    }
  }

  async #executeRule(rule, triggeredBy, data) {
    const executionId = generateId()

    // Check cooldown
    if (rule.cooldown > 0) {
      const lastExecution = this.#cooldowns.get(rule.id)
      if (lastExecution) {
        const elapsed = Date.now() - lastExecution
        if (elapsed < rule.cooldown) {
          this.#eventBus?.emit(AUTOMATION_EVENTS.COOLDOWN_ACTIVE, {
            ruleId: rule.id,
            remainingMs: rule.cooldown - elapsed,
          })
          return { success: false, error: 'Cooldown active', retryAfterMs: rule.cooldown - elapsed }
        }
      }
    }

    // Check max executions
    const execCount = this.#executionCounts.get(rule.id) || 0
    if (execCount >= rule.maxExecutions) {
      this.#eventBus?.emit(AUTOMATION_EVENTS.MAX_EXECUTIONS_REACHED, { ruleId: rule.id })
      return { success: false, error: 'Max executions reached' }
    }

    this.#eventBus?.emit(AUTOMATION_EVENTS.RULE_TRIGGERED, { ruleId: rule.id, triggeredBy })

    const context = new RuleContext({
      tenantId: rule.tenantId,
      ruleId: rule.id,
      eventData: data,
      services: this.#services,
    })

    // Evaluate conditions
    if (rule.conditions && rule.conditions.length > 0) {
      const conditionsMet = rule.conditions.every(condition => {
        const fieldValue = context.evaluate(condition.field)
        return this.#evaluateCondition(fieldValue, condition.operator, condition.value)
      })

      if (!conditionsMet) {
        this.#eventBus?.emit(AUTOMATION_EVENTS.RULE_SKIPPED, { ruleId: rule.id, reason: 'conditions_not_met' })
        return { success: true, skipped: true, reason: 'conditions_not_met' }
      }
    }

    this.#eventBus?.emit(AUTOMATION_EVENTS.RULE_MATCHED, { ruleId: rule.id })

    // Execute actions
    let actionsSucceeded = 0
    let actionsFailed = 0
    let lastError = null

    for (const action of rule.actions) {
      this.#eventBus?.emit(AUTOMATION_EVENTS.ACTION_STARTED, {
        ruleId: rule.id,
        actionType: action.type,
      })

      const result = await this.#executeAction(action, context)

      if (result.success) {
        actionsSucceeded++
        this.#eventBus?.emit(AUTOMATION_EVENTS.ACTION_COMPLETED, {
          ruleId: rule.id,
          actionType: action.type,
          result,
        })
      } else {
        actionsFailed++
        lastError = result.error
        this.#eventBus?.emit(AUTOMATION_EVENTS.ACTION_FAILED, {
          ruleId: rule.id,
          actionType: action.type,
          error: result.error,
        })
      }
    }

    // Record execution
    const execution = {
      id: executionId,
      ruleId: rule.id,
      tenantId: rule.tenantId,
      triggeredBy,
      status: actionsFailed === 0 ? 'completed' : 'failed',
      actionsExecuted: rule.actions.length,
      actionsSucceeded,
      actionsFailed,
      error: lastError,
      executedAt: new Date().toISOString(),
    }

    this.#executions.set(executionId, execution)
    this.#cooldowns.set(rule.id, Date.now())
    this.#executionCounts.set(rule.id, execCount + 1)

    const event = actionsFailed === 0 ? AUTOMATION_EVENTS.RULE_EXECUTED : AUTOMATION_EVENTS.RULE_FAILED
    this.#eventBus?.emit(event, { execution })

    return {
      success: actionsFailed === 0,
      executionId,
      actionsSucceeded,
      actionsFailed,
    }
  }

  async #executeAction(action, context) {
    // Handle set_variable inline
    if (action.type === ACTION_TYPES.SET_VARIABLE) {
      const { key, value } = action.config || {}
      if (key) {
        const resolvedValue = typeof value === 'string' && value.startsWith('$')
          ? context.evaluate(value.slice(1))
          : value
        context.set(key, resolvedValue)
        return { success: true, output: { variable: key, value: resolvedValue } }
      }
      return { success: false, error: 'set_variable requires config.key' }
    }

    const executor = ACTION_EXECUTORS[action.type]
    if (!executor) {
      return { success: false, error: `Unknown action type: ${action.type}` }
    }

    try {
      return await executor.execute(action.config || {}, context)
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  #evaluateCondition(fieldValue, operator, expectedValue) {
    switch (operator) {
      case 'equals': return fieldValue === expectedValue
      case 'not_equals': return fieldValue !== expectedValue
      case 'gt': return fieldValue > expectedValue
      case 'gte': return fieldValue >= expectedValue
      case 'lt': return fieldValue < expectedValue
      case 'lte': return fieldValue <= expectedValue
      case 'contains': return String(fieldValue).includes(String(expectedValue))
      case 'in': return Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
      case 'is_empty': return !fieldValue || fieldValue === ''
      case 'is_not_empty': return !!fieldValue && fieldValue !== ''
      default: return false
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.#rules.clear()
    this.#executions.clear()
    this.#cooldowns.clear()
    this.#executionCounts.clear()
  }
}
