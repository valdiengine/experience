export const ACCOMMODATION_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  HIDDEN: 'hidden',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
}

export const ACCOMMODATION_STATUS_LIST = Object.values(ACCOMMODATION_STATUS)

export function isActiveStatus(status) {
  return [ACCOMMODATION_STATUS.DRAFT, ACCOMMODATION_STATUS.PENDING_REVIEW, ACCOMMODATION_STATUS.PUBLISHED, ACCOMMODATION_STATUS.HIDDEN].includes(status)
}

export function isVisibleStatus(status) {
  return status === ACCOMMODATION_STATUS.PUBLISHED
}

export function isTerminalStatus(status) {
  return [ACCOMMODATION_STATUS.ARCHIVED, ACCOMMODATION_STATUS.DELETED].includes(status)
}

export function isEditableStatus(status) {
  return [ACCOMMODATION_STATUS.DRAFT, ACCOMMODATION_STATUS.PENDING_REVIEW, ACCOMMODATION_STATUS.HIDDEN].includes(status)
}
