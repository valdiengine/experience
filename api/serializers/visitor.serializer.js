/**
 * Visitor Serializer
 *
 * Serializes Visitor domain objects to API responses.
 *
 * P14 - API Layer Foundation
 */

export class VisitorSerializer {
  /**
   * Serialize visitor to API response
   * @param {Object} visitor
   * @returns {Object}
   */
  static serialize(visitor) {
    if (!visitor) return null;

    return {
      id: visitor.id,
      businessId: visitor.businessId,
      email: visitor.email,
      phone: visitor.phone,
      firstName: visitor.firstName,
      lastName: visitor.lastName,
      type: visitor.type,
      status: visitor.status,
      verifiedAt: visitor.verifiedAt,
      metadata: visitor.metadata,
      preferences: visitor.preferences,
      createdAt: visitor.createdAt,
      updatedAt: visitor.updatedAt,
    };
  }

  static serializeMany(visitors) {
    return visitors.map(v => this.serialize(v));
  }

  static serializeSummary(visitor) {
    if (!visitor) return null;
    return {
      id: visitor.id,
      firstName: visitor.firstName,
      lastName: visitor.lastName,
      email: visitor.email,
      status: visitor.status,
    };
  }

  static serializeManySummaries(visitors) {
    return visitors.map(v => this.serializeSummary(v));
  }
}
