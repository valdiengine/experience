/**
 * Business Serializer
 *
 * Serializes Business domain objects to API responses.
 *
 * P14 - API Layer Foundation
 */

export class BusinessSerializer {
  /**
   * Serialize a business to API response
   * @param {Object} business
   * @returns {Object}
   */
  static serialize(business) {
    if (!business) return null;

    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      description: business.description,
      email: business.email,
      phone: business.phone,
      website: business.website,
      address: this.serializeAddress(business.address),
      settings: business.settings,
      status: business.status,
      metadata: business.metadata,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }

  /**
   * Serialize business address
   * @param {Object} address
   * @returns {Object|null}
   */
  static serializeAddress(address) {
    if (!address) return null;

    return {
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      coordinates: address.coordinates,
    };
  }

  /**
   * Serialize a list of businesses
   * @param {Array} businesses
   * @returns {Array}
   */
  static serializeMany(businesses) {
    return businesses.map(b => this.serialize(b));
  }

  /**
   * Serialize for list response (minimal fields)
   * @param {Object} business
   * @returns {Object}
   */
  static serializeSummary(business) {
    if (!business) return null;

    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      status: business.status,
    };
  }

  /**
   * Serialize list of summaries
   * @param {Array} businesses
   * @returns {Array}
   */
  static serializeManySummaries(businesses) {
    return businesses.map(b => this.serializeSummary(b));
  }
}
