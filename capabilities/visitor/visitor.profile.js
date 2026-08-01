export class VisitorProfile {
  constructor(data = {}) {
    this.displayName = data.displayName || null
    this.avatar = data.avatar || null
    this.publicProfile = data.publicProfile ?? false
    this.biography = data.biography || null
    this.socialLinks = data.socialLinks || []
    this.preferences = data.preferences || {}
    this.contact = {
      email: data.contact?.email || null,
      phone: data.contact?.phone || null,
      country: data.contact?.country || null,
      city: data.contact?.city || null,
      timezone: data.contact?.timezone || null,
      emergencyContact: data.contact?.emergencyContact || null,
    }
  }

  static create(data = {}) {
    return new VisitorProfile(data)
  }

  toJSON() {
    return {
      displayName: this.displayName,
      avatar: this.avatar,
      publicProfile: this.publicProfile,
      biography: this.biography,
      socialLinks: this.socialLinks,
      preferences: this.preferences,
      contact: { ...this.contact },
    }
  }
}
