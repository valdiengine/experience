/**
 * Workflow Engine — Condition Node
 *
 * Evaluates conditions and routes execution to different branches
 * Business-agnostic: conditions are generic comparisons
 */
import { CONDITION_OPERATORS } from '../workflow.schema.js'

export class ConditionNode {
  static type = 'condition'

  /**
   * Execute condition node — evaluate condition and return branch
   * @param {object} node - Node configuration
   * @param {object} context - WorkflowContext
   * @returns {{ success: boolean, output?: object, error?: string }}
   */
  static async execute(node, context) {
    const config = node.config || {}
    const { field, operator, value, conditions, logicOperator } = config

    // Single condition
    if (field && operator) {
      const fieldValue = context.evaluate(field)
      const result = ConditionNode.#evaluateCondition(fieldValue, operator, value)
      return {
        success: true,
        output: {
          result,
          branch: result ? 'true' : 'false',
          field,
          operator,
          expected: value,
          actual: fieldValue,
        },
      }
    }

    // Multiple conditions (AND/OR)
    if (conditions && conditions.length > 0) {
      const op = logicOperator || 'and'
      let result

      if (op === 'and') {
        result = conditions.every(c => {
          const fieldValue = context.evaluate(c.field)
          return ConditionNode.#evaluateCondition(fieldValue, c.operator, c.value)
        })
      } else {
        result = conditions.some(c => {
          const fieldValue = context.evaluate(c.field)
          return ConditionNode.#evaluateCondition(fieldValue, c.operator, c.value)
        })
      }

      return {
        success: true,
        output: {
          result,
          branch: result ? 'true' : 'false',
          logicOperator: op,
          conditionsEvaluated: conditions.length,
        },
      }
    }

    return { success: false, error: 'Condition node requires field+operator or conditions array' }
  }

  static #evaluateCondition(fieldValue, operator, expectedValue) {
    switch (operator) {
      case CONDITION_OPERATORS.EQUALS:
        return fieldValue === expectedValue
      case CONDITION_OPERATORS.NOT_EQUALS:
        return fieldValue !== expectedValue
      case CONDITION_OPERATORS.GT:
        return fieldValue > expectedValue
      case CONDITION_OPERATORS.GTE:
        return fieldValue >= expectedValue
      case CONDITION_OPERATORS.LT:
        return fieldValue < expectedValue
      case CONDITION_OPERATORS.LTE:
        return fieldValue <= expectedValue
      case CONDITION_OPERATORS.CONTAINS:
        return String(fieldValue).includes(String(expectedValue))
      case CONDITION_OPERATORS.NOT_CONTAINS:
        return !String(fieldValue).includes(String(expectedValue))
      case CONDITION_OPERATORS.IN:
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
      case CONDITION_OPERATORS.NOT_IN:
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue)
      case CONDITION_OPERATORS.IS_EMPTY:
        return !fieldValue || fieldValue === ''
      case CONDITION_OPERATORS.IS_NOT_EMPTY:
        return !!fieldValue && fieldValue !== ''
      default:
        return false
    }
  }

  static getDefinition() {
    return {
      type: 'condition',
      name: 'Condition',
      description: 'Evaluates conditions and routes execution',
      config: {
        field: { type: 'string', description: 'Variable or node result to evaluate' },
        operator: { type: 'select', options: Object.values(CONDITION_OPERATORS) },
        value: { type: 'any', description: 'Expected value for comparison' },
        conditions: { type: 'array', description: 'Multiple conditions for AND/OR logic' },
        logicOperator: { type: 'select', options: ['and', 'or'] },
      },
    }
  }
}
