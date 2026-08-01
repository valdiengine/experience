export function createVisitorSchema(data) {
  return {
    id: data.id || null,
    status: data.status || 'anonymous',

    identityId: data.identityId || null,
    identityProvider: data.identityProvider || null,

    profile: {
      fullName: data.profile?.fullName || null,
      preferredName: data.profile?.preferredName || null,
      avatar: data.profile?.avatar || null,
      biography: data.profile?.biography || null,
      language: data.profile?.language || null,
      timezone: data.profile?.timezone || null,
      currency: data.profile?.currency || null,
      country: data.profile?.country || null,
      city: data.profile?.city || null,
      phone: data.profile?.phone || null,
      email: data.profile?.email || null,
      emergencyContact: data.profile?.emergencyContact || null,
    },

    marketing: {
      consent: data.marketing?.consent ?? false,
      consentDate: data.marketing?.consentDate || null,
      channels: data.marketing?.channels || [],
    },

    travelHistory: {
      totalReservations: data.travelHistory?.totalReservations ?? 0,
      completedStays: data.travelHistory?.completedStays ?? 0,
      cancelledReservations: data.travelHistory?.cancelledReservations ?? 0,
      noShowReservations: data.travelHistory?.noShowReservations ?? 0,
      firstReservationDate: data.travelHistory?.firstReservationDate || null,
      lastReservationDate: data.travelHistory?.lastReservationDate || null,
      favoriteDestinations: data.travelHistory?.favoriteDestinations || [],
      favoriteAccommodations: data.travelHistory?.favoriteAccommodations || [],
      favoriteBusinesses: data.travelHistory?.favoriteBusinesses || [],
    },

    trust: {
      trustScore: data.trust?.trustScore ?? 0,
      verified: data.trust?.verified ?? false,
      verifiedDate: data.trust?.verifiedDate || null,
      blacklisted: data.trust?.blacklisted ?? false,
      blacklistReason: data.trust?.blacklistReason || null,
      blacklistedAt: data.trust?.blacklistedAt || null,
    },

    preferences: {
      language: data.preferences?.language || null,
      currency: data.preferences?.currency || null,
      notifications: data.preferences?.notifications ?? true,
      marketingConsent: data.preferences?.marketingConsent ?? false,
      accessibility: data.preferences?.accessibility || null,
      theme: data.preferences?.theme || 'light',
      searchPreferences: data.preferences?.searchPreferences || {},
      privacySettings: data.preferences?.privacySettings || {},
      communicationChannels: data.preferences?.communicationChannels || [],
    },

    tags: data.tags || [],
    metadata: data.metadata || {},

    tenantId: data.tenantId || null,
    destinationIds: data.destinationIds || [],

    createdBy: data.createdBy || null,
    updatedBy: data.updatedBy || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}
