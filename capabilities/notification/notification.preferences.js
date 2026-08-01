export class NotificationPreferences {
  constructor({
    recipientId,
    emailEnabled = true,
    smsEnabled = true,
    pushEnabled = true,
    whatsappEnabled = false,
    marketingEnabled = false,
    language = 'en',
    timezone = 'UTC',
    metadata = {},
  }) {
    this.recipientId = recipientId
    this.emailEnabled = emailEnabled
    this.smsEnabled = smsEnabled
    this.pushEnabled = pushEnabled
    this.whatsappEnabled = whatsappEnabled
    this.marketingEnabled = marketingEnabled
    this.language = language
    this.timezone = timezone
    this.metadata = metadata
  }

  static fromJSON(json) {
    return new NotificationPreferences({
      recipientId: json.recipientId,
      emailEnabled: json.emailEnabled ?? true,
      smsEnabled: json.smsEnabled ?? true,
      pushEnabled: json.pushEnabled ?? true,
      whatsappEnabled: json.whatsappEnabled ?? false,
      marketingEnabled: json.marketingEnabled ?? false,
      language: json.language ?? 'en',
      timezone: json.timezone ?? 'UTC',
      metadata: json.metadata ?? {},
    })
  }

  toJSON() {
    return {
      recipientId: this.recipientId,
      emailEnabled: this.emailEnabled,
      smsEnabled: this.smsEnabled,
      pushEnabled: this.pushEnabled,
      whatsappEnabled: this.whatsappEnabled,
      marketingEnabled: this.marketingEnabled,
      language: this.language,
      timezone: this.timezone,
      metadata: this.metadata,
    }
  }

  isChannelEnabled(channel) {
    switch (channel) {
      case 'email':
        return this.emailEnabled
      case 'sms':
        return this.smsEnabled
      case 'push':
        return this.pushEnabled
      case 'whatsapp':
        return this.whatsappEnabled
      case 'in_app':
        return true
      default:
        return false
    }
  }

  enableChannel(channel) {
    switch (channel) {
      case 'email':
        this.emailEnabled = true
        break
      case 'sms':
        this.smsEnabled = true
        break
      case 'push':
        this.pushEnabled = true
        break
      case 'whatsapp':
        this.whatsappEnabled = true
        break
    }
  }

  disableChannel(channel) {
    switch (channel) {
      case 'email':
        this.emailEnabled = false
        break
      case 'sms':
        this.smsEnabled = false
        break
      case 'push':
        this.pushEnabled = false
        break
      case 'whatsapp':
        this.whatsappEnabled = false
        break
    }
  }

  enableMarketing() {
    this.marketingEnabled = true
  }

  disableMarketing() {
    this.marketingEnabled = false
  }

  setLanguage(language) {
    this.language = language
  }

  setTimezone(timezone) {
    this.timezone = timezone
  }

  getEnabledChannels() {
    const channels = ['in_app']
    if (this.emailEnabled) channels.push('email')
    if (this.smsEnabled) channels.push('sms')
    if (this.pushEnabled) channels.push('push')
    if (this.whatsappEnabled) channels.push('whatsapp')
    return channels
  }

  merge(other) {
    return new NotificationPreferences({
      recipientId: this.recipientId,
      emailEnabled: other.emailEnabled ?? this.emailEnabled,
      smsEnabled: other.smsEnabled ?? this.smsEnabled,
      pushEnabled: other.pushEnabled ?? this.pushEnabled,
      whatsappEnabled: other.whatsappEnabled ?? this.whatsappEnabled,
      marketingEnabled: other.marketingEnabled ?? this.marketingEnabled,
      language: other.language ?? this.language,
      timezone: other.timezone ?? this.timezone,
      metadata: { ...this.metadata, ...other.metadata },
    })
  }
}

export const DEFAULT_PREFERENCES = new NotificationPreferences({
  recipientId: 'default',
})
