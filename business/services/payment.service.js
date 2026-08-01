/**
 * Business Services — Payment Service
 *
 * Thin orchestration layer between billing capability and UI/workflows
 * Business-agnostic: no knowledge of what is being paid for
 */
export class PaymentService {
  #capabilities = null

  constructor(capabilities) {
    this.#capabilities = capabilities
  }

  async createInvoice(data) {
    const billing = this.#capabilities.get('billing')
    return billing?.createInvoice({
      tenantId: data.tenantId,
      amount: data.amount,
      description: data.description,
      customer: data.customer,
      metadata: data.metadata,
    })
  }

  async processPayment(data) {
    const billing = this.#capabilities.get('billing')
    return billing?.processPayment({
      tenantId: data.tenantId,
      invoiceId: data.invoiceId,
      amount: data.amount,
      method: data.method,
      provider: data.provider,
    })
  }

  getStatus(tenantId, paymentId) {
    const billing = this.#capabilities.get('billing')
    return billing?.getPaymentStatus(tenantId, paymentId) || null
  }

  async refund(tenantId, paymentId, amount) {
    const billing = this.#capabilities.get('billing')
    return billing?.refundPayment(tenantId, paymentId, amount)
  }

  getTransactions(tenantId, filters) {
    const billing = this.#capabilities.get('billing')
    return billing?.getTransactions(tenantId, filters) || []
  }
}
