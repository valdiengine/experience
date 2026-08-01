export const BUSINESS_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
}

export const BUSINESS_STATUS_LIST = Object.values(BUSINESS_STATUS)

export function isActiveStatus(status) {
  return [BUSINESS_STATUS.DRAFT, BUSINESS_STATUS.PENDING_REVIEW, BUSINESS_STATUS.PUBLISHED, BUSINESS_STATUS.SUSPENDED].includes(status)
}

export function isVisibleStatus(status) {
  return status === BUSINESS_STATUS.PUBLISHED
}

export function isTerminalStatus(status) {
  return [BUSINESS_STATUS.ARCHIVED, BUSINESS_STATUS.DELETED].includes(status)
}

export function isEditableStatus(status) {
  return [BUSINESS_STATUS.DRAFT, BUSINESS_STATUS.PENDING_REVIEW, BUSINESS_STATUS.SUSPENDED].includes(status)
}
