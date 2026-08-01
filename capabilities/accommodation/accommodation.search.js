export class AccommodationSearch {
  static toPayload(accommodation) {
    return {
      id: accommodation.id,
      title: accommodation.title,
      slug: accommodation.slug,
      description: accommodation.description,
      status: accommodation.status,
      type: 'accommodation',
      tenant_id: accommodation.tenantId,
      destination_id: accommodation.destinationId,
      business_id: accommodation.businessId,
      business_name: accommodation.businessName || null,
      business_slug: accommodation.businessSlug || null,
      capacity: accommodation.capacity,
      price: accommodation.pricing?.basePrice || 0,
      currency: accommodation.pricing?.currency || 'CLP',
      coordinates: accommodation.coordinates || null,
      location: accommodation.location || null,
      amenities: accommodation.amenities || [],
      featured: accommodation.featured || false,
      featured_media: accommodation.featuredMediaId || null,
      accommodation_type: accommodation.accommodationType || null,
      created_at: accommodation.createdAt,
      updated_at: accommodation.updatedAt,
      published_at: accommodation.publishedAt,
    }
  }
}
