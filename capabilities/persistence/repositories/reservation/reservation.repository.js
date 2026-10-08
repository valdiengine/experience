import { BaseRepository } from '../../contracts/base.repository.js'
import { query, transaction } from '../../../../database/connection/postgres.connection.js'
import { AvailabilityConflictError, AvailabilityConsumptionRecordError } from '../../../availability/availability.errors.js'
import { RepositoryConfigurationError, RepositoryValidationError } from '../../errors/repository.errors.js'

/**
 * Reserved, server-owned key inside a reservation line's metadata.
 *
 * Holds the exact occupied dates consumed for that line, the expansion version
 * that produced them, and the inventory quantity actually consumed. Naming
 * checked against existing line metadata usage: callers write unrelated keys
 * only, and no other reserved key convention exists in this codebase, so this
 * key is introduced here. Unrelated caller keys are preserved untouched.
 */
const RESERVED_OCCUPIED_NIGHTS_KEY = '__occupiedNights'

/**
 * Consumption record versions this repository can both write and release.
 *
 * A provider whose expansion version is not an exact member of this set is
 * rejected before any transaction opens or any mock state is touched, so a line
 * can never be written with a record this repository would later be unable to
 * release. Membership is exact: 2, 0, negative, missing and malformed versions
 * are all refused.
 */
const SUPPORTED_CONSUMPTION_RECORD_VERSIONS = Object.freeze([1])

/** Strict calendar date shape. Record dates must match it exactly. */
const STRICT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * The APPROVED source -> target pairs for an expiration, and the whole of it.
 *
 * BOOKING-EXPIRATION-ATOMIC-1. Two independent allow-lists — "these targets are
 * terminal" and "these sources are expirable" — admit every cross product, so
 * `requested -> no_response` and `owner_pending -> expired` both passed while
 * being unapproved combinations. The pair is the approved unit, so it is
 * declared as ONE map and validated as one pair: the target must be the value
 * this source maps to. Any other combination is refused at the repository
 * boundary, before any write or release, on both adapter paths.
 *
 * This mirrors `EXPIRATION_TARGETS` in reservation.workflow.js, which is
 * already a source -> target map. It is duplicated here as a literal rather than
 * imported because importing from `capabilities/reservation` into
 * `capabilities/persistence` would be a cross-capability import (see the
 * capability-context note above), and because this file already names domain
 * tables and statuses as literals. The two are asserted equal, pair by pair, by
 * the focused test suite, so a divergence is caught rather than silent.
 *
 * These are terminal outcomes only, so `cancelled` is absent by construction:
 * expiration cannot express a cancellation even indirectly.
 */
const EXPIRATION_TRANSITIONS = Object.freeze({
  requested: 'expired',
  owner_pending: 'no_response',
  payment_pending: 'expired',
})

/**
 * The pristine Map mutation method, captured at module load.
 *
 * BOOKING-MOCK-CANCEL-ATOMIC-1. Rollback of a mock cancellation must not be
 * defeatable by a failure injected on the publication path. Publication calls
 * the table's own `set`, so a caller (or a test) can make exactly one of those
 * writes throw by replacing that method. Restore therefore does NOT go through
 * the table: it calls Map.prototype.set directly, which an instance-level
 * override cannot intercept.
 */
const RAW_MAP_SET = Map.prototype.set

export class ReservationRepository extends BaseRepository {
  static entityName = 'reservation'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination', 'business', 'accommodation']
  static readOnly = false
  static aggregate = true
  static cacheable = true
  static searchable = true
  static softDeletable = true

