import { BaseRuntimeContract } from './base.runtime.js'

export class AnalyticsRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'analytics'
  }

  async track(event, properties) {}

  async identify(userId, traits) {}

  async page(name, properties) {}

  async screen(name, properties) {}

  async group(groupId, traits) {}

  async alias(previousId, newId) {}

  async query(analyticsQuery) {
    return { data: [], metadata: {} }
  }

  async report(name, options) {
    return null
  }

  async dashboard(name) {
    return null
  }

  supports(feature) {
    const features = ['event', 'pageview', 'user', 'session', 'funnel', 'retention', 'cohort', 'realtime']
    return features.includes(feature)
  }
}

export default AnalyticsRuntime
