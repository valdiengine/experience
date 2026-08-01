import { createSchema } from '../core/schema.js'
import { BUSINESS_STATUS_LIST } from './business.status.js'

export const BUSINESS_SCHEMA = createSchema({
  id: 'business',
  name: 'Business',
  description: 'A company registered inside the platform',
  fields: {
    id: { type: 'string', required: false },
    tenantId: { type: 'string', required: true },
    destinationId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    legalName: { type: 'string', required: false },
    slug: { type: 'string', required: false },
    category: { type: 'string', required: true },
    subcategory: { type: 'string', required: false },
    description: { type: 'string', required: true },
    status: { type: 'string', required: false, values: BUSINESS_STATUS_LIST },
    contactEmail: { type: 'string', required: true },
    contactPhone: { type: 'string', required: false },
    website: { type: 'string', required: false },
    socialNetworks: {
      type: 'object',
      required: false,
      fields: {
        instagram: { type: 'string', required: false },
        facebook: { type: 'string', required: false },
        twitter: { type: 'string', required: false },
        tiktok: { type: 'string', required: false },
        linkedin: { type: 'string', required: false },
      },
    },
    logo: { type: 'string', required: false },
    coverImage: { type: 'string', required: false },
    address: { type: 'string', required: false },
    coordinates: {
      type: 'object',
      required: false,
      fields: {
        lat: { type: 'number', required: false },
        lng: { type: 'number', required: false },
      },
    },
    city: { type: 'string', required: false },
    timezone: { type: 'string', required: false },
    language: { type: 'string', required: false },
    currency: { type: 'string', required: false },
    openingHours: { type: 'object', required: false },
    verificationStatus: { type: 'string', required: false },
    visibility: { type: 'string', required: false },
    metadata: { type: 'object', required: false },
    seo: {
      type: 'object',
      required: false,
      fields: {
        title: { type: 'string', required: false },
        description: { type: 'string', required: false },
        keywords: { type: 'array', required: false },
        ogImage: { type: 'string', required: false },
      },
    },
    createdAt: { type: 'string', required: false },
    updatedAt: { type: 'string', required: false },
    publishedAt: { type: 'string', required: false },
  },
})

export function validateBusiness(data) {
  return BUSINESS_SCHEMA.validate(data)
}
