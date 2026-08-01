import { BaseRuntimeContract } from './base.runtime.js'

export class NotificationRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'notification'
  }

  async send(notification, channels) {
    return null
  }

  async sendPush(device, payload) {
    return null
  }

  async sendSms(phone, message) {
    return null
  }

  async sendEmail(address, subject, body) {
    return null
  }

  async sendInApp(userId, notification) {
    return null
  }

  async registerDevice(userId, device) {}

  async unregisterDevice(userId, deviceId) {}

  async getNotifications(userId, options) {
    return []
  }

  async markRead(notificationId) {}

  async markAllRead(userId) {}

  supports(feature) {
    const features = ['push', 'sms', 'email', 'in-app', 'webhook', 'template', 'scheduled', 'bulk']
    return features.includes(feature)
  }
}

export default NotificationRuntime
