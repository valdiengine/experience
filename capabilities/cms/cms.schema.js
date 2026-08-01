/**
 * CMS Capability — Schemas & Validation
 *
 * Business-agnostic: pages, posts, media, metadata
 * These are DATA SCHEMAS only — no UI
 */
import { createSchema } from '../core/schema.js'

/**
 * CMS content type enum
 */
export const CMS_CONTENT_TYPES = {
  PAGE: 'page',
  POST: 'post',
  MEDIA: 'media',
  CUSTOM: 'custom',
}

/**
 * CMS content status enum
 */
export const CMS_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
}

/**
 * CMS content entity schema
 */
export const CMS_CONTENT_SCHEMA = createSchema({
  id: 'cms_content',
  name: 'CMS Content',
  description: 'A CMS content entity (page, post, media)',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    type: { type: 'string', required: true, values: Object.values(CMS_CONTENT_TYPES) },
    status: { type: 'string', required: true, values: Object.values(CMS_STATUS) },
    slug: { type: 'string', required: true },
    title: { type: 'string', required: true },
    content: { type: 'string', required: false },
    excerpt: { type: 'string', required: false },
    featuredImage: { type: 'string', required: false },
    metadata: { type: 'object', required: false },
    customFields: { type: 'object', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
  },
})

/**
 * Validate CMS content against schema
 * @param {object} data - CMS content to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCMSContent(data) {
  return CMS_CONTENT_SCHEMA.validate(data)
}
