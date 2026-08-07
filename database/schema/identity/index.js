import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from '../platform/index.js'
import { companies } from '../company/index.js'

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 100 }),
    passwordHash: varchar('password_hash', { length: 255 }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    displayName: varchar('display_name', { length: 255 }),
    avatar: varchar('avatar', { length: 500 }),
    type: varchar('type', { length: 50 }).default('user'),
    status: varchar('status', { length: 50 }).default('active'),
    emailVerified: boolean('email_verified').default(false),
    phoneVerified: boolean('phone_verified').default(false),
    phone: varchar('phone', { length: 50 }),
    preferredLanguage: varchar('preferred_language', { length: 10 }),
    preferredCurrency: varchar('preferred_currency', { length: 3 }),
    timezone: varchar('timezone', { length: 100 }),
    profile: jsonb('profile').default({}),
    preferences: jsonb('preferences').default({}),
    metadata: jsonb('metadata').default({}),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    failedLoginAttempts: integer('failed_login_attempts').default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
    mfaEnabled: boolean('mfa_enabled').default(false),
    mfaSecret: varchar('mfa_secret', { length: 255 }),
    mfaMethods: jsonb('mfa_methods').default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_user_email').on(table.email),
    uniqueIndex('idx_user_username').on(table.username),
    index('idx_user_tenant_id').on(table.tenantId),
    index('idx_user_company_id').on(table.companyId),
    index('idx_user_type').on(table.type),
    index('idx_user_status').on(table.status),
    index('idx_user_deleted_at').on(table.deletedAt),
  ],
)

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    type: varchar('type', { length: 50 }).default('custom'),
    description: text('description'),
    permissions: jsonb('permissions').default([]),
    isSystem: boolean('is_system').default(false),
    isDefault: boolean('is_default').default(false),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_role_tenant_company_slug').on(table.tenantId, table.companyId, table.slug),
    index('idx_role_tenant_id').on(table.tenantId),
    index('idx_role_company_id').on(table.companyId),
    index('idx_role_type').on(table.type),
    index('idx_role_is_system').on(table.isSystem),
    index('idx_role_is_default').on(table.isDefault),
  ],
)

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    resource: varchar('resource', { length: 100 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    description: text('description'),
    attributes: jsonb('attributes').default([]),
    conditions: jsonb('conditions').default({}),
    metadata: jsonb('metadata').default({}),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_permission_slug').on(table.slug),
    uniqueIndex('idx_permission_resource_action').on(table.resource, table.action),
    index('idx_permission_resource').on(table.resource),
    index('idx_permission_action').on(table.action),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').default(true),
    grantedBy: uuid('granted_by').references(() => users.id, { onDelete: 'set null' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_user_role_user_role').on(table.userId, table.roleId),
    index('idx_user_role_user_id').on(table.userId),
    index('idx_user_role_role_id').on(table.roleId),
    index('idx_user_role_tenant_id').on(table.tenantId),
    index('idx_user_role_company_id').on(table.companyId),
  ],
)

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
    deviceInfo: jsonb('device_info').default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    type: varchar('type', { length: 50 }).default('web'),
    status: varchar('status', { length: 50 }).default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_user_session_token_hash').on(table.tokenHash),
    index('idx_user_session_user_id').on(table.userId),
    index('idx_user_session_status').on(table.status),
    index('idx_user_session_expires_at').on(table.expiresAt),
  ],
)

export const identitySchemas = {
  users,
  roles,
  permissions,
  userRoles,
  userSessions,
}

export default identitySchemas
