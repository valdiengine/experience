/**
 * Schema Generator — JSON-LD structured data for SEO
 *
 * Business-agnostic: generates schemas based on tenant business type
 * Supports: LocalBusiness, Hotel, Restaurant, TouristAttraction, Service, Organization
 */
import { SCHEMA_TYPE } from '../public.schema.js'

export class SchemaGenerator {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Generate JSON-LD schema for a tenant
   * @param {object} tenant
   * @returns {object} JSON-LD schema
   */
  generate(tenant) {
    const businessType = tenant?.businessType || tenant?.type || SCHEMA_TYPE.LOCAL_BUSINESS
    const base = this.#baseSchema(tenant)

    switch (businessType) {
      case SCHEMA_TYPE.HOTEL:
        return this.#hotelSchema(base, tenant)
      case SCHEMA_TYPE.RESTAURANT:
        return this.#restaurantSchema(base, tenant)
      case SCHEMA_TYPE.TOURIST_ATTRACTION:
        return this.#touristAttractionSchema(base, tenant)
      case SCHEMA_TYPE.SERVICE:
        return this.#serviceSchema(base, tenant)
      case SCHEMA_TYPE.ORGANIZATION:
        return this.#organizationSchema(base, tenant)
      default:
        return this.#localBusinessSchema(base, tenant)
    }
  }

  /**
   * Generate schema for a specific page
   * @param {object} page
   * @param {object} tenant
   * @returns {object}
   */
  generateForPage(page, tenant) {
    const base = this.#baseSchema(tenant)
    return {
      ...base,
      '@type': 'WebPage',
      name: page.title,
      description: page.description,
      url: `${window.location.origin}/${tenant?.slug || ''}/${page.slug || ''}`,
    }
  }

  /**
   * Generate BreadcrumbList schema
   * @param {object[]} items - [{ name, url }]
   * @returns {object}
   */
  generateBreadcrumb(items) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    }
  }

  /**
   * Generate FAQ schema
   * @param {object[]} faqs - [{ question, answer }]
   * @returns {object}
   */
  generateFAQ(faqs) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    }
  }

  /**
   * Inject JSON-LD into document head
   * @param {object} schema
   */
  inject(schema) {
    let script = document.querySelector('script[type="application/ld+json"][data-schema-id]')
    if (!script) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.schemaId = schema['@type'] || 'schema'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(schema, null, 2)
  }

  /**
   * Inject multiple schemas
   * @param {object[]} schemas
   */
  injectAll(schemas) {
    schemas.forEach(schema => this.inject(schema))
  }

  // ── Base Schema ──

  #baseSchema(tenant) {
    return {
      '@context': 'https://schema.org',
      name: tenant?.name || '',
      description: tenant?.description || '',
      url: window.location.origin,
      logo: tenant?.logo || '',
      image: tenant?.image || tenant?.logo || '',
      telephone: tenant?.phone || '',
      email: tenant?.email || '',
      address: this.#formatAddress(tenant?.address),
      geo: tenant?.coordinates ? {
        '@type': 'GeoCoordinates',
        latitude: tenant.coordinates.lat,
        longitude: tenant.coordinates.lng,
      } : undefined,
      sameAs: tenant?.socialMedia || [],
    }
  }

  #formatAddress(addr) {
    if (!addr) return undefined
    return {
      '@type': 'PostalAddress',
      streetAddress: addr.street || '',
      addressLocality: addr.city || '',
      addressRegion: addr.state || '',
      postalCode: addr.zip || '',
      addressCountry: addr.country || '',
    }
  }

  // ── Business Type Schemas ──

  #localBusinessSchema(base, tenant) {
    return {
      ...base,
      '@type': 'LocalBusiness',
      priceRange: tenant?.priceRange || '$$',
      openingHours: this.#formatHours(tenant?.hours),
      aggregateRating: tenant?.rating ? {
        '@type': 'AggregateRating',
        ratingValue: tenant.rating.value,
        reviewCount: tenant.rating.count,
      } : undefined,
    }
  }

  #hotelSchema(base, tenant) {
    return {
      ...base,
      '@type': 'Hotel',
      starRating: tenant?.starRating || { '@type': 'Rating', ratingValue: 3 },
      numberOfRooms: tenant?.rooms,
      checkinTime: tenant?.checkinTime || '14:00',
      checkoutTime: tenant?.checkoutTime || '12:00',
      amenityFeature: (tenant?.amenities || []).map(a => ({
        '@type': 'LocationFeatureSpecification',
        name: a,
        value: true,
      })),
    }
  }

  #restaurantSchema(base, tenant) {
    return {
      ...base,
      '@type': 'Restaurant',
      servesCuisine: tenant?.cuisine || '',
      menu: tenant?.menuUrl || '',
      acceptsReservations: true,
      priceRange: tenant?.priceRange || '$$',
      openingHours: this.#formatHours(tenant?.hours),
    }
  }

  #touristAttractionSchema(base, tenant) {
    return {
      ...base,
      '@type': 'TouristAttraction',
      touristType: tenant?.touristType || '',
      availableLanguage: tenant?.languages || ['es'],
      isAccessibleForFree: tenant?.free || false,
    }
  }

  #serviceSchema(base, tenant) {
    return {
      ...base,
      '@type': 'Service',
      serviceType: tenant?.serviceType || '',
      provider: {
        '@type': 'Organization',
        name: tenant?.name,
      },
      areaServed: tenant?.areaServed || '',
      hasOfferCatalog: tenant?.services ? {
        '@type': 'OfferCatalog',
        itemListElement: tenant.services.map(s => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: s.name,
            description: s.description,
          },
        })),
      } : undefined,
    }
  }

  #organizationSchema(base, tenant) {
    return {
      ...base,
      '@type': 'Organization',
      foundingDate: tenant?.foundingDate,
      numberOfEmployees: tenant?.employees,
    }
  }

  #formatHours(hours) {
    if (!hours || typeof hours !== 'object') return undefined
    return Object.entries(hours).map(([day, times]) => `${day} ${times}`).join(', ')
  }
}
