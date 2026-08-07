/**
 * Storage Schema
 *
 * P12.3.2.0 — Storage Architecture Definition
 *
 * Database schema for storage layer:
 * - assets: Central registry of every stored object
 * - asset_metadata: Technical information (size, mime, dimensions, checksum)
 * - asset_versions: Thumbnails, optimized images, transformations
 * - storage_providers: Provider registry (local, S3, R2, etc.)
 * - storage_locations: Physical storage references
 * - asset_permissions: Access control
 */

import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './platform/index.js'
import { destinations } from './platform/index.js'
import { companies } from './company/index.js'

export const storageProviders = pgTable(
  'storage_providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    config: jsonb('config').default({}),
    isDefault: boolean('is_default').default(false),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_storage_provider_code').on(table.code),
    index('idx_storage_provider_type').on(table.type),
    index('idx_storage_provider_is_default').on(table.isDefault),
  ],
)

export const storageLocations = pgTable(
  'storage_locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerId: uuid('provider_id').notNull().references(() => storageProviders.id, { onDelete: 'restrict' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    destinationId: uuid('destination_id').references(() => destinations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    path: varchar('path', { length: 500 }),
    baseUrl: varchar('base_url', { length: 500 }),
    region: varchar('region', { length: 50 }),
    quotaBytes: integer('quota_bytes'),
    usedBytes: integer('used_bytes').default(0),
    isDefault: boolean('is_default').default(false),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_storage_location_name').on(table.name),
    index('idx_storage_location_provider_id').on(table.providerId),
    index('idx_storage_location_tenant_id').on(table.tenantId),
    index('idx_storage_location_destination_id').on(table.destinationId),
  ],
)

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    destinationId: uuid('destination_id').references(() => destinations.id, { onDelete: 'set null' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    locationId: uuid('location_id').references(() => storageLocations.id, { onDelete: 'set null' }),

    type: varchar('type', { length: 50 }).notNull(),
    access: varchar('access', { length: 50 }).default('public'),
    status: varchar('status', { length: 50 }).default('active'),

    originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
    storedFileName: varchar('stored_file_name', { length: 255 }).notNull(),
    filePath: varchar('file_path', { length: 500 }),
    fileSize: integer('file_size').notNull(),
    mimeType: varchar('mime_type', { length: 100 }),

    url: varchar('url', { length: 1000 }),
    cdnUrl: varchar('cdn_url', { length: 1000 }),

    alt: varchar('alt', { length: 500 }),
    title: varchar('title', { length: 255 }),
    description: text('description'),

    folder: varchar('folder', { length: 255 }),

    checksum: varchar('checksum', { length: 64 }),
    etag: varchar('etag', { length: 64 }),

    metadata: jsonb('metadata').default({}),
    tags: jsonb('tags').default([]),
    settings: jsonb('settings').default({}),

    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
    accessCount: integer('access_count').default(0),

    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_asset_stored_filename').on(table.storedFileName),
    index('idx_asset_tenant_id').on(table.tenantId),
    index('idx_asset_destination_id').on(table.destinationId),
    index('idx_asset_company_id').on(table.companyId),
    index('idx_asset_user_id').on(table.userId),
    index('idx_asset_type').on(table.type),
    index('idx_asset_access').on(table.access),
    index('idx_asset_status').on(table.status),
    index('idx_asset_folder').on(table.folder),
    index('idx_asset_created_at').on(table.createdAt),
    index('idx_asset_is_active').on(table.isActive),
  ],
)

export const assetMetadata = pgTable(
  'asset_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),

    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'),
    codec: varchar('codec', { length: 50 }),
    bitrate: integer('bitrate'),
    frameRate: integer('frame_rate'),

    colorspace: varchar('colorspace', { length: 50 }),
    density: integer('density'),

    hasAlpha: boolean('has_alpha').default(false),
    isAnimated: boolean('is_animated').default(false),

    processingStatus: varchar('processing_status', { length: 50 }).default('pending'),
    processingError: text('processing_error'),
    processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
    processingCompletedAt: timestamp('processing_completed_at', { withTimezone: true }),

    thumbnailsGenerated: boolean('thumbnails_generated').default(false),
    optimizedGenerated: boolean('optimized_generated').default(false),

    metadata: jsonb('metadata').default({}),
    exif: jsonb('exif').default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_asset_metadata_asset_id').on(table.assetId),
    index('idx_asset_metadata_processing_status').on(table.processingStatus),
  ],
)

export const assetVersions = pgTable(
  'asset_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),

    versionType: varchar('version_type', { length: 50 }).notNull(),
    variant: varchar('variant', { length: 100 }),

    originalVersionId: uuid('original_version_id').references(() => assetVersions.id, { onDelete: 'set null' }),

    storedFileName: varchar('stored_file_name', { length: 255 }).notNull(),
    filePath: varchar('file_path', { length: 500 }),
    fileSize: integer('file_size'),

    width: integer('width'),
    height: integer('height'),
    mimeType: varchar('mime_type', { length: 100 }),

    url: varchar('url', { length: 1000 }),
    cdnUrl: varchar('cdn_url', { length: 1000 }),

    settings: jsonb('settings').default({}),

    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_asset_version_asset_id').on(table.assetId),
    index('idx_asset_version_type').on(table.versionType),
    index('idx_asset_version_variant').on(table.variant),
    index('idx_asset_version_is_active').on(table.isActive),
  ],
)

export const assetPermissions = pgTable(
  'asset_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),

    principalType: varchar('principal_type', { length: 50 }).notNull(),
    principalId: uuid('principal_id'),

    permission: varchar('permission', { length: 50 }).notNull(),
    access: varchar('access', { length: 50 }).default('granted'),

    expiresAt: timestamp('expires_at', { withTimezone: true }),

    metadata: jsonb('metadata').default({}),

    grantedBy: uuid('granted_by'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_asset_permission_asset_id').on(table.assetId),
    index('idx_asset_permission_principal').on(table.principalType, table.principalId),
    index('idx_asset_permission_permission').on(table.permission),
  ],
)

export const storageSchemas = {
  storageProviders,
  storageLocations,
  assets,
  assetMetadata,
  assetVersions,
  assetPermissions,
}

export default storageSchemas
