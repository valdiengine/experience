/**
 * Media Schema
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Database schema for media assets:
 * - media_assets: Core media records
 * - media_variants: Generated variants
 * - media_metadata: Technical metadata
 * - media_jobs: Processing queue
 * - media_relationships: Parent-child relationships
 * - media_permissions: Access control
 * - media_lifecycle: Lifecycle tracking
 */

import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './platform/index.js'
import { destinations } from './platform/index.js'
import { companies } from './company/index.js'

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    destinationId: uuid('destination_id').references(() => destinations.id, { onDelete: 'set null' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),

    assetId: uuid('asset_id').notNull(),
    url: varchar('url', { length: 1000 }),
    cdnUrl: varchar('cdn_url', { length: 1000 }),

    type: varchar('type', { length: 50 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),

    originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),

    status: varchar('status', { length: 50 }).default('pending'),
    processingStatus: varchar('processing_status', { length: 50 }).default('pending'),

    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'),
    format: varchar('format', { length: 50 }),

    metadata: jsonb('metadata').default({}),

    parentId: uuid('parent_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    isVariant: boolean('is_variant').default(false),
    variantName: varchar('variant_name', { length: 100 }),

    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_media_asset_asset_id').on(table.assetId),
    index('idx_media_tenant_id').on(table.tenantId),
    index('idx_media_destination_id').on(table.destinationId),
    index('idx_media_company_id').on(table.companyId),
    index('idx_media_type').on(table.type),
    index('idx_media_category').on(table.category),
    index('idx_media_status').on(table.status),
    index('idx_media_parent_id').on(table.parentId),
    index('idx_media_created_at').on(table.createdAt),
  ],
)

export const mediaVariants = pgTable(
  'media_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),

    variantName: varchar('variant_name', { length: 100 }).notNull(),
    assetId: uuid('asset_id').notNull(),
    url: varchar('url', { length: 1000 }),
    cdnUrl: varchar('cdn_url', { length: 1000 }),

    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),

    width: integer('width'),
    height: integer('height'),
    quality: integer('quality'),

    settings: jsonb('settings').default({}),
    metadata: jsonb('metadata').default({}),

    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_media_variant_media_name').on(table.mediaId, table.variantName),
    index('idx_media_variant_asset_id').on(table.assetId),
  ],
)

export const mediaMetadata = pgTable(
  'media_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),

    width: integer('width'),
    height: integer('height'),
    aspectRatio: varchar('aspect_ratio', { length: 20 }),
    orientation: integer('orientation'),
    duration: integer('duration'),
    frameRate: integer('frame_rate'),
    bitrate: integer('bitrate'),
    codec: varchar('codec', { length: 50 }),
    colorSpace: varchar('color_space', { length: 50 }),
    hasAlpha: boolean('has_alpha').default(false),
    pageCount: integer('page_count'),

    exif: jsonb('exif').default({}),
    icc: jsonb('icc').default({}),
    xmp: jsonb('xmp').default({}),

    dominantColors: jsonb('dominant_colors').default([]),
    gps: jsonb('gps'),
    author: varchar('author', { length: 255 }),
    copyright: varchar('copyright', { length: 500 }),

    technical: jsonb('technical').default({}),
    custom: jsonb('custom').default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_media_metadata_media_id').on(table.mediaId),
  ],
)

export const mediaJobs = pgTable(
  'media_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

    jobId: varchar('job_id', { length: 100 }).notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(),

    status: varchar('status', { length: 50 }).default('pending'),
    progress: integer('progress').default(0),
    error: text('error'),

    input: jsonb('input').default({}),
    output: jsonb('output').default({}),
    options: jsonb('options').default({}),

    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    attempts: integer('attempts').default(0),
    maxAttempts: integer('max_attempts').default(3),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_media_job_id').on(table.jobId),
    index('idx_media_job_media_id').on(table.mediaId),
    index('idx_media_job_tenant_id').on(table.tenantId),
    index('idx_media_job_status').on(table.status),
    index('idx_media_job_created_at').on(table.createdAt),
  ],
)

export const mediaRelationships = pgTable(
  'media_relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),
    childId: uuid('child_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),

    relationshipType: varchar('relationship_type', { length: 50 }).notNull(),
    sortOrder: integer('sort_order').default(0),

    metadata: jsonb('metadata').default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_media_rel_parent_child').on(table.parentId, table.childId),
    index('idx_media_rel_parent_id').on(table.parentId),
    index('idx_media_rel_child_id').on(table.childId),
    index('idx_media_rel_type').on(table.relationshipType),
  ],
)

export const mediaPermissions = pgTable(
  'media_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),

    principalType: varchar('principal_type', { length: 50 }).notNull(),
    principalId: uuid('principal_id'),

    permission: varchar('permission', { length: 50 }).notNull(),
    access: varchar('access', { length: 50 }).default('granted'),

    expiresAt: timestamp('expires_at', { withTimezone: true }),

    grantedBy: uuid('granted_by'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_media_perm_media_id').on(table.mediaId),
    index('idx_media_perm_principal').on(table.principalType, table.principalId),
  ],
)

export const mediaLifecycle = pgTable(
  'media_lifecycle',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),

    event: varchar('event', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }),

    metadata: jsonb('metadata').default({}),

    triggeredBy: uuid('triggered_by'),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_media_lifecycle_media_id').on(table.mediaId),
    index('idx_media_lifecycle_event').on(table.event),
    index('idx_media_lifecycle_triggered_at').on(table.triggeredAt),
  ],
)

export const mediaSchemas = {
  mediaAssets,
  mediaVariants,
  mediaMetadata,
  mediaJobs,
  mediaRelationships,
  mediaPermissions,
  mediaLifecycle,
}

export default mediaSchemas
