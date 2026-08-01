/**
 * Availability Manager — Parses natural language dates into structured data
 *
 * Transforms messages like:
 * - "Libre del 10 al 15 de enero"
 * - "Todo febrero excepto carnaval"
 * - "Fines de semana disponibles"
 *
 * Into structured availability entries
 */
import { AVAILABILITY_STATUS } from './availability.status.js'

const MONTHS_ES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

export class AvailabilityParser {
  /**
   * Parse natural language availability message
   * @param {string} message - Natural language message
   * @param {number} year - Year for the dates (default: current year)
   * @returns {{ dates: object[], errors: string[] }}
   */
  static parse(message, year = new Date().getFullYear()) {
    if (!message || typeof message !== 'string') {
      return { dates: [], errors: ['Empty message'] }
    }

    const normalized = message.toLowerCase().trim()
    const dates = []
    const errors = []

    // Pattern: "Libre del X al Y de mes"
    const rangePattern = /(?:libre|disponible|disponibles)?\s*(?:del?\s+)?(\d{1,2})\s*(?:al|hasta|a)\s*(\d{1,2})\s*(?:de\s+)?(\w+)/gi
    let match

    while ((match = rangePattern.exec(normalized)) !== null) {
      const startDay = parseInt(match[1])
      const endDay = parseInt(match[2])
      const monthName = match[3].toLowerCase()
      const month = MONTHS_ES[monthName]

      if (month === undefined) {
        errors.push(`Unknown month: ${match[3]}`)
        continue
      }

      const range = this.#generateDateRange(year, month, startDay, endDay)
      dates.push(...range)
    }

    // Pattern: "Todo mes excepto X"
    const fullMonthPattern = /todo\s+(\w+)(?:\s+excepto\s+(.+))?/gi
    while ((match = fullMonthPattern.exec(normalized)) !== null) {
      const monthName = match[1].toLowerCase()
      const month = MONTHS_ES[monthName]
      const exceptions = match[2] ? this.#parseExceptions(match[2], year) : []

      if (month === undefined) {
        errors.push(`Unknown month: ${match[1]}`)
        continue
      }

      const daysInMonth = new Date(year, month + 1, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const isException = exceptions.some(e => e.date === dateStr)

        if (!isException) {
          dates.push({
            date: dateStr,
            status: AVAILABILITY_STATUS.AVAILABLE,
          })
        }
      }
    }

    // Pattern: "Fines de semana disponibles"
    const weekendPattern = /fines?\s+de\s+semana\s+disponibles?/gi
    if (weekendPattern.test(normalized)) {
      const weekends = this.#generateWeekends(year)
      dates.push(...weekends)
    }

    // Pattern: "Excepto carnaval" / "Excepto festivos"
    const exceptionPattern = /excepto\s+(carnaval|festivos?|feriados?)/gi
    const exceptions = []
    while ((match = exceptionPattern.exec(normalized)) !== null) {
      exceptions.push(match[1].toLowerCase())
    }

    // Remove exceptions from dates
    const filteredDates = dates.filter(d => {
      return !exceptions.some(exc => this.#isException(d.date, exc))
    })

    return { dates: filteredDates, errors }
  }

  /**
   * Generate date range
   * @private
   */
  static #generateDateRange(year, month, startDay, endDay) {
    const dates = []
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const start = Math.min(startDay, daysInMonth)
    const end = Math.min(endDay, daysInMonth)

    for (let day = start; day <= end; day++) {
      dates.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        status: AVAILABILITY_STATUS.AVAILABLE,
      })
    }

    return dates
  }

  /**
   * Generate weekends for a year
   * @private
   */
  static #generateWeekends(year) {
    const dates = []
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dates.push({
          date: d.toISOString().split('T')[0],
          status: AVAILABILITY_STATUS.AVAILABLE,
        })
      }
    }

    return dates
  }

  /**
   * Parse exceptions text
   * @private
   */
  static #parseExceptions(text, year) {
    const exceptions = []
    const dayPattern = /(\d{1,2})\s*(?:de\s+)?(\w+)?/gi
    let match

    while ((match = dayPattern.exec(text)) !== null) {
      const day = parseInt(match[1])
      const monthName = match[2]?.toLowerCase()
      const month = monthName ? MONTHS_ES[monthName] : new Date().getMonth()

      if (month !== undefined) {
        exceptions.push({
          date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        })
      }
    }

    return exceptions
  }

  /**
   * Check if date matches exception type
   * @private
   */
  static #isException(dateStr, exceptionType) {
    const date = new Date(dateStr + 'T00:00:00')

    if (exceptionType === 'carnaval') {
      const month = date.getMonth()
      const day = date.getDate()
      return month === 1 && day >= 20 && day <= 25
    }

    if (exceptionType === 'festivo' || exceptionType === 'festivos' || exceptionType === 'feriado') {
      const month = date.getMonth()
      const day = date.getDate()
      const holidays = [
        [0, 1], [4, 1], [5, 25], [7, 15], [9, 12], [11, 25],
      ]
      return holidays.some(([m, d]) => month === m && day === d)
    }

    return false
  }
}
