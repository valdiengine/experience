export class VisitorSearch {
  static toPayload(visitor) {
    return {
      id: visitor.id,
      type: 'visitor',
      tenant_id: visitor.tenantId,

      full_name: visitor.profile?.fullName || null,
      email: visitor.profile?.email || null,
      phone: visitor.profile?.phone || null,
      city: visitor.profile?.city || null,
      country: visitor.profile?.country || null,
      language: visitor.profile?.language || null,
      currency: visitor.profile?.currency || null,

      vip: visitor.status === 'vip',
      trust_score: visitor.trust?.trustScore || 0,
      reservation_count: visitor.travelHistory?.totalReservations || 0,
      completed_stays: visitor.travelHistory?.completedStays || 0,
      last_visit: visitor.travelHistory?.lastReservationDate || null,
      favorite_destinations: visitor.travelHistory?.favoriteDestinations || [],
      favorite_businesses: visitor.travelHistory?.favoriteBusinesses || [],
      tags: visitor.tags || [],
      status: visitor.status,

      identity_id: visitor.identityId || null,
      identity_provider: visitor.identityProvider || null,

      created_at: visitor.createdAt,
      updated_at: visitor.updatedAt,
    }
  }
}
