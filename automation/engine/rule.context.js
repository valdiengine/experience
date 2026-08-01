/**
 * Automation Engine — Rule Context
 *
 * Provides context for rule evaluation and action execution
 * Business-agnostic: context is event data + variables
 */
export class RuleContext {
  #eventData = {}
  #variables = new Map()
  #services = null
  #tenantId = null
  #ruleId = null

  constructor({ tenantId, ruleId, eventData = {}, services = null }) {
    this.#tenantId = tenantId
    this.#ruleId = ruleId
    this.#eventData = eventData
    this.#services = services

    // Initialize variables from event data
    for (const [key, value] of Object.entries(eventData)) {
      this.#variables.set(key, value)
    }
  }

  get tenantId() { return this.#tenantId }
  get ruleId() { return this.#ruleId }
  get eventData() { return this.#eventData }

  /**
   * Get a variable or event data value
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    if (this.#variables.has(key)) return this.#variables.get(key)
    if (this.#eventData[key] !== undefined) return this.#eventData[key]
    return undefined
  }

  /**
   * Set a variable
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    this.#variables.set(key, value)
  }

  /**
   * Get a service by name
   * @param {string} name
   * @returns {object|null}
   */
  getService(name) {
    return this.#services?.get(name) || null
  }

  /**
   * Evaluate an expression
   * @param {string} expression
   * @returns {*}
   */
  evaluate(expression) {
    return this.get(expression)
  }
}