  /**
   * Expand date range from temporal.startDate (check-in, inclusive) to
   * temporal.endDate (check-out, exclusive).
   *
   * ISOLATED LEGACY ARITHMETIC — BOOKING-CALENDAR-UTC-1.
   *
   * This method intentionally preserves its pre-BOOKING-CALENDAR-UTC-1 behaviour,
   * including the local-time checkout adjustment above and the local-time
   * iteration below, and it no longer calls AvailabilityCalendar.expandRange.
   * That dependency was removed deliberately. The shared calendar was corrected
   * to use UTC arithmetic, and because this method delegated to it, correcting
   * the calendar silently changed the output of this historical path.
   *
   * The original expandRange body is reproduced verbatim in
   * #legacyLocalExpandRange for that reason alone. This is a compatibility
   * freeze, NOT a claim that the arithmetic is correct, and NOT evidence that
   * releasing historical reservations is safe or approved for deployment. The
   * local-time iteration remains timezone-dependent.
   *
   * As of BOOKING-LEGACY-RELEASE-GATE-1 this is no longer reachable from any
   * release path: a DATE_RANGE line without a versioned occupied-night record is
   * refused at #resolveRecordedReleaseDates, so the historical-release deployment
   * gate recorded in
   * docs/ai/BOOKING_OCCUPIED_NIGHTS_1B_IMPLEMENTATION_REPORT.md is now resolved
   * by refusal rather than by trusting these bounds. What remains reachable is
   * #prepareNewLineConsumption for a NON-DATE_RANGE line at creation time, which
   * is unchanged. The arithmetic itself must not be "improved" here.
   *
   * @param {object} temporal - { mode, startDate, endDate }
   * @returns {string[]} Array of date strings 'YYYY-MM-DD'
   */
  #expandDateRange(temporal) {
    if (!temporal?.startDate || !temporal?.endDate) return []
    const endDate = new Date(temporal.endDate)
    endDate.setDate(endDate.getDate() - 1)
    return this.#legacyLocalExpandRange(
      temporal.startDate,
      endDate.toISOString().split('T')[0]
    )
  }

  /**
   * Verbatim copy of AvailabilityCalendar.expandRange as it stood before
   * BOOKING-CALENDAR-UTC-1, kept private to this repository so the historical
   * path can no longer drift when the shared calendar changes.
   *
   * Do not reuse it for anything new. Do not route versioned occupied-night
   * records through it: a recorded line is validated and released by
   * #validateConsumptionRecord, not by this arithmetic. Do not treat its output
   * as correct.
   */
  #legacyLocalExpandRange(startDate, endDate) {
    const dates = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  /**
   * Resolve the availability capability through the capability context.
   *
   * agent.md 2.5 and 2.6 forbid direct imports between peers, so the occupied-night
   * derivation is reached only through context.capabilities.get('availability')
   * and its narrow public method. No sibling import of the helper is introduced
   * and no expansion logic is duplicated here.
   *
   * Throws before any mutation when the capability, the method or the version is
   * absent, so a mis-wired deployment cannot silently skip recording consumption.
   *
   * @returns {object} the availability capability
   */
  #requireOccupiedNightsProvider() {
    const availability = this.context?.capabilities?.get?.('availability')
    const base = { entityName: this.constructor.entityName }
    if (!availability) {
      throw new RepositoryConfigurationError(
        'ReservationRepository requires the availability capability context to derive occupied nights',
        { ...base, configKey: 'capabilities.availability' }
      )
    }
    if (typeof availability.expandOccupiedNights !== 'function') {
      throw new RepositoryConfigurationError(
        'The availability capability does not expose expandOccupiedNights',
        { ...base, configKey: 'capabilities.availability.expandOccupiedNights' }
      )
    }
    const version = availability.occupiedNightsExpansionVersion
    if (!SUPPORTED_CONSUMPTION_RECORD_VERSIONS.includes(version)) {
      throw new RepositoryConfigurationError(
        'The availability capability reports an occupiedNightsExpansionVersion this repository cannot release',
        {
          ...base,
          configKey: 'capabilities.availability.occupiedNightsExpansionVersion',
          reportedVersion: version === undefined ? null : version,
          supportedVersions: [...SUPPORTED_CONSUMPTION_RECORD_VERSIONS],
        }
      )
    }
    // The accepted version is captured once here and reused for the record, so the
    // written version is exactly the one that was checked for releasability.
    return Object.freeze({ availability, version })
  }

  /**
   * Inventory quantity for a new DATE_RANGE line.
   *
   * Strictly validated rather than coerced. The previous `lineData.quantity || 1`
   * silently turned 0 into 1 and passed non-numeric values through, which would
   * make the persisted record and the later release disagree with what was asked
   * for. The value is never defaulted and never derived from guestCount here; the
   * accommodation caller already passes 1 independently of guest count, and this
   * generic repository must not hardcode 1 for other quantities.
   *
   * @param {object} lineData
   * @returns {number} a positive safe integer
   */
  #requireInventoryQuantity(lineData) {
    const raw = lineData?.quantity
    if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 1) {
      throw new RepositoryValidationError(
        'Reservation line quantity must be a positive safe integer',
        { entityName: this.constructor.entityName, field: 'quantity', received: raw === undefined ? null : raw }
      )
    }
    return raw
  }

  /**
   * Line quantity across temporal modes.
   *
   * DATE_RANGE lines are strictly validated because their quantity is recorded
   * and later released against it. Any other mode keeps the previous coercion
   * untouched, so this slice does not alter unrelated temporal behaviour.
   *
   * @param {object} lineData
   * @returns {number}
   */
  #resolveLineQuantity(lineData) {
    if (lineData?.temporal?.mode === 'DATE_RANGE') {
      return this.#requireInventoryQuantity(lineData)
    }
    return lineData?.quantity || 1
  }

  /**
   * Derive occupied dates for a new line and the server-owned record persisted
   * with it.
   *
   * DATE_RANGE lines use the UTC contract from the availability capability. Other
   * modes keep the existing inclusive expansion and receive no record, so their
   * behaviour is unchanged.
   *
   * The dates are derived exactly once, before any mutation, and the same array
   * feeds both the capacity consumption and the persisted record, so the two
   * cannot disagree.
   *
   * @param {object} lineData
   * @returns {{ quantity: number, dates: string[], consumption: object|null }}
   */
  #prepareNewLineConsumption(lineData) {
    const temporal = lineData?.temporal

    if (temporal?.mode !== 'DATE_RANGE') {
      return {
        quantity: this.#resolveLineQuantity(lineData),
        dates: this.#expandDateRange(temporal),
        consumption: null,
      }
    }

    const { availability, version } = this.#requireOccupiedNightsProvider()
    const quantity = this.#requireInventoryQuantity(lineData)
    const dates = availability.expandOccupiedNights({
      startDate: temporal.startDate,
      endDate: temporal.endDate,
    })

    return {
      quantity,
      dates,
      consumption: Object.freeze({
        version,
        dates: Object.freeze([...dates]),
        quantity,
      }),
    }
  }

  /**
   * Merge caller line metadata with the server-owned consumption record.
   *
   * The reserved key is server-owned in every mode, not only on lines that
   * receive a record. Any caller-supplied value is therefore removed
   * unconditionally, on the way to every return, so a forged
   * __occupiedNights cannot survive on a non-DATE_RANGE line either. The
   * server-derived record is then assigned last, and only when a genuine
   * consumption record exists. Unrelated caller keys are preserved.
   *
   * @param {*} callerMetadata
   * @param {object|null} consumption
   * @returns {object}
   */
  #buildLineMetadata(callerMetadata, consumption) {
    const base = callerMetadata && typeof callerMetadata === 'object' && !Array.isArray(callerMetadata)
      ? { ...callerMetadata }
      : {}
    delete base[RESERVED_OCCUPIED_NIGHTS_KEY]
    if (!consumption) return base
    base[RESERVED_OCCUPIED_NIGHTS_KEY] = consumption
    return base
  }

  /**
   * VALIDATION ONLY — strict 'YYYY-MM-DD' that is also a real calendar date.
   *
   * This never derives a list of dates. It exists so a persisted record can be
   * rejected when it holds an impossible or non-conforming value.
   *
   * @param {*} value
   * @returns {boolean}
   */
  #isRealUtcDateString(value) {
    if (typeof value !== 'string' || !STRICT_DATE_PATTERN.test(value)) return false
    const year = Number(value.slice(0, 4))
    const month = Number(value.slice(5, 7))
    const day = Number(value.slice(8, 10))
    if (year === 0 || month < 1 || month > 12 || day < 1 || day > 31) return false
    const probe = new Date(0)
    probe.setUTCHours(0, 0, 0, 0)
    probe.setUTCFullYear(year, month - 1, day)
    return probe.getUTCFullYear() === year
      && probe.getUTCMonth() === month - 1
      && probe.getUTCDate() === day
  }

  /**
   * VALIDATION ONLY — the calendar day after a strict 'YYYY-MM-DD' string, in UTC.
   *
   * Used to prove that a persisted record is ascending, unique, consecutive and
   * covers its range check-out exclusively. It never produces dates for
   * consumption or for release; release acts on the recorded dates themselves.
   *
   * @param {string} value a string already accepted by #isRealUtcDateString
   * @returns {string}
   */
  #nextUtcDateString(value) {
    const probe = new Date(0)
    probe.setUTCHours(0, 0, 0, 0)
    probe.setUTCFullYear(
      Number(value.slice(0, 4)),
      Number(value.slice(5, 7)) - 1,
      Number(value.slice(8, 10))
    )
    probe.setUTCDate(probe.getUTCDate() + 1)
    return probe.toISOString().slice(0, 10)
  }

  /**
   * Read a line's metadata object.
   *
   * The metadata column is JSONB, so a driver normally yields a parsed object.
   * A non-empty string that cannot be parsed to an object is treated as a corrupt
   * record rather than as an absent one, because silently reading it as "no
   * record" would downgrade a case C line to the legacy branch.
   *
   * @param {object} line
   * @returns {object}
   */
  #readLineMetadata(line) {
    const raw = line?.metadata
    if (raw === null || raw === undefined) return {}
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (!trimmed) return {}
      let parsed
      try {
        parsed = JSON.parse(trimmed)
      } catch {
        throw new AvailabilityConsumptionRecordError(
          `Reservation line ${line?.id} has metadata that is not a JSON object; the occupied-night record cannot be read`,
          { lineId: line?.id ?? null, reason: 'metadata is not a JSON object' }
        )
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      throw new AvailabilityConsumptionRecordError(
        `Reservation line ${line?.id} has metadata that is not a JSON object; the occupied-night record cannot be read`,
        { lineId: line?.id ?? null, reason: 'metadata is not a JSON object' }
      )
    }
    return {}
  }

  /**
   * Validate a persisted consumption record for the current supported version.
   *
   * This is version-specific consistency validation, distinct from recomputing
   * consumption: nothing here re-derives the dates, and the caller's stay limits
   * are not consulted. Full check-out-exclusive coverage is proved structurally
   * instead — the first date must equal startDate, the last date plus one day
   * must equal endDate, and the list must be ascending, unique and consecutive.
   * Together those make the list exactly [startDate, endDate), so a truncated,
   * padded or gapped record cannot pass. Comparing only that the final date is
   * before check-out would be insufficient and is not done.
   *
   * @param {object} record
   * @param {object} line
   * @returns {string[]} the recorded dates
   */
  #validateConsumptionRecord(record, line) {
    const fail = (reason) => {
      throw new AvailabilityConsumptionRecordError(
        `Reservation line ${line?.id} has an invalid occupied-night record: ${reason}`,
        {
          lineId: line?.id ?? null,
          reason,
          version: record && typeof record === 'object' ? record.version : null,
        }
      )
    }

    if (!record || typeof record !== 'object' || Array.isArray(record)) fail('record is not an object')

    if (!SUPPORTED_CONSUMPTION_RECORD_VERSIONS.includes(record.version)) {
      fail(`unsupported version ${JSON.stringify(record.version)}`)
    }

    // A record is only ever written for a DATE_RANGE line, so the temporal mode
    // and bounds must still be a strict, real civil DATE_RANGE. Validating them
    // here means a record cannot be released against a missing or incompatible
    // mode, and coverage is proved against bounds that are themselves real dates.
    const temporal = line?.temporal
    if (!temporal || typeof temporal !== 'object' || Array.isArray(temporal)) {
      fail('temporal is missing or not an object')
    }
    if (temporal.mode !== 'DATE_RANGE') {
      fail(`temporal.mode ${JSON.stringify(temporal.mode)} is not compatible with a consumption record`)
    }
    if (!this.#isRealUtcDateString(temporal.startDate)) {
      fail(`temporal.startDate ${JSON.stringify(temporal.startDate)} is not a strict real civil date`)
    }
    if (!this.#isRealUtcDateString(temporal.endDate)) {
      fail(`temporal.endDate ${JSON.stringify(temporal.endDate)} is not a strict real civil date`)
    }

    const { dates, quantity } = record

    if (!Array.isArray(dates)) fail('dates is not an array')
    if (dates.length === 0) fail('dates is empty')

    for (const date of dates) {
      if (!this.#isRealUtcDateString(date)) {
        fail(`dates contains a non-date value ${JSON.stringify(date)}`)
      }
    }

    for (let i = 1; i < dates.length; i++) {
      if (dates[i] !== this.#nextUtcDateString(dates[i - 1])) {
        fail(`dates are not ascending, unique and consecutive at index ${i}`)
      }
    }

    if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1) {
      fail(`quantity ${JSON.stringify(quantity)} is not a positive safe integer`)
    }
    const lineQuantity = Number(line?.quantity)
    if (!Number.isSafeInteger(lineQuantity) || lineQuantity !== quantity) {
      fail(`recorded quantity ${quantity} does not match line quantity ${JSON.stringify(line?.quantity)}`)
    }

    if (dates[0] !== temporal.startDate) {
      fail(`first date ${dates[0]} does not cover startDate ${JSON.stringify(temporal.startDate)}`)
    }
    if (this.#nextUtcDateString(dates[dates.length - 1]) !== temporal.endDate) {
      fail(`last date ${dates[dates.length - 1]} does not cover the day before endDate ${JSON.stringify(temporal.endDate)}`)
    }

    return dates
  }

  /**
   * Resolve which dates a release must act on, from persisted line data only.
   * Request-supplied metadata is never consulted.
   *
   *   A. reserved record absent, DATE_RANGE  -> REFUSED (BOOKING-LEGACY-RELEASE-GATE-1)
   *   B. reserved record absent, other mode  -> not-applicable, no capacity work
   *   C. reserved record present and valid   -> the recorded dates
   *   D. reserved record present but invalid -> typed error, aborted before mutation
   *
   * This is the single resolution boundary used by BOTH the PostgreSQL release
   * (releaseReservationLines) and the writable Map release
   * (#commitMockCancellationSync), so one refusal rule covers both adapter paths.
   *
   * APPROVED PRODUCT DECISION — BOOKING-LEGACY-RELEASE-GATE-1.
   * Automatic cancellation/release of a historical DATE_RANGE line that carries
   * no versioned occupied-night record is refused. This replaces the former
   * legacy range-based release, which derived the consumed dates from the stored
   * temporal bounds and therefore re-introduced the exact timezone dependency the
   * record exists to remove: BOOKING-OCCUPIED-NIGHTS-1B section 7 measured it
   * releasing 4 nights in UTC but only 3 in America/Santiago and
   * Australia/Lord_Howe for the same 4-night stay. Those bounds do not record the
   * create-time timezone, code version or timezone-rule version of the row, so the
   * dates they imply are not evidence of what was consumed.
   *
   * The refusal happens HERE, while the per-line plan is being built, so on the
   * Map path it precedes publication entirely and no stored row is written at all.
   * On the PostgreSQL path the reservation status UPDATE has already been issued in
   * the same transaction() callback: the refusal precedes every released_at and
   * capacity write and is unwound by ROLLBACK. That path does make the status write
   * before refusing — only its commit is avoided.
   *
   * The throw is intentionally not caught, and the two recovery stories differ. On
   * PostgreSQL the enclosing transaction() unwinds the earlier status update. On the
   * Map path nothing needs restoring here, because the refusal precedes publication;
   * the pre-image replay in #commitMockCancellationSync is a separate mechanism for a
   * different failure class — a store write that throws during publication.
   *
   * Scope limits, deliberate:
   *   - The consumed dates are NOT inferred from stored bounds as a fallback.
   *   - A record-less line with any non-DATE_RANGE temporal mode keeps its
   *     not-applicable behaviour (no capacity work, still marked released). This
   *     decision does not broaden to unsupported temporal modes, which remain a
   *     separate open question.
   *   - A reservation with no lines at all still cancels; only a DATE_RANGE line
   *     without a record is refused.
   *   - No backfill, no historical-data mutation, no cancel-without-release
   *     feature. Records for historical rows are an operational decision.
   *
   * Reserved-record presence is inspected *before* the temporal-mode branch is
   * chosen. A record governs the release whatever temporal.mode says, so a line
   * whose mode is missing or incompatible still has its record validated and
   * throws rather than being skipped and marked released without releasing its
   * capacity.
   *
   * @param {object} line
   * @param {string} [reservationId] for diagnosis only; never used to derive dates
   * @returns {{ dates: string[], source: 'recorded'|'not-applicable' }}
   */
  #resolveRecordedReleaseDates(line, reservationId) {
    const metadata = this.#readLineMetadata(line)
    const hasRecord = Object.prototype.hasOwnProperty.call(metadata, RESERVED_OCCUPIED_NIGHTS_KEY)

    if (!hasRecord) {
      // A record governs the release whatever temporal.mode says, so the mode
      // branch is only consulted when there is no record at all.
      if (line?.temporal?.mode !== 'DATE_RANGE') {
        return { dates: [], source: 'not-applicable' }
      }
      // BOOKING-LEGACY-RELEASE-GATE-1: refuse instead of expanding stored
      // bounds. Identifiers only; the metadata object is never included.
      throw new AvailabilityConsumptionRecordError(
        `Reservation ${reservationId ?? line?.reservationId ?? '(unknown)'} line ${line?.id} is a DATE_RANGE line with no versioned occupied-night record; refusing to release it because the consumed dates cannot be derived from stored bounds`,
        {
          reservationId: reservationId ?? line?.reservationId ?? null,
          lineId: line?.id ?? null,
          reason: 'DATE_RANGE line has no versioned occupied-night record',
        }
      )
    }

    return {
      dates: this.#validateConsumptionRecord(metadata[RESERVED_OCCUPIED_NIGHTS_KEY], line),
      source: 'recorded',
    }
  }

  /**
   * Compute new status projection based on is_blocked and reserved_count vs inventory.
   * @param {boolean} isBlocked
   * @param {number} reservedCount
   * @param {number} inventory
   * @returns {string} 'available' | 'reserved' | 'blocked'
   */
  #computeStatus(isBlocked, reservedCount, inventory) {
    if (isBlocked) return 'blocked'
    if (reservedCount >= inventory) return 'reserved'
    return 'available'
  }

  async createReservationWithLine(reservationData, lineData) {
    this._enforceNotDisposed()
    this._enforceWritable()

    const hasPostgresAdapter = this.adapter?.provider?.name === 'postgres'
    if (!hasPostgresAdapter) {
      return this.#createReservationFallback(reservationData, lineData)
    }

    const r = {
      ...reservationData,
      checkInDate: reservationData.checkInDate || reservationData.dates?.checkIn || null,
      checkOutDate: reservationData.checkOutDate || reservationData.dates?.checkOut || null,
      guestCount: reservationData.guestCount || reservationData.guests || 1,
      confirmationCode: reservationData.confirmationCode || `CONF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      specialRequests: reservationData.specialRequests || reservationData.notes || null,
      channel: reservationData.channel || reservationData.source || null,
    }

    // Derived and validated before the transaction opens, so an invalid DATE_RANGE
    // bound or quantity, or a mis-wired provider, cannot reach a single mutation.
    // The strict validation is scoped to DATE_RANGE: a line with any other temporal
    // mode keeps the pre-existing legacy expansion and quantity coercion, and an
    // unknown mode is therefore not rejected here. The same `dates` array drives
    // the capacity consumption and the persisted record.
    const { quantity, dates, consumption } = this.#prepareNewLineConsumption(lineData)
    const lineMetadata = this.#buildLineMetadata(lineData.metadata, consumption)

    return transaction(async (client) => {
      for (const date of dates) {
        const result = await client.query(`
          UPDATE availability
          SET reserved_count = reserved_count + $1,
              status = CASE
                WHEN is_blocked = true THEN 'blocked'
                WHEN reserved_count + $1 >= inventory THEN 'reserved'
                ELSE 'available'
              END,
              updated_at = NOW()
          WHERE tenant_id = $2
            AND accommodation_id = $3
            AND date = $4
            AND is_blocked = false
            AND status = 'available'
            AND reserved_count + $1 <= inventory
          RETURNING id
        `, [quantity, r.tenantId, r.accommodationId, date])

        if (result.rows.length === 0) {
          throw new AvailabilityConflictError(`No capacity for ${date}`)
        }
      }

      const reservationResult = await client.query(
        `INSERT INTO reservations (
          id, tenant_id, accommodation_id, user_id, visitor_id, status, confirmation_code,
          check_in_date, check_out_date, check_in_time, check_out_time,
          guest_count, adults, children, infants, pets,
          subtotal, taxes, fees, discount, total_price, currency, channel,
          customer, guest_details, special_requests, internal_notes, metadata,
          expires_at, confirmed_at, cancelled_at, checked_in_at, checked_out_at,
          created_at, updated_at, deleted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23,
          $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36
        ) RETURNING *`,
        [
          r.id,
          r.tenantId,
          r.accommodationId,
          r.userId || null,
          r.visitorId || null,
          r.status || 'pending',
          r.confirmationCode,
          r.checkInDate,
          r.checkOutDate,
          r.checkInTime || null,
          r.checkOutTime || null,
          r.guestCount || 1,
          r.adults || 1,
          r.children || 0,
          r.infants || 0,
          r.pets || 0,
          r.subtotal || null,
          r.taxes || null,
          r.fees || null,
          r.discount || null,
          r.totalPrice ?? null,
          r.currency || 'USD',
          r.channel || null,
          JSON.stringify(r.customer || {}),
          JSON.stringify(r.guestDetails || {}),
          r.specialRequests || null,
          r.internalNotes || null,
          JSON.stringify(r.metadata || {}),
          r.expiresAt || null,
          r.confirmedAt || null,
          r.cancelledAt || null,
          r.checkedInAt || null,
          r.checkedOutAt || null,
          r.createdAt || new Date().toISOString(),
          new Date().toISOString(),
          null,
        ]
      )

      const reservation = reservationResult.rows[0]

      const lineResult = await client.query(
        `INSERT INTO reservation_lines (
          id, reservation_id, line_order, target_type, target_id, temporal,
          quantity, unit_price, line_total, metadata, released_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, NULL,
          $11, $12
        ) RETURNING *`,
        [
          lineData.id,
          reservation.id,
          lineData.lineOrder || 1,
          lineData.targetType,
          lineData.targetId,
          JSON.stringify(lineData.temporal),
          quantity,
          lineData.unitPrice ?? null,
          lineData.lineTotal ?? null,
          JSON.stringify(lineMetadata),
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      )

      return { reservation, line: lineResult.rows[0] }
    })
  }

  async #createReservationFallback(reservationData, lineData) {
    const r = {
      ...reservationData,
      checkInDate: reservationData.checkInDate || reservationData.dates?.checkIn || null,
      checkOutDate: reservationData.checkOutDate || reservationData.dates?.checkOut || null,
      guestCount: reservationData.guestCount || reservationData.guests || 1,
      confirmationCode: reservationData.confirmationCode || `CONF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      specialRequests: reservationData.specialRequests || reservationData.notes || null,
      channel: reservationData.channel || reservationData.source || null,
    }

    // Same rules as the PostgreSQL path, applied before any mock mutation.
    // Note the mock adapter provides no transaction: if the create below throws
    // after #consumeMockAvailability has run, the capacity change is not rolled
    // back. That limitation is pre-existing and is not addressed here.
    const { quantity, dates, consumption } = this.#prepareNewLineConsumption(lineData)
    const lineMetadata = this.#buildLineMetadata(lineData.metadata, consumption)

    const store = this.adapter?.constructor?.store
    const availStore = store?.get?.('availability') || null

    if (dates.length > 0) {
      this.#consumeMockAvailability(r, dates, quantity, availStore)
    }

    await this.create(r)

    const reservation = r

    const line = {
      id: lineData.id,
      reservationId: reservation.id,
      lineOrder: lineData.lineOrder || 1,
      targetType: lineData.targetType,
      targetId: lineData.targetId,
      temporal: lineData.temporal,
      quantity,
      unitPrice: lineData.unitPrice ?? null,
      lineTotal: lineData.lineTotal ?? null,
      metadata: lineMetadata,
      releasedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (store) {
      this.#persistMockLine(line)
    }

    return { reservation, line }
  }

  #mockAvailabilityRow(availStore, tenantId, accommodationId, date) {
    if (!availStore) return null
    for (const row of availStore.values()) {
      if (row?.tenantId === tenantId && row?.accommodationId === accommodationId && row?.date === date) {
        return row
      }
    }
    return null
  }

  #consumeMockAvailability(r, dates, quantity, availStore) {
    const pending = []
    for (const date of dates) {
      const row = this.#mockAvailabilityRow(availStore, r.tenantId, r.accommodationId, date)
      if (!row) throw new AvailabilityConflictError(`No capacity for ${date}`)
      const isBlocked = row.isBlocked === true
      const inventory = Number(row.inventory ?? row.capacity) || 0
      const reservedCount = Number(row.reservedCount ?? (row.capacity != null && row.available != null ? row.capacity - row.available : 0)) || 0
      if (isBlocked || row.status !== 'available' || reservedCount + quantity > inventory) {
        throw new AvailabilityConflictError(`No capacity for ${date}`)
      }
      const nextReservedCount = reservedCount + quantity
      pending.push({
        row,
        nextReservedCount,
        status: nextReservedCount >= inventory ? 'reserved' : 'available',
      })
    }
    for (const update of pending) {
      const inventory = Number(update.row.inventory ?? update.row.capacity) || 0
      availStore.set(update.row.id, {
        ...update.row,
        reservedCount: update.nextReservedCount,
        available: Math.max(0, inventory - update.nextReservedCount),
        status: update.status,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  #persistMockLine(line) {
    const store = this.adapter?.constructor?.store
    if (!store || !line?.id) return
    if (!store.has('reservation_lines')) store.set('reservation_lines', new Map())
    store.get('reservation_lines').set(line.id, line)
  }

/**
   * The un-clamped reserved count of a mock availability row.
   *
   * Extracted so the release path can assert an aggregate precondition against
   * the same value it later writes, instead of re-deriving the fallback chain.
   * `reservedCount` is authoritative; `capacity`/`available` are the legacy
   * fallback the create path also honours.
   *
   * @param {object} row
   * @returns {number}
   */
  #mockReservedCount(row) {
    const fallback = row?.capacity != null && row?.available != null ? row.capacity - row.available : 0
    return Number(row?.reservedCount ?? fallback) || 0
  }

  /**
   * The replacement availability row for a released quantity. Mirrors the
   * create path's arithmetic exactly; only `reservedCount` differs by delta.
   *
   * @param {object} row
   * @param {number} reservedCount the already-decremented reserved count
   * @param {string} now
   * @returns {object} a new object; the stored row is never mutated
   */
  #mockReleasedAvailability(row, reservedCount, now) {
    const inventory = Number(row.inventory ?? row.capacity) || 0
    return {
      ...row,
      reservedCount,
      available: Math.max(0, inventory - reservedCount),
      status: row.isBlocked === true ? 'blocked' : (reservedCount >= inventory ? 'reserved' : 'available'),
      updatedAt: now,
    }
  }

  /**
   * Merge semantics equivalent to the in-memory adapter's `mergePaths`:
   * dotted keys are set as nested paths, everything else is shallow-merged.
   * Mirrored here because the adapter's own `update` is async and cannot be
   * called from inside the synchronous publication section.
   *
   * @param {object} row
   * @param {object} data
   * @returns {object} a new object; `row` is never mutated
   */
  #mergeMockRow(row, data) {
    const shallow = {}
    for (const [key, value] of Object.entries(data || {})) {
      if (!key.includes('.')) { shallow[key] = value; continue }
      const parts = key.split('.')
      let cursor = shallow
      for (let i = 0; i < parts.length - 1; i++) {
        if (cursor[parts[i]] === null || typeof cursor[parts[i]] !== 'object') cursor[parts[i]] = {}
        cursor = cursor[parts[i]]
      }
      cursor[parts[parts.length - 1]] = value
    }
    return { ...row, ...shallow }
  }

  /**
   * The replacement row an EXPIRATION publishes, built from the AUTHORITATIVE
   * STORED row and changing exactly two fields.
   *
   * BOOKING-EXPIRATION-ATOMIC-1. Expiration used to reuse the cancellation merge
   * (`#mergeMockRow`), which shallow-copies every key the CALLER payload
   * happens to carry onto the stored row. That makes unrelated-field preservation
   * a property of the caller's restraint rather than of the repository: a payload
   * carrying `cancelledAt`, `notes`, `metadata` or `accommodationId` silently
   * overwrote the stored values, and the caller's `accommodationId` could also
   * contradict the stored one while the release still used the stored row as its
   * ownership authority. Expiration is a status-only operation, so it is given a
   * replacement that is derived from the stored row instead:
   *
   *   - `status` — the approved target, the one field the operation owns;
   *   - `updatedAt` — the maintained timestamp, matching `updated_at = NOW()` on
   *     the PostgreSQL path;
   *   - everything else, taken verbatim from the stored row: `cancelledAt`,
   *     `cancelled_at`, `notes`, `metadata`, `specialRequests`, `customer`,
   *     `dates`, `tenantId`, `accommodationId`, `businessId`, `resourceId`,
   *     `guests`, `deletedAt`, and any field this code has never heard of.
   *
   * The stored row is spread first and only these two keys are assigned, so a
   * caller cannot widen what expiration writes, whether by adding keys or by
   * sending a value that happens to be `undefined` for one of them. The stored
   * row is not mutated: a new object is returned.
   *
   * Cancellation keeps `#mergeMockRow` unchanged; this is used only when the
   * synchronous section is serving expiration.
   *
   * @param {object} storedReservation the authoritative stored row
   * @param {string} status the approved terminal target
   * @param {string} now the same timestamp used for the capacity and line writes
   * @returns {object} a new object; `storedReservation` is never mutated
   */
  #expirationReplacementRow(storedReservation, status, now) {
    return { ...storedReservation, status, updatedAt: now }
  }

  /**
   * The stored reservation row this cancellation is allowed to act on.
   *
   * Mirrors the predicate the in-memory adapter's `update` would have applied
   * for `{ id, tenantId }` plus the context tenant and the soft-delete filter
   * BaseRepository._buildQuery adds: exact id, exact tenant, not deleted.
   * Returns null when there is no such row, in which case the status write has
   * no store effect — the same outcome the adapter's `update` had when it
   * resolved `null`.
   *
   * @param {Map|null} table
   * @param {object} reservationData
   * @param {string} tenantId
   * @returns {object|null}
   */
  #storedMockReservation(table, reservationData, tenantId) {
    if (!table) return null
    for (const row of table.values()) {
      if (row?.id !== reservationData.id) continue
      if (row?.tenantId !== tenantId) continue
      if ((row?.deletedAt ?? null) !== null) continue
      return row
    }
    return null
  }

  /**
   * Release capacity and mark lines released, atomically, for the in-memory path.
   *
   * BOOKING-MOCK-CANCEL-ATOMIC-1. Entirely SYNCHRONOUS: it calls no async
   * function and contains no `await`, so no other request can observe a partial
   * state — the section from the first read to the last write is one turn of the
   * event loop. Ordering inside it:
   *
   *   1. locate the stored reservation row (ownership predicate above);
   *   2. select unreleased candidates explicitly;
   *   3. resolve and validate every candidate's record, unchanged policy;
   *   4. derive capacity deltas internally and aggregate them by capacity row,
   *      rejecting a missing row or an aggregate shortfall;
   *   5. build every replacement object and capture every pre-image;
   *   6. publish, then restore synchronously if any publication write throws.
   *
   * Nothing is written until step 6, so every rejection above leaves the store
   * untouched. Rollback replays the captured pre-images in reverse publication
   * order through the pristine Map.prototype.set, so a failure injected on the
   * publication path cannot also defeat the restore.
   *
   * SCOPE: in-process and turn-bounded only. This is NOT a database
   * transaction. It provides no crash durability, no isolation from another
   * process, and no protection against a second writer outside this process.
   *
   * @param {object} reservationData the reservation being cancelled
   * @param {string} tenantId
   * @returns {{reservation: object|null, release: {released: object[], noOp: boolean}}}
   */
  #commitMockCancellationSync(reservationData, tenantId, options = {}) {
    // BOOKING-EXPIRATION-ATOMIC-1. `options` selects which terminal operation
    // this synchronous section is serving and adds the expiration-only
    // precondition. The defaults reproduce the cancellation call EXACTLY, so
    // `cancelReservationWithRelease` behaviour — including every error message
    // below — is unchanged by the extraction.
    const operation = options?.operation || 'cancelReservationWithRelease'
    const expectedStatus = options?.expectedStatus ?? null

    // How the replacement reservation row is BUILT. Cancellation merges the
    // caller's payload over the stored row, byte-for-byte as before; expiration
    // derives it from the stored row and changes only `status` and `updatedAt`,
    // so unrelated-field preservation is enforced here instead of depending on
    // which keys the caller happened to send. This flag changes nothing else —
    // the selection, validation, planning, publication and rollback below are
    // shared, and the ownership/capacity authority is the stored row either way.
    const isExpiration = operation === 'expireReservationWithRelease'

    const store = this.adapter?.constructor?.store
    const reservationTable = store?.get?.(this.adapter?.entityName) || null
    const linesStore = store?.get?.('reservation_lines') || null
    const availStore = store?.get?.('availability') || null

    // Tenant, resolved exactly as BaseRepository._buildQuery resolves it for the
    // write this section replaces: a context tenant (string form, or object
    // `id`) is spread OVER the caller's query and so overrides the supplied
    // tenantId, and a soft-deletable repository adds `deletedAt: null`.
    //
    // `_enforceContext()` is NOT equivalent and must not be assumed to be: it
    // only asserts that a context object exists and compares no tenant at all
    // (base.repository.js:55-57). The predicate below is written out for that
    // reason rather than relying on the guard.
    const contextTenant = this.context?.tenant
    const contextTenantId =
      typeof contextTenant === 'string' ? contextTenant : (contextTenant?.id ?? null)
    const effectiveTenantId = contextTenantId ?? tenantId

    // `_buildQuery` silently discards a supplied tenantId that disagrees with
    // the context tenant. Honouring the caller's tenant is impossible while
    // that stands, so refuse rather than cancel under the context tenant on the
    // caller's request for a different one.
    if (contextTenantId != null && contextTenantId !== tenantId) {
      throw new RepositoryValidationError(
        `Context tenant ${contextTenantId} does not match the supplied tenant ${tenantId}`,
        {
          entityName: this.adapter?.entityName,
          entityId: reservationData?.id,
          operation,
        }
      )
    }

    const storedReservation = this.#storedMockReservation(
      reservationTable,
      reservationData,
      effectiveTenantId
    )

    // The stored row is the ONLY authority for ownership. Without one there is
    // nothing to verify ownership against, so the caller payload is NOT used as
    // a fallback: this returns the null result that the adapter's `update`
    // resolved before, and it does so BEFORE any line or capacity work.
    if (!storedReservation) {
      return { reservation: null, release: { released: [], noOp: true } }
    }

    // BOOKING-EXPIRATION-ATOMIC-1. Expiration precondition, checked against the
    // stored row rather than the caller payload, and before ANY line selection,
    // record resolution or capacity work — so a stale expiration that no longer
    // matches the caller's expectation cannot publish a partial or full release.
    //
    // WHAT IT GUARDS: competing writes to the SAME reservation. The caller read
    // the row, and between that read and this write another writer — a
    // confirmation, a rejection, a cancellation, or a second expiration — moved
    // it on. The caller states the status it believes is stored, and if the
    // stored row no longer says that, this expiration no longer describes the
    // current row and must not act on it. It is not a lock and not a
    // cross-reservation guard: it says nothing about whether some OTHER
    // reservation can expire concurrently, and two different reservations
    // expiring at the same moment are unaffected by it.
    //
    // This is deliberately NOT the `released_at` idempotency guard. A repeated
    // release finding no unreleased lines is a no-op; that says nothing about
    // whether the status write was still appropriate. This check answers the
    // separate question: may this caller still move this row to a terminal
    // status? Cancellation does not pass `expectedStatus` and is unaffected.
    if (expectedStatus != null && storedReservation.status !== expectedStatus) {
      throw new RepositoryValidationError(
        `Reservation ${reservationData.id} is ${storedReservation.status ?? '(no status)'}, not ${expectedStatus}; refusing to ${operation}`,
        {
          entityName: this.adapter?.entityName,
          entityId: reservationData?.id,
          operation,
        }
      )
    }

    // Used only to VERIFY line ownership below; when the stored row carries no
    // accommodation there is nothing to compare and no target is chosen.
    const authoritativeAccommodationId = storedReservation.accommodationId ?? null

    // Explicit unreleased selection. This is the repeat-cancel guard: a line
    // already marked released is never selected again, so it cannot decrement
    // capacity a second time. Selection is independent of the reservation's
    // status — no candidates does NOT mean the status is already cancelled.
    const candidates = linesStore
      ? Array.from(linesStore.values()).filter(
        (line) => line?.reservationId === reservationData.id && (line?.releasedAt ?? null) === null
      )
      : []

    for (const line of candidates) {
      if (line?.tenantId != null && line.tenantId !== effectiveTenantId) {
        throw new RepositoryValidationError(
          `Reservation line ${line.id} belongs to tenant ${line.tenantId}, not ${effectiveTenantId}`,
          { entityName: 'reservation_lines', entityId: line.id, operation }
        )
      }
      if (
        authoritativeAccommodationId != null &&
        line?.targetId != null &&
        line.targetId !== authoritativeAccommodationId
      ) {
        throw new RepositoryValidationError(
          `Reservation line ${line.id} targets ${line.targetId}, but reservation ${reservationData.id} holds ${authoritativeAccommodationId}; refusing to choose a target`,
          { entityName: 'reservation_lines', entityId: line.id, operation }
        )
      }
    }

    // Resolve and validate every candidate's record BEFORE any mutation, so a
    // refused record-less DATE_RANGE line (BOOKING-LEGACY-RELEASE-GATE-1) or a
    // case D invalid record aborts while the store is still untouched.
    const plan = candidates.map((line) => ({
      line,
      ...this.#resolveRecordedReleaseDates(line, reservationData.id),
    }))

    // Deltas are derived here from the validated lines and aggregated by the
    // actual capacity row, so two lines sharing a row are checked and released
    // as one row rather than sequentially clamped against each other.
    //
    // An ABSENT availability table is not the same as an empty one: with an
    // empty table every lookup below misses and is refused, but with the table
    // absent the lookups must not be skipped at all — skipping them would still
    // mark the lines released, publishing a release with no capacity change.
    // So any plan entry that actually occupies dates requires the table, and its
    // absence is refused before any mutation. A plan with no dates — a valid
    // non-DATE_RANGE line, not-applicable — has nothing to release, so it is
    // scoped separately and still succeeds. This is distinct from a case C line
    // (a record present but invalid), which aborts above at validation.
    const requiresCapacityTable = plan.some(({ dates }) => dates.length > 0)
    if (requiresCapacityTable && !availStore) {
      throw new AvailabilityConflictError(
        `Cannot release: the availability table is absent, but ${reservationData.id} occupies dates that must be released`
      )
    }

    const capacityPlan = new Map()
    for (const { line, dates } of plan) {
      const releasedQty = Number(line.quantity || 1)
      for (const date of dates) {
        const row = this.#mockAvailabilityRow(availStore, effectiveTenantId, line.targetId, date)
        if (!row) {
          throw new AvailabilityConflictError(
            `Cannot release: no availability row for tenant ${effectiveTenantId}, target ${line.targetId}, date ${date}`
          )
        }
        const existing = capacityPlan.get(row.id)
        if (existing) { existing.delta += releasedQty; continue }
        capacityPlan.set(row.id, { row, delta: releasedQty })
      }
    }
    // Aggregate precondition, once per row, before any write. The previous
    // behaviour subtracted per line and clamped at zero, so a second line on
    // a shared row silently released less than it should.
    for (const { row, delta } of capacityPlan.values()) {
      if (this.#mockReservedCount(row) - delta < 0) {
        throw new AvailabilityConflictError(
          `Cannot release: date ${row.date} has insufficient reservedCount`
        )
      }
    }

    const now = new Date().toISOString()

    // Every replacement object is prepared here, before the first write, and no
    // stored row is ever mutated in place.
    //
    // Expiration builds the reservation replacement from the STORED row and
    // changes only `status` and `updatedAt` (see #expirationReplacementRow), so
    // the caller's `cancelledAt`, `notes`, `metadata`, `accommodationId` and any
    // other unrelated key cannot reach the store through this write. Cancellation
    // keeps the caller-payload merge, unchanged.
    const nextReservation = isExpiration
      ? this.#expirationReplacementRow(storedReservation, reservationData.status, now)
      : this.#mergeMockRow(storedReservation, reservationData)
    const nextCapacity = Array.from(capacityPlan.values(), ({ row, delta }) => ({
      id: row.id,
      next: this.#mockReleasedAvailability(row, this.#mockReservedCount(row) - delta, now),
    }))
    const nextLines = plan.map(({ line }) => ({
      id: line.id,
      next: { ...line, releasedAt: now, updatedAt: now },
    }))

    const preImages = [
      {
        table: reservationTable,
        name: this.adapter?.entityName,
        id: nextReservation.id,
        image: { ...storedReservation },
      },
    ]
    for (const entry of nextCapacity) {
      preImages.push({
        table: availStore,
        name: 'availability',
        id: entry.id,
        image: { ...capacityPlan.get(entry.id).row },
      })
    }
    for (const entry of nextLines) {
      preImages.push({
        table: linesStore,
        name: 'reservation_lines',
        id: entry.id,
        image: { ...candidates.find((line) => line.id === entry.id) },
      })
    }

    try {
      reservationTable.set(nextReservation.id, nextReservation)
      for (const entry of nextCapacity) availStore.set(entry.id, entry.next)
      for (const entry of nextLines) linesStore.set(entry.id, entry.next)
    } catch (error) {
      const unrestored = []
      for (let i = preImages.length - 1; i >= 0; i--) {
        const { table, name, id, image } = preImages[i]
        try {
          RAW_MAP_SET.call(table, id, image)
        } catch {
          unrestored.push(`${name}/${id}`)
        }
      }
      if (unrestored.length > 0) {
        throw new AggregateError(
          [error],
          `Mock cancellation rollback incomplete for: ${unrestored.join(', ')}`
        )
      }
      throw error
    }

    // Notification is deliberately OUTSIDE the rollback section, and that is a
    // real limit, not an oversight. `_emit` is synchronous
    // (base.repository.js:79-81): it calls `eventBus.emit(...)` directly, so a
    // subscriber that throws propagates and rejects the caller AFTER the stores
    // are already committed. Rollback does NOT cover it, and this comment does
    // not claim otherwise.
    //
    // This preserves the established contract rather than changing it. Before
    // this section, `_releaseMockCapacity` ran first and `this.update(...)` then
    // emitted from inside BaseRepository.update, so a throwing subscriber also
    // rejected the caller with capacity already mutated and the row already
    // written. Swallowing subscriber errors or rolling committed stores back
    // because a listener failed would be a new policy, not a fix, so neither is
    // done here. A store-write failure and a listener failure are different
    // things and only the first is restored.
    this._emit('repository:entity_updated', { data: reservationData })

    return {
      reservation: nextReservation,
      release: {
        released: nextLines.map((entry) => entry.next),
        noOp: nextLines.length === 0,
      },
    }
  }

  /**
   * The PostgreSQL half of the shared atomic terminal-transition-with-release
   * core, used by BOTH cancellation and expiration.
   *
   * BOOKING-EXPIRATION-ATOMIC-1. The two operations differ only in the status
   * statement they issue; everything that makes the operation atomic is common
   * and lives here exactly once:
   *
   *   - the enclosing `transaction()`, so the status update and every
   *     `released_at` / capacity write commit or unwind together;
   *   - missing-row handling (zero rows is an error, never a silent success);
   *   - the call into `releaseReservationLines`, which owns the record validator,
   *     the legacy DATE_RANGE refusal, the plan-before-mutate ordering and the
   *     `released_at` compare-and-set.
   *
   * The caller supplies the statement because the two operations genuinely need
   * different columns: cancellation stamps `cancelled_at` and carries the
   * cancel reason into `special_requests`; expiration must touch NEITHER, so it
   * supplies a statement that writes `status` and `updated_at` only. Extracting
   * the shared part rather than copying the body is what keeps the two from
   * drifting apart again.
   *
   * @param {object} reservationData
   * @param {string} tenantId
   * @param {object} options
   * @param {string} options.sql the status UPDATE statement
   * @param {Array}  options.params its bound parameters
   * @param {string} options.emptyResultMessage thrown when the statement matches no row
   * @returns {Promise<{reservation: object, release: {released: object[], noOp: boolean}}>}
   */
  async #postgresTerminalTransitionWithRelease(reservationData, tenantId, { sql, params, emptyResultMessage }) {
    return transaction(async (client) => {
      const reservationResult = await client.query(sql, params)

      if (reservationResult.rows.length === 0) {
        throw new Error(emptyResultMessage)
      }

      const release = await this.releaseReservationLines(
        client,
        reservationData.id,
        tenantId
      )

      return {
        reservation: reservationResult.rows[0],
        release,
      }
    })
  }

  async cancelReservationWithRelease(reservationData, tenantId) {
    this._enforceNotDisposed()
    this._enforceInitialized()
    this._enforceWritable()

    const hasPostgres = this.adapter?.provider?.name === 'postgres'

    if (!hasPostgres) {
      // _enforceContext was previously applied by this.update(); it is called
      // explicitly here because the synchronous section replaces that call.
      this._enforceContext()
      const { reservation } = this.#commitMockCancellationSync(reservationData, tenantId)
      return reservation
    }

    return this.#postgresTerminalTransitionWithRelease(reservationData, tenantId, {
      sql: `UPDATE reservations
         SET status = $1,
             cancelled_at = $2,
             special_requests = $3,
             updated_at = NOW()
         WHERE id = $4
           AND tenant_id = $5
         RETURNING *`,
      params: [
        reservationData.status,
        reservationData.cancelledAt || null,
        reservationData.notes || null,
        reservationData.id,
        tenantId,
      ],
      // Preserved verbatim from the pre-extraction body.
      emptyResultMessage: `Reservation ${reservationData.id} update failed - not found or not authorized`,
    })
  }

  /**
   * The APPROVED source -> target PAIRS for an expiration.
   *
   * BOOKING-EXPIRATION-ATOMIC-1. This is the expiration sibling of
   * `cancelReservationWithRelease`. It shares the atomic mechanics with it — the
   * same synchronous Map planning/publication/rollback, and the same PostgreSQL
   * transaction — through #commitMockCancellationSync and
   * #postgresTerminalTransitionWithRelease, rather than duplicating them. That is
   * the point: expiration previously wrote status and released nothing, so the
   * release gate in #resolveRecordedReleaseDates did not apply to it at all.
   *
   * The pair is validated as a PAIR, not as two independent allow-lists: the
   * caller-stated source must map to the caller-stated target in
   * EXPIRATION_TRANSITIONS. `requested -> no_response`,
   * `owner_pending -> expired` and `payment_pending -> no_response` are each
   * individually plausible and each unapproved, so admitting them on the strength
   * of their members would be wrong. The check runs before any store work and is
   * therefore identical on both adapter paths.
   *
   * What expiration deliberately does NOT do, so that it cannot become a
   * cancellation with extra steps:
   *
   *   - it never writes `cancelled_at`, in any adapter. The PostgreSQL statement
   *     below omits the column entirely, so it is neither set nor cleared to
   *     NULL, and the Map replacement is built from the stored row with only
   *     `status` and `updatedAt` assigned. A pre-existing `cancelledAt` on the
   *     stored row survives expiration untouched.
   *   - it never writes `special_requests` or any other unrelated column, on
   *     either adapter.
   *   - it accepts only the approved pairs, so `cancelled` cannot be reached.
   *
   * On the Map path the replacement row is derived from the AUTHORITATIVE STORED
   * row, not from the caller payload. Preservation of `cancelledAt`, `notes`,
   * `metadata`, `tenantId`, `accommodationId` and every other unrelated property
   * is therefore a property of this method rather than of the caller's
   * restraint: a payload carrying conflicting values for those keys cannot reach
   * the store through this write. The release below likewise uses the stored
   * row's accommodation as its ownership authority.
   *
   * `expectedStatus` is REQUIRED and is re-validated against the authoritative
   * store, not the caller payload: the Map path compares the stored row's status
   * before any line or capacity work, and the PostgreSQL predicate carries the
   * same condition so the check also holds against a row that changed between
   * the caller's read and this write. It guards competing writes to the SAME
   * reservation: if another writer moved THIS row on, this expiration no longer
   * describes it and is refused. It is not a lock and says nothing about other
   * reservations. This is deliberately separate from the `released_at`
   * idempotency guard, which only says a release already happened; it does not
   * say the status write is still appropriate.
   *
   * RETURN SHAPE matches `cancelReservationWithRelease` per adapter, so a caller
   * treats the result identically: the bare stored row (or null) on the Map
   * path, a `{ reservation, release }` wrapper from the PostgreSQL transaction.
   *
   * NOT CERTIFIED: physical PostgreSQL rollback, and concurrency between
   * processes. The Map path is synchronously atomic for store-write failures
   * within one process and buys no crash durability.
   *
   * @param {object} reservationData domain object carrying `id` and the target `status`
   * @param {string} tenantId
   * @param {object} options
   * @param {string} options.expectedStatus the source status the caller believes is stored
   * @returns {Promise<object|null|{reservation: object, release: object}>}
   */
  async expireReservationWithRelease(reservationData, tenantId, { expectedStatus } = {}) {
    this._enforceNotDisposed()
    this._enforceInitialized()
    this._enforceWritable()

    const targetStatus = reservationData?.status

    // The APPROVED PAIR, validated before any store work. Required, and validated
    // rather than trusted: an expiration with no stated starting state has no way
    // to detect that it is stale, and an unstated or wrong target has no way to
    // be shown to be the one this source is approved to reach.
    const approvedTarget = EXPIRATION_TRANSITIONS[expectedStatus]

    if (approvedTarget === undefined) {
      throw new RepositoryValidationError(
        `Cannot expire reservation ${reservationData?.id}: ${JSON.stringify(expectedStatus)} is not a supported expiration source status`,
        {
          entityName: this.adapter?.entityName,
          entityId: reservationData?.id,
          operation: 'expireReservationWithRelease',
        }
      )
    }

    if (targetStatus !== approvedTarget) {
      throw new RepositoryValidationError(
        `Cannot expire reservation ${reservationData?.id} from ${expectedStatus} to ${JSON.stringify(targetStatus)}: the approved outcome for ${expectedStatus} is ${approvedTarget}`,
        {
          entityName: this.adapter?.entityName,
          entityId: reservationData?.id,
          operation: 'expireReservationWithRelease',
        }
      )
    }

    const hasPostgres = this.adapter?.provider?.name === 'postgres'

    if (!hasPostgres) {
      this._enforceContext()
      const { reservation } = this.#commitMockCancellationSync(reservationData, tenantId, {
        operation: 'expireReservationWithRelease',
        expectedStatus,
      })
      return reservation
    }

    return this.#postgresTerminalTransitionWithRelease(reservationData, tenantId, {
      // `cancelled_at` and `special_requests` are deliberately absent from the
      // SET list: expiration must preserve them exactly as stored, including a
      // `cancelled_at` that is already populated. Only `updated_at` is
      // maintained alongside the status, matching the Map replacement row's
      // `{ ...stored, status, updatedAt }` — so the two adapters write the same
      // two fields and neither can carry a caller's unrelated value into a column.
      sql: `UPDATE reservations
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
           AND tenant_id = $3
           AND status = $4
         RETURNING *`,
      params: [targetStatus, reservationData.id, tenantId, expectedStatus],
      // Zero rows is ambiguous on this statement and deliberately not
      // disambiguated with an extra read: the row may be missing, not
      // authorized, or no longer in the expected status. The message says so
      // rather than asserting one cause.
      emptyResultMessage:
        `Reservation ${reservationData.id} expiration did not match expected status ${expectedStatus}: the row is missing, not authorized, or is no longer ${expectedStatus}`,
    })
  }

  async releaseReservationLines(client, reservationId, tenantId) {
    const linesResult = await client.query(`
      SELECT rl.*
      FROM reservation_lines rl
      JOIN reservations r ON r.id = rl.reservation_id
      WHERE rl.reservation_id = $1
        AND r.tenant_id = $2
        AND rl.released_at IS NULL
    `, [reservationId, tenantId])

    if (linesResult.rows.length === 0) {
      return { released: [], noOp: true }
    }

    // Resolve and validate every line's record BEFORE the first mutation, so a
    // refused record-less DATE_RANGE line (BOOKING-LEGACY-RELEASE-GATE-1) or an
    // invalid record aborts before any released_at mark and before any capacity
    // decrement. Because this runs inside the caller's transaction, the
    // reservation status update is rolled back with it.
    const plan = linesResult.rows.map((line) => ({
      line,
      ...this.#resolveRecordedReleaseDates(line, reservationId),
    }))

    for (const { line, dates } of plan) {

      const releasedResult = await client.query(`
        UPDATE reservation_lines
        SET released_at = NOW()
        WHERE id = $1 AND released_at IS NULL
        RETURNING quantity
      `, [line.id])

      // Compare-and-set: a line already marked released yields no row, so a
      // repeated repository release cannot decrement capacity a second time.
      if (releasedResult.rows.length === 0) {
        continue
      }

      const quantity = releasedResult.rows[0].quantity

      for (const date of dates) {
        const releaseResult = await client.query(`
          UPDATE availability
          SET reserved_count = reserved_count - $1,
              status = CASE
                WHEN is_blocked = true THEN 'blocked'
                WHEN reserved_count - $1 >= inventory THEN 'reserved'
                ELSE 'available'
              END,
              updated_at = NOW()
            WHERE tenant_id = $2
              AND accommodation_id = $3
              AND date = $4
              AND reserved_count >= $1
            RETURNING id
          `, [quantity, tenantId, line.target_id, date])

        if (releaseResult.rows.length === 0) {
          throw new AvailabilityConflictError(
            `Cannot release: date ${date} has insufficient reserved_count`
          )
        }
      }
    }

    return { released: linesResult.rows, noOp: false }
  }

  async findLinesByReservationId(tenantId, reservationId) {
    this._enforceNotDisposed()
    this._enforceInitialized()

    const hasPostgres = this.adapter?.provider?.name === 'postgres'

    if (hasPostgres) {
      const result = await query(
        `SELECT rl.*
         FROM reservation_lines rl
         JOIN reservations r ON r.id = rl.reservation_id
         WHERE rl.reservation_id = $1 AND r.tenant_id = $2
         ORDER BY rl.line_order ASC, rl.created_at ASC, rl.id ASC`,
        [reservationId, tenantId]
      )
      return result.rows
    }

    const reservation = await this.adapter.findOne({ id: reservationId })
    if (!reservation || reservation.tenantId !== tenantId) {
      return []
    }

    const mockStore = this.adapter?.constructor?.store
    const linesStore = mockStore?.get?.('reservation_lines')
    if (linesStore) {
      const lines = Array.from(linesStore.values()).filter((l) => l.reservationId === reservationId)
      return lines
        .sort((a, b) => {
          if (a.lineOrder !== b.lineOrder) return (a.lineOrder || 0) - (b.lineOrder || 0)
          if (a.createdAt !== b.createdAt) return (a.createdAt || '').localeCompare(b.createdAt || '')
          return (a.id || '').localeCompare(b.id || '')
        })
        .map((line) => ({
          id: line.id,
          reservationId: line.reservationId,
          lineOrder: line.lineOrder,
          targetType: line.targetType,
          targetId: line.targetId,
          temporal: line.temporal,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          metadata: line.metadata,
          releasedAt: line.releasedAt || null,
          createdAt: line.createdAt,
          updatedAt: line.updatedAt,
        }))
    }

    return []
  }
}
