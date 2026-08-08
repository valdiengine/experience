/**
 * Configuration Validation Schemas
 * 
 * Zod schemas for validating configuration objects at each level
 * of the configuration hierarchy.
 */

import { z } from 'zod'

export const geographySchema = z.object({
  coordinates: z.array(z.number()).length(2).optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  archipelago: z.boolean().optional()
})

export const brandingColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
})

export const brandingSchema = z.object({
  colors: brandingColorsSchema.optional(),
  logo: z.string().url().optional(),
  favicon: z.string().url().optional(),
  overrides: z.object({
    applyDestinationBranding: z.boolean().optional(),
    except: z.array(z.string()).optional()
  }).optional()
})

export const mapsSchema = z.object({
  provider: z.enum(['mapbox', 'google', 'leaflet', 'none']).optional(),
  defaultCenter: z.array(z.number()).length(2).optional(),
  defaultZoom: z.number().min(1).max(20).optional(),
  apiKey: z.string().optional()
})

export const contactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional()
  }).optional()
})

export const socialSchema = z.object({
  instagram: z.string().url().optional(),
  facebook: z.string().url().optional(),
  twitter: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  tripadvisor: z.string().url().optional()
})

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  avatar: z.string().url().optional()
})

export const platformConfigSchema = z.object({
  code: z.string(),
  name: z.string().optional(),
  configVersion: z.string().optional(),
  theme: z.object({
    mode: z.enum(['light', 'dark', 'auto']).optional(),
    borderRadius: z.string().optional()
  }).optional(),
  i18n: z.object({
    defaultLocale: z.string(),
    fallbackLocale: z.string().optional(),
    supportedLocales: z.array(z.string())
  }).optional(),
  storage: z.object({
    prefix: z.string().optional()
  }).optional(),
  capabilities: z.object({
    defaults: z.array(z.string())
  }).optional()
})

export const countryConfigSchema = z.object({
  code: z.string().length(2),
  name: z.string().optional(),
  flag: z.string().emoji().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  configVersion: z.string().optional(),
  i18n: z.object({
    defaultLocale: z.string(),
    supportedLocales: z.array(z.string())
  }).optional(),
  enabledCategories: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
})

export const regionConfigSchema = z.object({
  code: z.string(),
  name: z.string().optional(),
  country: z.string().length(2),
  configVersion: z.string().optional(),
  geography: geographySchema.optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
  destinations: z.array(z.string()).optional(),
  enabledModules: z.array(z.string()).optional(),
  metadata: z.object({
    regionCode: z.string().optional(),
    capital: z.string().optional()
  }).optional()
})

export const destinationConfigSchema = z.object({
  slug: z.string(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  country: z.string().length(2),
  region: z.string(),
  configVersion: z.string().optional(),
  domain: z.string().optional(),
  geography: geographySchema.optional(),
  branding: brandingSchema.optional(),
  maps: mapsSchema.optional(),
  seo: z.object({
    keywords: z.array(z.string()).optional(),
    description: z.string().optional()
  }).optional(),
  enabledCategories: z.array(z.string()).optional(),
  enabledModules: z.array(z.string()).optional(),
  experienceType: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export const companyConfigSchema = z.object({
  slug: z.string(),
  code: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  country: z.string().length(2),
  region: z.string(),
  destination: z.string(),
  configVersion: z.string().optional(),
  branding: brandingSchema.optional(),
  contact: contactSchema.optional(),
  social: socialSchema.optional(),
  enabledCategories: z.array(z.string()).optional(),
  enabledModules: z.array(z.string()).optional(),
  team: z.array(teamMemberSchema).optional(),
  catalog: z.object({
    services: z.string().optional(),
    products: z.string().optional()
  }).optional(),
  providers: z.object({
    storage: z.string().optional(),
    media: z.string().optional()
  }).optional(),
  experienceType: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export function validatePlatformConfig(config) {
  return platformConfigSchema.safeParse(config)
}

export function validateCountryConfig(config) {
  return countryConfigSchema.safeParse(config)
}

export function validateRegionConfig(config) {
  return regionConfigSchema.safeParse(config)
}

export function validateDestinationConfig(config) {
  return destinationConfigSchema.safeParse(config)
}

export function validateCompanyConfig(config) {
  return companyConfigSchema.safeParse(config)
}

export function validateConfigurationHierarchy(configs) {
  const results = {
    platform: validatePlatformConfig(configs.platform || {}),
    country: validateCountryConfig(configs.country || {}),
    region: validateRegionConfig(configs.region || {}),
    destination: validateDestinationConfig(configs.destination || {}),
    company: validateCompanyConfig(configs.company || {})
  }

  const valid = Object.values(results).every(r => r.success)
  return { valid, results }
}
