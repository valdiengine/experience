/**
 * Automation Engine — Webhook Action
 *
 * Sends HTTP requests to external services
 * Business-agnostic: webhooks are generic HTTP calls
 */
export class WebhookAction {
  static type = 'webhook'

  static async execute(config, context) {
    const { url, method, headers, body, timeout } = config

    if (!url) {
      return { success: false, error: 'Webhook requires url' }
    }

    // Resolve URL from context
    const resolvedUrl = typeof url === 'string' && url.startsWith('$')
      ? context.evaluate(url.slice(1))
      : url

    // Resolve body from context
    let resolvedBody = body
    if (body && typeof body === 'object') {
      resolvedBody = {}
      for (const [key, value] of Object.entries(body)) {
        resolvedBody[key] = typeof value === 'string' && value.startsWith('$')
          ? context.evaluate(value.slice(1))
          : value
      }
    }

    try {
      const response = await fetch(resolvedUrl, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: resolvedBody ? JSON.stringify(resolvedBody) : undefined,
        signal: AbortSignal.timeout(timeout || 10000),
      })

      const responseData = await response.json().catch(() => null)

      return {
        success: response.ok,
        output: {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        },
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
