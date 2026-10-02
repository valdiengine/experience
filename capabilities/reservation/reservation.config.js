/**
 * Reservation Config — Tenant-configurable timeout settings
 *
 * Business-agnostic: configurable timeouts for reservation lifecycle
 *
 * BOOKING-EXPIRATION-TIMERS-1 — status-keyed timeout resolution.
 *
 * `getTimeout()` used to build a table keyed by UPPERCASE names
 * (`REQUESTED`/`OWNER_PENDING`/`PAYMENT_PENDING`) and then index it with the
 * lowercase status that `RESERVATION_STATUS` actually produces, so every lookup
 * missed and fell through to `|| ownerPendingTimeout`. Every timer therefore ran
 * at the 24h owner-pending timeout: `requested` at 24h instead of 12h and
 * `payment_pending` at 24h instead of 6h. The fallback was also what made a
 * wrong or unconfigured timeout invisible — a missing value silently became the
 * owner-pending timeout instead of being reported.
 *
 * The table is now keyed by the actual lowercase status constants, so a value
 * that is absent or invalid is REPORTED rather than substituted:
 *
 *   - a status with no approved automatic expiration (`confirmed` and every
 *     terminal state) resolves to `null` — no automatic expiration;
 *   - a configured timeout that is not a positive safe integer is an explicit
 *     `error`, never a silent 24h.
 *
 * `getAll()` and `update()` still surface raw overrides, so an invalid override
 * remains visible to the caller instead of being quietly corrected here.
 */
import { RESERVATION_STATUS } from './reservation.status.js'

export const DEFAULT_RESERVATION_CONFIG = {
  ownerPendingTimeout: 24 * 60 * 60 * 1000,
  paymentTimeout: 6 * 60 * 60 * 1000,
  requestedTimeout: 12 * 60 * 60 * 1000,
  autoExpiration: true,
  reminderSchedule: [
    { hours: 1, message: 'Recordatorio: solicitud pendiente' },
    { hours: 12, message: 'Recordatorio: respuesta esperada' },
  ],
}

/**
 * The approved automatic expirations, keyed by the real status values.
 *
 * BOOKING-EXPIRATION-TIMERS-1. These are exactly the three source states in
 * `EXPIRATION_TARGETS` (reservation.workflow.js): every other state has no
 * timeout and is resolved as unsupported rather than defaulted.
 */
const TIMEOUT_SETTINGS = {
  [RESERVATION_STATUS.REQUESTED]: 'requestedTimeout',
  [RESERVATION_STATUS.OWNER_PENDING]: 'ownerPendingTimeout',
  [RESERVATION_STATUS.PAYMENT_PENDING]: 'paymentTimeout',
}

const isValidTimeout = (value) => Number.isSafeInteger(value) && value > 0

export class ReservationConfig {
  #config = {}
  #context = null

  constructor(context) {
    this.#context = context
    this.#config = { ...DEFAULT_RESERVATION_CONFIG }
    this.#loadTenantConfig()
  }

  /**
   * Get the config setting name backing a status, or null when the status has
   * no approved automatic expiration.
   * @param {string} status - Reservation status
   * @returns {string|null}
   */
  getTimeoutSettingName(status) {
    return TIMEOUT_SETTINGS[status] || null
  }

  /**
   * Whether a status has an approved automatic expiration.
   * @param {string} status
   * @returns {boolean}
   */
  isExpirableStatus(status) {
    return this.getTimeoutSettingName(status) !== null
  }

  /**
   * Every status that has an approved automatic expiration.
   *
   * BOOKING-EXPIRATION-RECOVERY-1. Read from the same table the timeouts come
   * from, so a caller that needs to enumerate expirable states — restart
   * recovery scanning the persisted reservations, for instance — cannot drift
   * from the timeout policy that would then arm them.
   *
   * A copy is returned: the caller must not be able to extend the policy.
   * @returns {string[]}
   */
  getExpirableStatuses() {
    return Object.keys(TIMEOUT_SETTINGS)
  }

