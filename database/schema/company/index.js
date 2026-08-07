import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from '../platform/index.js'
import { destinations } from '../platform/index.js'

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    destinationId: uuid('destination_id').references(() => destinations.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    type: varchar('type', { length: 50 }).default('business'),
    status: varchar('status', { length: 50 }).default('active'),
    logo: varchar('logo', { length: 500 }),
    coverImage: varchar('cover_image', { length: 500 }),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 500 }),
    contact: jsonb('contact').default({}),
    location: jsonb('location').default({}),
    hours: jsonb('hours').default({}),
    social: jsonb('social').default({}),
    website: varchar('website', { length: 500 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    taxId: varchar('tax_id', { length: 50 }),
    registrationNumber: varchar('registration_number', { length: 100 }),
    foundedYear: integer('founded_year'),
    employeeCount: varchar('employee_count', { length: 50 }),
    branding: jsonb('branding').default({}),
    metadata: jsonb('metadata').default({}),
    settings: jsonb('settings').default({}),
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_company_slug').on(table.slug),
    index('idx_company_tenant_id').on(table.tenantId),
    index('idx_company_destination_id').on(table.destinationId),
    index('idx_company_type').on(table.type),
    index('idx_company_status').on(table.status),
    index('idx_company_sort_order').on(table.sortOrder),
  ],
)

export const companyProfiles = pgTable(
  'company_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    bio: text('bio'),
    story: text('story'),
    mission: text('mission'),
    vision: text('vision'),
    values: jsonb('values').default([]),
    team: jsonb('team').default([]),
    awards: jsonb('awards').default([]),
    certifications: jsonb('certifications').default([]),
    associations: jsonb('associations').default([]),
    media: jsonb('media').default({}),
    gallery: jsonb('gallery').default([]),
    announcements: jsonb('announcements').default([]),
    metadata: jsonb('metadata').default({}),
    isPublished: boolean('is_published').default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_company_profile_company_id').on(table.companyId),
    index('idx_company_profile_is_published').on(table.isPublished),
  ],
)

export const companyModules = pgTable(
  'company_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id'),
    moduleCode: varchar('module_code', { length: 100 }).notNull(),
    moduleName: varchar('module_name', { length: 255 }),
    status: varchar('status', { length: 50 }).default('active'),
    configuration: jsonb('configuration').default({}),
    permissions: jsonb('permissions').default([]),
    isEnabled: boolean('is_enabled').default(false),
    enabledAt: timestamp('enabled_at', { withTimezone: true }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_company_module_company_module').on(table.companyId, table.moduleCode),
    index('idx_company_module_company_id').on(table.companyId),
    index('idx_company_module_status').on(table.status),
    index('idx_company_module_is_enabled').on(table.isEnabled),
  ],
)

export const companySettings = pgTable(
  'company_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }).unique(),
    timezone: varchar('timezone', { length: 100 }).default('UTC'),
    locale: varchar('locale', { length: 10 }).default('en'),
    currency: varchar('currency', { length: 3 }).default('USD'),
    dateFormat: varchar('date_format', { length: 50 }).default('YYYY-MM-DD'),
    timeFormat: varchar('time_format', { length: 20 }).default('HH:mm'),
    weekStartDay: integer('week_start_day').default(0),
    businessRules: jsonb('business_rules').default({}),
    bookingRules: jsonb('booking_rules').default({}),
    cancellationPolicy: jsonb('cancellation_policy').default({}),
    paymentSettings: jsonb('payment_settings').default({}),
    notificationSettings: jsonb('notification_settings').default({}),
    privacySettings: jsonb('privacy_settings').default({}),
    integrationSettings: jsonb('integration_settings').default({}),
    customFields: jsonb('custom_fields').default([]),
    metadata: jsonb('metadata').default({}),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_company_settings_company_id').on(table.companyId),
    index('idx_company_settings_timezone').on(table.timezone),
    index('idx_company_settings_locale').on(table.locale),
    index('idx_company_settings_currency').on(table.currency),
  ],
)

export const companySchemas = {
  companies,
  companyProfiles,
  companyModules,
  companySettings,
}

export default companySchemas
