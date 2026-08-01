export const DestinationIsolationMixin = (Base) => class extends Base {
  #applyDestinationFilter(query) {
    const destination = this.context?.destination
    if (destination && typeof destination === 'string') return { ...query, destinationId: destination }
    return query
  }
  #validateDestination(entity) {
    const dest = this.context?.destination
    if (!dest) return
    const destId = typeof dest === 'string' ? dest : dest.id
    if (entity.destinationId && entity.destinationId !== destId) {
      throw new Error(`Destination mismatch on ${this.constructor.entityName}`)
    }
  }
}
