import { BaseRuntimeContract } from './base.runtime.js'

export class WeatherRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'weather'
  }

  async current(lat, lng) {
    return null
  }

  async forecast(lat, lng, days) {
    return []
  }

  async historical(lat, lng, date) {
    return null
  }

  async alerts(lat, lng) {
    return []
  }

  async airQuality(lat, lng) {
    return null
  }

  async uvIndex(lat, lng) {
    return null
  }

  async marine(lat, lng) {
    return null
  }

  async astronomy(lat, lng, date) {
    return null
  }

  supports(feature) {
    const features = ['current', 'forecast', 'historical', 'alerts', 'air-quality', 'uv-index', 'marine', 'astronomy']
    return features.includes(feature)
  }
}

export default WeatherRuntime
