/**
 * Automation Engine — Service Action
 *
 * Calls a business service method
 * Business-agnostic: service calls are generic
 */
export class ServiceAction {
  static type = 'call_service'

  static async execute(config, context) {
    const { service, method, params } = config

    const serviceInstance = context.getService(service)
    if (!serviceInstance) {
      return { success: false, error: `Service not available: ${service}` }
    }

    if (!method || typeof serviceInstance[method] !== 'function') {
      return { success: false, error: `Method ${method} not found on service ${service}` }
    }

    // Resolve params from context
    const resolvedParams = { tenantId: context.tenantId }
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        resolvedParams[key] = typeof value === 'string' && value.startsWith('$')
          ? context.evaluate(value.slice(1))
          : value
      }
    }

    try {
      const result = await serviceInstance[method](resolvedParams)
      return { success: true, output: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
