export class AvailabilityCalendar {
  static expandRange(startDate, endDate) {
    const dates = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  static mergeRanges(ranges) {
    if (ranges.length === 0) return []
    const sorted = [...ranges].sort((a, b) => new Date(a.start) - new Date(b.start))
    const merged = [sorted[0]]
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1]
      const current = sorted[i]
      if (new Date(current.start) <= new Date(last.end)) {
        last.end = current.end > last.end ? current.end : last.end
      } else {
        merged.push(current)
      }
    }
    return merged
  }

  static splitRange(start, end, splitDates) {
    const segments = []
    let currentStart = new Date(start)
    const rangeEnd = new Date(end)

    const splits = [...splitDates].map((d) => new Date(d)).sort((a, b) => a - b)

    for (const split of splits) {
      if (split > currentStart && split <= rangeEnd) {
        const segEnd = new Date(split)
        segEnd.setDate(segEnd.getDate() - 1)
        if (segEnd >= currentStart) {
          segments.push({
            start: currentStart.toISOString().split('T')[0],
            end: segEnd.toISOString().split('T')[0],
          })
        }
        currentStart = new Date(split)
      }
    }

    if (currentStart <= rangeEnd) {
      segments.push({
        start: currentStart.toISOString().split('T')[0],
        end: rangeEnd.toISOString().split('T')[0],
      })
    }

    return segments
  }

  static detectOverlap(rangeA, rangeB) {
    const aStart = new Date(rangeA.start)
    const aEnd = new Date(rangeA.end)
    const bStart = new Date(rangeB.start)
    const bEnd = new Date(rangeB.end)
    return aStart < bEnd && aEnd > bStart
  }

  static detectGaps(sortedRanges) {
    const gaps = []
    for (let i = 1; i < sortedRanges.length; i++) {
      const prev = sortedRanges[i - 1]
      const curr = sortedRanges[i]
      const prevEnd = new Date(prev.end)
      const currStart = new Date(curr.start)
      const gapDays = Math.floor((currStart - prevEnd) / (1000 * 60 * 60 * 24)) - 1
      if (gapDays > 0) {
        const gapStart = new Date(prevEnd)
        gapStart.setDate(gapStart.getDate() + 1)
        const gapEnd = new Date(currStart)
        gapEnd.setDate(gapEnd.getDate() - 1)
        gaps.push({
          start: gapStart.toISOString().split('T')[0],
          end: gapEnd.toISOString().split('T')[0],
          days: gapDays,
        })
      }
    }
    return gaps
  }

  static calculateAvailability(dates, reservations, blocks) {
    const booked = new Set()
    for (const res of reservations) {
      const resDates = this.expandRange(res.checkIn, res.checkOut)
      for (const d of resDates) booked.add(d)
    }
    for (const block of blocks) {
      const blockDates = this.expandRange(block.startDate, block.endDate)
      for (const d of blockDates) booked.add(d)
    }

    return dates.map((d) => ({
      date: d,
      available: !booked.has(d),
      status: booked.has(d) ? 'blocked' : 'available',
    }))
  }

  static calculateOccupancy(dates, reservations) {
    if (dates.length === 0) return 0
    const booked = new Set()
    for (const res of reservations) {
      const resDates = this.expandRange(res.checkIn, res.checkOut)
      for (const d of resDates) booked.add(d)
    }
    return Math.round((booked.size / dates.length) * 100)
  }

  static findFreePeriods(dates, reservations, blocks) {
    const availability = this.calculateAvailability(dates, reservations, blocks)
    const freePeriods = []
    let currentStart = null

    for (const day of availability) {
      if (day.available) {
        if (!currentStart) currentStart = day.date
      } else {
        if (currentStart) {
          freePeriods.push({ start: currentStart, end: day.date })
          currentStart = null
        }
      }
    }
    if (currentStart) {
      freePeriods.push({ start: currentStart, end: availability[availability.length - 1].date })
    }

    return freePeriods
  }

  static findBlockedPeriods(dates, reservations, blocks) {
    const availability = this.calculateAvailability(dates, reservations, blocks)
    const blocked = []
    let currentStart = null

    for (const day of availability) {
      if (!day.available) {
        if (!currentStart) currentStart = day.date
      } else {
        if (currentStart) {
          blocked.push({ start: currentStart, end: day.date })
          currentStart = null
        }
      }
    }
    if (currentStart) {
      blocked.push({ start: currentStart, end: availability[availability.length - 1].date })
    }

    return blocked
  }

  static normalize(startDate, endDate, entries) {
    const allDates = this.expandRange(startDate, endDate)
    const dateMap = {}
    for (const d of allDates) dateMap[d] = { date: d, status: 'available', source: null }

    for (const entry of entries) {
      const entryDates = this.expandRange(entry.startDate || entry.date, entry.endDate || entry.date)
      for (const d of entryDates) {
        if (dateMap[d]) {
          dateMap[d] = { date: d, status: entry.status || 'blocked', source: entry.source || entry.type || null }
        }
      }
    }

    return allDates.map((d) => dateMap[d])
  }
}
