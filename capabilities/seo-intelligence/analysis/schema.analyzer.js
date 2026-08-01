/**
 * Schema Analyzer — Validates JSON-LD structured data
 *
 * Business-agnostic: validates schema structure, not business content
 * Supports: LocalBusiness, Hotel, Restaurant, TouristAttraction, Service, Organization
 */
import { SEO_ISSUE_SEVERITY, SEO_ISSUE_TYPE } from '../seo-intelligence.schema.js'

const REQUIRED_FIELDS_BY_TYPE = {
  LocalBusiness: ['name', 'address', 'telephone'],
  Hotel: ['name', 'address', 'starRating'],
  Restaurant: ['name', 'address', 'servesCuisine'],
  TouristAttraction: ['name', 'description'],
  Service: ['name', 'serviceType', 'provider'],
  Organization: ['name'],
  WebPage: ['name', 'description', 'url'],
}

export class SchemaAnalyzer {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Analyze schemas for all pages
   * @param {object[]} pages - Normalized pages with seo.jsonLd
   * @param {object} tenant - Tenant configuration
   * @returns {object[]}
   */
  analyze(pages, tenant) {
    const issues = []

    if (tenant?.schema) {
      issues.push(...this.#analyzeTenantSchema(tenant))
    } else {
      issues.push({
        pageId: tenant?.id || 'tenant',
        type: SEO_ISSUE_TYPE.MISSING_SCHEMA,
        severity: SEO_ISSUE_SEVERITY.CRITICAL,
        message: 'No structured data (JSON-LD) configured for tenant',
        field: 'schema',
      })
    }

    pages.forEach(page => {
      if (page.seo?.jsonLd) {
        issues.push(...this.#analyzePageSchema(page))
      }
    })

    return issues
  }

  /**
   * Validate a JSON-LD schema object
   * @param {object} schema
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(schema) {
    const errors = []

    if (!schema) {
      return { valid: false, errors: ['Schema is null or undefined'] }
    }

    if (!schema['@context']) {
      errors.push('Missing @context')
    }

    if (!schema['@type']) {
      errors.push('Missing @type')
    }

    const type = schema['@type']
    if (type && REQUIRED_FIELDS_BY_TYPE[type]) {
      REQUIRED_FIELDS_BY_TYPE[type].forEach(field => {
        if (!schema[field]) {
          errors.push(`Missing required field for ${type}: ${field}`)
        }
      })
    }

    if (schema.address) {
      if (!schema.address.streetAddress && !schema.address.addressLocality) {
        errors.push('Address has no street or city')
      }
    }

    return { valid: errors.length === 0, errors }
  }

  #analyzeTenantSchema(tenant) {
    const issues = []
    const schema = tenant.schema
    const result = this.validate(schema)

    if (!result.valid) {
      result.errors.forEach(error => {
        issues.push({
          pageId: tenant.id,
          type: SEO_ISSUE_TYPE.MISSING_SCHEMA,
          severity: SEO_ISSUE_SEVERITY.WARNING,
          message: `Tenant schema: ${error}`,
          field: 'schema',
        })
      })
    }

    if (schema.sameAs && Array.isArray(schema.sameAs)) {
      const emptyLinks = schema.sameAs.filter(url => !url || url.trim().length === 0)
      if (emptyLinks.length > 0) {
        issues.push({
          pageId: tenant.id,
          type: SEO_ISSUE_TYPE.MISSING_SCHEMA,
          severity: SEO_ISSUE_SEVERITY.INFO,
          message: 'Tenant schema has empty social media links',
          field: 'schema.sameAs',
        })
      }
    }

    return issues
  }

  #analyzePageSchema(page) {
    const issues = []
    const schema = page.seo.jsonLd

    if (!schema['@type']) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.MISSING_SCHEMA,
        severity: SEO_ISSUE_SEVERITY.WARNING,
        message: 'Page schema missing @type',
        field: 'seo.jsonLd',
      })
    }

    if (!schema.name) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.MISSING_SCHEMA,
        severity: SEO_ISSUE_SEVERITY.INFO,
        message: 'Page schema missing name',
        field: 'seo.jsonLd',
      })
    }

    return issues
  }
}
