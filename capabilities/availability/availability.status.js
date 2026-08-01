export const AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  BLOCKED: 'blocked',
  RESERVED: 'reserved',
  PENDING: 'pending',
  MAINTENANCE: 'maintenance',
  HIDDEN: 'hidden',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
}

export const AVAILABILITY_STATUS_LIST = Object.values(AVAILABILITY_STATUS)

export function isBookableStatus(status) {
  return status === AVAILABILITY_STATUS.AVAILABLE
}

export function isBlockedStatus(status) {
  return [AVAILABILITY_STATUS.BLOCKED, AVAILABILITY_STATUS.MAINTENANCE, AVAILABILITY_STATUS.RESERVED].includes(status)
}

export function isActiveStatus(status) {
  return [AVAILABILITY_STATUS.AVAILABLE, AVAILABILITY_STATUS.BLOCKED, AVAILABILITY_STATUS.RESERVED, AVAILABILITY_STATUS.PENDING, AVAILABILITY_STATUS.MAINTENANCE, AVAILABILITY_STATUS.HIDDEN].includes(status)
}

export function isTerminalStatus(status) {
  return [AVAILABILITY_STATUS.ARCHIVED, AVAILABILITY_STATUS.DELETED].includes(status)
}

export function isEditableStatus(status) {
  return [AVAILABILITY_STATUS.AVAILABLE, AVAILABILITY_STATUS.BLOCKED, AVAILABILITY_STATUS.PENDING, AVAILABILITY_STATUS.MAINTENANCE, AVAILABILITY_STATUS.HIDDEN].includes(status)
}
