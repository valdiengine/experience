/**
 * Accommodation Serializer
 *
 * Serializes Accommodation domain objects to API responses.
 *
 * P14 - API Layer Foundation
 */

export class AccommodationSerializer {
  /**
   * Serialize an accommodation to API response
   * @param {Object} accommodation
   * @returns {Object}
   */
  static serialize(accommodation) {
    if (!accommodation) return null;

    return {
      id: accommodation.id,
      businessId: accommodation.businessId,
      name: accommodation.name,
      slug: accommodation.slug,
      description: accommodation.description,
      type: accommodation.type,
      category: accommodation.category,
      capacity: this.serializeCapacity(accommodation.capacity),
      pricing: this.serializePricing(accommodation.pricing),
      amenities: accommodation.amenities,
      images: accommodation.images,
      location: this.serializeLocation(accommodation.location),
      policies: accommodation.policies,
      status: accommodation.status,
      publishedAt: accommodation.publishedAt,
      metadata: accommodation.metadata,
      createdAt: accommodation.createdAt,
      updatedAt: accommodation.updatedAt,
    };
  }

  static serializeCapacity(capacity) {
    if (!capacity) return null;
    return {
      adults: capacity.adults,
      children: capacity.children,
      infants: capacity.infants,
      total: capacity.total,
    };
  }

  static serializePricing(pricing) {
    if (!pricing) return null;
    return {
      basePrice: pricing.basePrice,
      currency: pricing.currency,
      cleaningFee: pricing.cleaningFee,
      serviceFee: pricing.serviceFee,
      taxes: pricing.taxes,
    };
  }

  static serializeLocation(location) {
    if (!location) return null;
    return {
      address: location.address,
      coordinates: location.coordinates,
      instructions: location.instructions,
    };
  }

  static serializeMany(accommodations) {
    return accommodations.map(a => this.serialize(a));
  }

  static serializeSummary(accommodation) {
    if (!accommodation) return null;
    return {
      id: accommodation.id,
      businessId: accommodation.businessId,
      name: accommodation.name,
      type: accommodation.type,
      status: accommodation.status,
    };
  }

  static serializeManySummaries(accommodations) {
    return accommodations.map(a => this.serializeSummary(a));
  }
}
