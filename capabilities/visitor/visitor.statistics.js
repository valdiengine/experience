export class VisitorStatistics {
  static calculate(travelHistory) {
    const {
      totalReservations = 0,
      completedStays = 0,
      cancelledReservations = 0,
      noShowReservations = 0,
      firstReservationDate = null,
      lastReservationDate = null,
      favoriteDestinations = [],
      favoriteAccommodations = [],
      favoriteBusinesses = [],
    } = travelHistory || {}

    return {
      reservationCount: totalReservations,
      completedStays,
      cancellationRate: totalReservations > 0 ? cancelledReservations / totalReservations : 0,
      noShowRate: totalReservations > 0 ? noShowReservations / totalReservations : 0,
      averageStay: this.#calculateAverageStay(travelHistory),
      lifetimeValue: this.#calculateLifetimeValue(travelHistory),
      averageReservation: totalReservations > 0 ? this.#calculateLifetimeValue(travelHistory) / totalReservations : 0,
      favoriteDestination: favoriteDestinations.length > 0 ? favoriteDestinations[0] : null,
      favoriteAccommodation: favoriteAccommodations.length > 0 ? favoriteAccommodations[0] : null,
      favoriteBusiness: favoriteBusinesses.length > 0 ? favoriteBusinesses[0] : null,
      lastActivity: lastReservationDate || null,
      firstActivity: firstReservationDate || null,
    }
  }

  static #calculateAverageStay(travelHistory) {
    if (!travelHistory?.stayDurations || travelHistory.stayDurations.length === 0) return 0
    const sum = travelHistory.stayDurations.reduce((acc, d) => acc + d, 0)
    return sum / travelHistory.stayDurations.length
  }

  static #calculateLifetimeValue(travelHistory) {
    if (!travelHistory?.reservationValues || travelHistory.reservationValues.length === 0) return 0
    return travelHistory.reservationValues.reduce((acc, v) => acc + v, 0)
  }
}