  /**
   * Resolve the auto-expiration switch, reporting an unusable override
   * explicitly instead of guessing what was meant.
   * @returns {{ enabled: boolean, enabledRaw: any, supported: boolean, errors: string[], error: string|null }}
   */
  getAutoExpirationSettings() {
    const enabledRaw = this.#config.autoExpiration
    const errors = []

    if (typeof enabledRaw !== 'boolean') {
      errors.push(
        `Invalid reservation setting "autoExpiration": expected a boolean, received ${describe(enabledRaw)}`
      )
    }

    const errorsList = errors.length > 0
    return {
      enabled: errorsList ? false : enabledRaw,
      enabledRaw,
      supported: !errorsList,
      errors,
      error: errorsList ? errors[0] : null,
    }
  }

  /**
   * Get auto expiration setting
   * @returns {boolean}
   */
  getAutoExpiration() {
    return this.getAutoExpirationSettings().enabled
  }

  /**
   * Resolve the timeout for a status together with the reason it is or is not
   * usable.
   *
   * `timerState` is one of:
   *   - `'armed'`          — automatic expiration applies with `timeoutMs`
   *   - `'auto_disabled'`  — the feature is switched off
   *   - `'unsupported'`    — this status must never expire automatically
   *   - `'invalid_setting'`— an override is unusable and is reported, not replaced
   *
   * @param {string} status - Reservation status
   * @returns {{ status: string, supported: boolean, timerState: string, settingName: string|null, settingValue: any, timeoutMs: number|null, source: 'default'|'tenant', error: string|null }}
   */
  resolveTimeout(status) {
    const settingName = this.getTimeoutSettingName(status)
    const auto = this.getAutoExpirationSettings()

    if (!settingName) {
      return {
        status,
        supported: false,
        timerState: 'unsupported',
        settingName: null,
        settingValue: null,
        timeoutMs: null,
        source: 'default',
        error: null,
      }
    }

    const settingValue = this.#config[settingName]
    const source = settingValue === DEFAULT_RESERVATION_CONFIG[settingName] ? 'default' : 'tenant'

    if (!auto.enabled) {
      return {
        status,
        supported: true,
        timerState: auto.error ? 'invalid_setting' : 'auto_disabled',
        settingName,
        settingValue,
        timeoutMs: null,
        source,
        error: auto.error,
      }
    }

    if (!isValidTimeout(settingValue)) {
      return {
        status,
        supported: true,
        timerState: 'invalid_setting',
        settingName,
        settingValue,
        timeoutMs: null,
        source,
        error:
          `Invalid reservation setting "${settingName}" for status ${status}: ` +
          `expected a positive integer number of milliseconds, received ${describe(settingValue)}`,
      }
    }

    return {
      status,
      supported: true,
      timerState: 'armed',
      settingName,
      settingValue,
      timeoutMs: settingValue,
      source,
      error: null,
    }
  }

  /**
   * Get timeout for status.
   *
   * BOOKING-EXPIRATION-TIMERS-1: keyed by the real lowercase status values and
   * returns `null` for a state with no approved automatic expiration, instead of
   * substituting the owner-pending timeout for anything unknown.
   * @param {string} status - Reservation status
   * @returns {number|null} - Timeout in milliseconds, or null
   */
  getTimeout(status) {
    return this.resolveTimeout(status).timeoutMs
  }

  /**
   * Get reminder schedule
   * @returns {object[]}
   */
  getReminderSchedule() {
    return this.#config.reminderSchedule || []
  }

  /**
   * Get all config
   * @returns {object}
   */
  getAll() {
    return { ...this.#config }
  }

  /**
   * Update config
   *
   * Values are stored as given. Unusable overrides are reported by
   * `resolveTimeout`/`getAutoExpirationSettings`, never silently corrected.
   * @param {object} updates
   */
  update(updates) {
    this.#config = { ...this.#config, ...updates }
  }

  /**
   * Load tenant-specific config from DataManager
   * @private
   */
  #loadTenantConfig() {
    const tenantId = this.#context?.tenant?.id
    if (!tenantId) return

    const tenantConfig = this.#context?.dataManager?.get(`tenantConfig.${tenantId}.reservation`)
    if (tenantConfig) {
      this.#config = { ...this.#config, ...tenantConfig }
    }
  }
}

function describe(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `array(${value.length})`
  if (typeof value === 'object') return 'object'
  return `${typeof value} ${String(value)}`
}