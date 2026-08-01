export const VISITOR_STATUS = Object.freeze({
  ANONYMOUS: 'anonymous',
  REGISTERED: 'registered',
  VERIFIED: 'verified',
  ACTIVE: 'active',
  VIP: 'vip',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
})

export const VISITOR_STATUS_LABELS = Object.freeze({
  [VISITOR_STATUS.ANONYMOUS]: 'Anonymous',
  [VISITOR_STATUS.REGISTERED]: 'Registered',
  [VISITOR_STATUS.VERIFIED]: 'Verified',
  [VISITOR_STATUS.ACTIVE]: 'Active',
  [VISITOR_STATUS.VIP]: 'VIP',
  [VISITOR_STATUS.INACTIVE]: 'Inactive',
  [VISITOR_STATUS.ARCHIVED]: 'Archived',
  [VISITOR_STATUS.DELETED]: 'Deleted',
})

export const VISITOR_STATUS_HIERARCHY = Object.freeze({
  [VISITOR_STATUS.ANONYMOUS]: 0,
  [VISITOR_STATUS.REGISTERED]: 10,
  [VISITOR_STATUS.VERIFIED]: 20,
  [VISITOR_STATUS.ACTIVE]: 30,
  [VISITOR_STATUS.VIP]: 40,
  [VISITOR_STATUS.INACTIVE]: 5,
  [VISITOR_STATUS.ARCHIVED]: -10,
  [VISITOR_STATUS.DELETED]: -20,
})

export function isActiveStatus(status) {
  return [VISITOR_STATUS.ACTIVE, VISITOR_STATUS.VIP].includes(status)
}

export function isTerminalStatus(status) {
  return [VISITOR_STATUS.ARCHIVED, VISITOR_STATUS.DELETED].includes(status)
}

export function isVerifiableStatus(status) {
  return [VISITOR_STATUS.REGISTERED].includes(status)
}

export function isVIPFriendlyStatus(status) {
  return [VISITOR_STATUS.ACTIVE, VISITOR_STATUS.VIP].includes(status)
}

export function canTransitionTo(from, to) {
  const valid = VALID_TRANSITIONS[from]
  return valid ? valid.includes(to) : false
}
