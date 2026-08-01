/**
 * Payment Serializer
 *
 * Serializes Payment domain objects to API responses.
 *
 * P14 - API Layer Foundation
 */

export class PaymentSerializer {
  /**
   * Serialize payment to API response
   * @param {Object} payment
   * @returns {Object}
   */
  static serialize(payment) {
    if (!payment) return null;

    return {
      id: payment.id,
      reservationId: payment.reservationId,
      visitorId: payment.visitorId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      provider: payment.provider,
      providerTransactionId: payment.providerTransactionId,
      refundedAmount: payment.refundedAmount,
      processedAt: payment.processedAt,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  static serializeMany(payments) {
    return payments.map(p => this.serialize(p));
  }

  static serializeSummary(payment) {
    if (!payment) return null;
    return {
      id: payment.id,
      reservationId: payment.reservationId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    };
  }

  static serializeManySummaries(payments) {
    return payments.map(p => this.serializeSummary(p));
  }
}
