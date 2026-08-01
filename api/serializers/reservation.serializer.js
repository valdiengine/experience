/**
 * Reservation Serializer
 *
 * Serializes Reservation domain objects to API responses.
 *
 * P14 - API Layer Foundation
 */

export class ReservationSerializer {
  /**
   * Serialize reservation to API response
   * @param {Object} reservation
   * @returns {Object}
   */
  static serialize(reservation) {
    if (!reservation) return null;

    return {
      id: reservation.id,
      businessId: reservation.businessId,
      accommodationId: reservation.accommodationId,
      visitorId: reservation.visitorId,
      guestCount: reservation.guestCount,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      nights: reservation.nights,
      status: reservation.status,
      pricing: this.serializePricing(reservation.pricing),
      guestDetails: this.serializeGuestDetails(reservation.guestDetails),
      specialRequests: reservation.specialRequests,
      confirmedAt: reservation.confirmedAt,
      cancelledAt: reservation.cancelledAt,
      checkedInAt: reservation.checkedInAt,
      checkedOutAt: reservation.checkedOutAt,
      metadata: reservation.metadata,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }

  static serializePricing(pricing) {
    if (!pricing) return null;
    return {
      subtotal: pricing.subtotal,
      cleaningFee: pricing.cleaningFee,
      serviceFee: pricing.serviceFee,
      taxes: pricing.taxes,
      total: pricing.total,
      currency: pricing.currency,
      paidAmount: pricing.paidAmount,
      pendingAmount: pricing.pendingAmount,
    };
  }

  static serializeGuestDetails(guestDetails) {
    if (!guestDetails) return null;
    return {
      firstName: guestDetails.firstName,
      lastName: guestDetails.lastName,
      email: guestDetails.email,
      phone: guestDetails.phone,
    };
  }

  static serializeMany(reservations) {
    return reservations.map(r => this.serialize(r));
  }

  static serializeSummary(reservation) {
    if (!reservation) return null;
    return {
      id: reservation.id,
      accommodationId: reservation.accommodationId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      status: reservation.status,
      total: reservation.pricing?.total,
    };
  }

  static serializeManySummaries(reservations) {
    return reservations.map(r => this.serializeSummary(r));
  }
}
