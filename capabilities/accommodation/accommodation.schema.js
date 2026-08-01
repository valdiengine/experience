import { createSchema } from '../core/schema.js'
import { ACCOMMODATION_STATUS_LIST } from './accommodation.status.js'

export const ACCOMMODATION_SCHEMA = createSchema({
  id: 'accommodation',
  name: 'Accommodation',
  description: 'A lodging property with bookable units owned by a Business',
  fields: {
    id: { type: 'string', required: false },
    tenantId: { type: 'string', required: true },
    destinationId: { type: 'string', required: true },
    businessId: { type: 'string', required: true },
    ownerId: { type: 'string', required: false },
    createdBy: { type: 'string', required: false },
    updatedBy: { type: 'string', required: false },
    title: { type: 'string', required: true },
    slug: { type: 'string', required: false },
    description: { type: 'string', required: true },
    status: { type: 'string', required: false, values: ACCOMMODATION_STATUS_LIST },
    accommodationType: { type: 'string', required: false },
    capacity: { type: 'number', required: true, min: 1 },
    coordinates: {
      type: 'object',
      required: false,
      fields: {
        lat: { type: 'number', required: false },
        lng: { type: 'number', required: false },
      },
    },
    location: {
      type: 'object',
      required: false,
      fields: {
        address: { type: 'string', required: false },
        city: { type: 'string', required: false },
        region: { type: 'string', required: false },
        country: { type: 'string', required: false },
        postalCode: { type: 'string', required: false },
      },
    },
    checkInTime: { type: 'string', required: false },
    checkOutTime: { type: 'string', required: false },
    cancellationPolicy: { type: 'string', required: false },
    featured: { type: 'boolean', required: false },
    featuredMediaId: { type: 'string', required: false },
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
    previousStatus: { type: 'string', required: false },
  },
})

export function validateAccommodation(data) {
  return ACCOMMODATION_SCHEMA.validate(data)
}
