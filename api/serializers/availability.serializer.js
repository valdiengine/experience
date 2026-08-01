/**
 * Availability Serializer
 *
 * Serializes Availability domain objects to API responses.
 *
 * P14 - API Layer Foundation
 */

export class AvailabilitySerializer {
  /**
   * Serialize availability to API response
   * @param {Object} availability
   * @returns {Object}
   */
  static serialize(availability) {
    if (!availability) return null;

    return {
      id: availability.id,
      accommodationId: availability.accommodationId,
      date: availability.date,
      status: availability.status,
      price: availability.price,
      currency: availability.currency,
      minStay: availability.minStay,
      maxStay: availability.maxStay,
      restrictions: this.serializeRestrictions(availability.restrictions),
      metadata: availability.metadata,
      createdAt: availability.createdAt,
      updatedAt: availability.updatedAt,
    };
  }

  static serializeRestrictions(restrictions) {
    if (!restrictions) return null;
    return {
      checkIn: restrictions.checkIn,
      checkOut: restrictions.checkOut,
      minAdvance: restrictions.minAdvance,
      maxAdvance: restrictions.maxAdvance,
    };
  }

  static serializeMany(availabilities) {
    return availabilities.map(a => this.serialize(a));
  }

  static serializeSummary(availability) {
    if (!availability) return null;
    return {
      id: availability.id,
      accommodationId: availability.accommodationId,
      date: availability.date,
      status: availability.status,
      price: availability.price,
    };
  }

  static serializeManySummaries(availabilities) {
    return availabilities.map(a => this.serializeSummary(a));
  }
}
