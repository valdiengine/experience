/**
 * Workflow Engine — Action Node
 *
 * Executes actions: call services, transform data, send notifications
 * Business-agnostic: actions are generic operations
 */

export class ActionNode {
  static type = 'action'

  /**
   * Execute action node
   * @param {object} node - Node configuration
   * @param {object} context - WorkflowContext
   * @returns {{ success: boolean, output?: object, error?: string }}
   */
  static async execute(node, context) {
    const config = node.config || {}
    const { actionType, service, method, params, transforms } = config

    switch (actionType) {
      case 'call_service':
        return ActionNode.#callService(service, method, params, context)
      case 'set_variable':
        return ActionNode.#setVariable(params, context)
      case 'transform':
        return ActionNode.#transform(transforms, context)
      case 'log':
        return ActionNode.#log(params, context)
      default:
        return { success: false, error: `Unknown action type: ${actionType}` }
    }
  }

  static async #callService(serviceName, method, params, context) {
    const service = context.getService(serviceName)
    if (!service) {
      return { success: false, error: `Service not available: ${serviceName}` }
    }

    if (!method || typeof service[method] !== 'function') {
      return { success: false, error: `Method ${method} not found on service ${serviceName}` }
    }

    // Resolve params from context variables
    const resolvedParams = {}
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string' && value.startsWith('$')) {
          resolvedParams[key] = context.evaluate(value.slice(1))
        } else {
          resolvedParams[key] = value
        }
      }
    }

    // Always pass tenantId
    resolvedParams.tenantId = context.tenantId

    try {
      const result = await service[method](resolvedParams)
      return { success: true, output: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  static #setVariable(params, context) {
    if (!params || !params.key) {
      return { success: false, error: 'set_variable requires params.key' }
    }

    let value = params.value
    if (typeof value === 'string' && value.startsWith('$')) {
      value = context.evaluate(value.slice(1))
    }

    context.set(params.key, value)
    return { success: true, output: { variable: params.key, value } }
  }

  static #transform(transforms, context) {
    if (!transforms || !Array.isArray(transforms)) {
      return { success: false, error: 'transform requires transforms array' }
    }

    for (const transform of transforms) {
      const { source, target, operation } = transform
      const sourceValue = context.evaluate(source)

      let result = sourceValue
      switch (operation) {
        case 'to_upper':
          result = String(sourceValue).toUpperCase()
          break
        case 'to_lower':
          result = String(sourceValue).toLowerCase()
          break
        case 'trim':
          result = String(sourceValue).trim()
          break
        case 'to_number':
          result = Number(sourceValue)
          break
        case 'to_string':
          result = String(sourceValue)
          break
        case 'default':
          result = sourceValue || transform.defaultValue
          break
      }

      context.set(target, result)
    }

    return { success: true, output: { transformsApplied: transforms.length } }
  }

  static #log(params, context) {
    const message = params?.message || 'Workflow log'
    const level = params?.level || 'info'
    console.log(`[Workflow:${level}] ${message}`, context.getAll())
    return { success: true, output: { logged: true, message, level } }
  }

  static getDefinition() {
    return {
      type: 'action',
      name: 'Action',
      description: 'Executes an action (service call, variable set, transform)',
      config: {
        actionType: {
          type: 'select',
          options: ['call_service', 'set_variable', 'transform', 'log'],
          required: true,
        },
        service: { type: 'string', description: 'Service name for call_service' },
        method: { type: 'string', description: 'Method name for call_service' },
        params: { type: 'object', description: 'Parameters for the action' },
        transforms: { type: 'array', description: 'Transform operations' },
      },
    }
  }
}
