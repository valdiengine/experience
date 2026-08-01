export const RULE_TYPES = {
  MIN_STAY: 'min_stay',
  MAX_STAY: 'max_stay',
  ADVANCE_BOOKING: 'advance_booking',
  SAME_DAY_BOOKING: 'same_day_booking',
  ARRIVAL_WEEKDAYS: 'arrival_weekdays',
  DEPARTURE_WEEKDAYS: 'departure_weekdays',
  BLACKOUT_PERIODS: 'blackout_periods',
  MAINTENANCE: 'maintenance',
  MANUAL_OVERRIDE: 'manual_override',
  DYNAMIC_PRICE: 'dynamic_price',
}

export class AvailabilityRuleEngine {
  #rules

  constructor(rules = []) {
    this.#rules = [...rules]
  }

  addRule(rule) {
    this.#rules.push(rule)
  }

  removeRule(ruleId) {
    this.#rules = this.#rules.filter((r) => r.id !== ruleId)
  }

  getRules() {
    return [...this.#rules]
  }

  getRulesByType(type) {
    return this.#rules.filter((r) => r.type === type)
  }

  clear() {
    this.#rules = []
  }

  evaluate(checkIn, checkOut, context = {}) {
    const violations = []
    const sorted = [...this.#rules].sort((a, b) => (b.priority || 0) - (a.priority || 0))
    for (const rule of sorted) {
      if (!rule.active) continue
      const result = rule.evaluate(checkIn, checkOut, context)
      if (!result.passed) {
        violations.push({ rule: rule.id || rule.type, reason: result.reason, priority: rule.priority })
      }
    }
    return { passed: violations.length === 0, violations }
  }

  isDateBlocked(date, context = {}) {
    for (const rule of this.#rules) {
      if (!rule.active) continue
      if (rule.type === RULE_TYPES.BLACKOUT_PERIODS || rule.type === RULE_TYPES.MAINTENANCE || rule.type === RULE_TYPES.MANUAL_OVERRIDE) {
        if (rule.matchesDate(date, context)) return true
      }
    }
    return false
  }
}

export function createMinStayRule(minDays) {
  return {
    id: `min_stay_${Date.now()}`,
    type: RULE_TYPES.MIN_STAY,
    value: minDays,
    priority: 100,
    active: true,
    evaluate(checkIn, checkOut) {
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      const nights = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)))
      const passed = nights >= this.value
      return { passed, reason: passed ? null : `Minimum stay is ${this.value} nights` }
    },
    matchesDate() { return false },
  }
}

export function createMaxStayRule(maxDays) {
  return {
    id: `max_stay_${Date.now()}`,
    type: RULE_TYPES.MAX_STAY,
    value: maxDays,
    priority: 100,
    active: true,
    evaluate(checkIn, checkOut) {
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      const nights = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)))
      const passed = nights <= this.value
      return { passed, reason: passed ? null : `Maximum stay is ${this.value} nights` }
    },
    matchesDate() { return false },
  }
}

export function createAdvanceBookingRule(maxDaysInAdvance) {
  return {
    id: `advance_booking_${Date.now()}`,
    type: RULE_TYPES.ADVANCE_BOOKING,
    value: maxDaysInAdvance,
    priority: 50,
    active: true,
    evaluate(checkIn) {
      const now = new Date()
      const checkInDate = new Date(checkIn)
      const diffDays = Math.floor((checkInDate - now) / (1000 * 60 * 60 * 24))
      const passed = diffDays <= this.value
      return { passed, reason: passed ? null : `Can only book up to ${this.value} days in advance` }
    },
    matchesDate() { return false },
  }
}

export function createArrivalWeekdaysRule(allowedWeekdays) {
  return {
    id: `arrival_weekdays_${Date.now()}`,
    type: RULE_TYPES.ARRIVAL_WEEKDAYS,
    value: allowedWeekdays,
    priority: 75,
    active: true,
    evaluate(checkIn) {
      const day = new Date(checkIn).getDay()
      const passed = this.value.includes(day)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const allowed = this.value.map((d) => dayNames[d]).join(', ')
      return { passed, reason: passed ? null : `Arrival only allowed on: ${allowed}` }
    },
    matchesDate() { return false },
  }
}

export function createDepartureWeekdaysRule(allowedWeekdays) {
  return {
    id: `departure_weekdays_${Date.now()}`,
    type: RULE_TYPES.DEPARTURE_WEEKDAYS,
    value: allowedWeekdays,
    priority: 75,
    active: true,
    evaluate(checkIn, checkOut) {
      const day = new Date(checkOut).getDay()
      const passed = this.value.includes(day)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const allowed = this.value.map((d) => dayNames[d]).join(', ')
      return { passed, reason: passed ? null : `Departure only allowed on: ${allowed}` }
    },
    matchesDate() { return false },
  }
}

export function createBlackoutPeriodsRule(periods) {
  return {
    id: `blackout_${Date.now()}`,
    type: RULE_TYPES.BLACKOUT_PERIODS,
    value: periods,
    priority: 200,
    active: true,
    evaluate(checkIn, checkOut) {
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      for (const period of this.value) {
        const pStart = new Date(period.start)
        const pEnd = new Date(period.end)
        if (start < pEnd && end > pStart) {
          return { passed: false, reason: period.reason || 'Date range falls within a blackout period' }
        }
      }
      return { passed: true, reason: null }
    },
    matchesDate(date) {
      const d = new Date(date)
      for (const period of this.value) {
        const pStart = new Date(period.start)
        const pEnd = new Date(period.end)
        if (d >= pStart && d <= pEnd) return true
      }
      return false
    },
  }
}

export function createMaintenanceRule(periods) {
  return {
    id: `maintenance_${Date.now()}`,
    type: RULE_TYPES.MAINTENANCE,
    value: periods,
    priority: 250,
    active: true,
    evaluate(checkIn, checkOut) {
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      for (const period of this.value) {
        const pStart = new Date(period.start)
        const pEnd = new Date(period.end)
        if (start < pEnd && end > pStart) {
          return { passed: false, reason: period.reason || 'Date range falls within a maintenance period' }
        }
      }
      return { passed: true, reason: null }
    },
    matchesDate(date) {
      const d = new Date(date)
      for (const period of this.value) {
        const pStart = new Date(period.start)
        const pEnd = new Date(period.end)
        if (d >= pStart && d <= pEnd) return true
      }
      return false
    },
  }
}

export function createOverrideRule(periods) {
  return {
    id: `override_${Date.now()}`,
    type: RULE_TYPES.MANUAL_OVERRIDE,
    value: periods,
    priority: 300,
    active: true,
    evaluate() {
      return { passed: true, reason: null }
    },
    matchesDate(date) {
      const d = new Date(date)
      for (const period of this.value) {
        const pStart = new Date(period.start)
        const pEnd = new Date(period.end)
        if (d >= pStart && d <= pEnd) return true
      }
      return false
    },
  }
}
