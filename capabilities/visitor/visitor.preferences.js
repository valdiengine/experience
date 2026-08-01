export class VisitorPreferences {
  constructor(data = {}) {
    this.language = data.language || null
    this.currency = data.currency || null
    this.notifications = data.notifications ?? true
    this.marketing = data.marketing ?? false
    this.accessibility = data.accessibility || null
    this.theme = data.theme || 'light'
    this.searchPreferences = data.searchPreferences || {}
    this.privacy = data.privacy || {}
    this.communication = data.communication || []
  }

  static create(data = {}) {
    return new VisitorPreferences(data)
  }

  toJSON() {
    return {
      language: this.language,
      currency: this.currency,
      notifications: this.notifications,
      marketing: this.marketing,
      accessibility: this.accessibility,
      theme: this.theme,
      searchPreferences: { ...this.searchPreferences },
      privacy: { ...this.privacy },
      communication: [...this.communication],
    }
  }
}
