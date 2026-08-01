/**
 * Workflow Engine — Context
 *
 * Provides execution context for workflow nodes: variables, services, state
 * Business-agnostic: context is generic key-value + service references
 */
export class WorkflowContext {
  #variables = new Map()
  #services = null
  #executionId = null
  #workflowId = null
  #tenantId = null
  #nodeResults = new Map()

  constructor({ executionId, workflowId, tenantId, variables = {}, services = null }) {
    this.#executionId = executionId
    this.#workflowId = workflowId
    this.#tenantId = tenantId
    this.#services = services

    for (const [key, value] of Object.entries(variables)) {
      this.#variables.set(key, value)
    }
  }

  get executionId() { return this.#executionId }
  get workflowId() { return this.#workflowId }
  get tenantId() { return this.#tenantId }

  /**
   * Get a variable value
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.#variables.get(key)
  }

  /**
   * Set a variable value
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    this.#variables.set(key, value)
  }

  /**
   * Get all variables
   * @returns {object}
   */
  getAll() {
    return Object.fromEntries(this.#variables)
  }

  /**
   * Get a service by name
   * @param {string} name - Service name (reservation, payment, notification, user, analytics)
   * @returns {object|null}
   */
  getService(name) {
    return this.#services?.get(name) || null
  }

  /**
   * Store node execution result
   * @param {string} nodeId
   * @param {*} result
   */
  setNodeResult(nodeId, result) {
    this.#nodeResults.set(nodeId, result)
  }

  /**
   * Get node execution result
   * @param {string} nodeId
   * @returns {*}
   */
  getNodeResult(nodeId) {
    return this.#nodeResults.get(nodeId)
  }

  /**
   * Evaluate an expression against context variables
   * @param {string} expression - Simple expression like "variable_name" or "nodeId.output"
   * @returns {*}
   */
  evaluate(expression) {
    if (!expression) return undefined

    // Check node result reference (nodeId.field)
    if (expression.includes('.')) {
      const [nodeId, field] = expression.split('.')
      const result = this.#nodeResults.get(nodeId)
      if (result && typeof result === 'object') {
        return result[field]
      }
      return result
    }

    // Direct variable reference
    return this.#variables.get(expression)
  }
}
