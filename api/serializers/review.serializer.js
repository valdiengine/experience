/**
 * Review Serializer
 *
 * Serializes Review domain objects to API responses.
 *
 * P14 - API Layer Foundation
 */

export class ReviewSerializer {
  /**
   * Serialize review to API response
   * @param {Object} review
   * @returns {Object}
   */
  static serialize(review) {
    if (!review) return null;

    return {
      id: review.id,
      businessId: review.businessId,
      accommodationId: review.accommodationId,
      reservationId: review.reservationId,
      visitorId: review.visitorId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      categories: this.serializeCategories(review.categories),
      status: review.status,
      verified: review.verified,
      respondedAt: review.respondedAt,
      response: review.response,
      metadata: review.metadata,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  static serializeCategories(categories) {
    if (!categories) return null;
    return {
      cleanliness: categories.cleanliness,
      accuracy: categories.accuracy,
      checkIn: categories.checkIn,
      communication: categories.communication,
      location: categories.location,
      value: categories.value,
    };
  }

  static serializeMany(reviews) {
    return reviews.map(r => this.serialize(r));
  }

  static serializeSummary(review) {
    if (!review) return null;
    return {
      id: review.id,
      accommodationId: review.accommodationId,
      rating: review.rating,
      title: review.title,
      status: review.status,
      createdAt: review.createdAt,
    };
  }

  static serializeManySummaries(reviews) {
    return reviews.map(r => this.serializeSummary(r));
  }
}
