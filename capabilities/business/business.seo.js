export class BusinessSeo {
  static generate(business) {
    return {
      title: business.seo?.title || business.name,
      description: business.seo?.description || (business.description ? business.description.substring(0, 160) : ''),
      keywords: business.seo?.keywords || [business.category, business.city].filter(Boolean),
      ogImage: business.seo?.ogImage || business.coverImage || business.logo || null,
      ogType: 'business',
      ogLocale: business.language || 'es_CL',
      canonical: business.website || null,
      structuredData: BusinessSeo.#generateStructuredData(business),
    }
  }

  static #generateStructuredData(business) {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: business.name,
      legalName: business.legalName || undefined,
      description: business.description,
      url: business.website || undefined,
      email: business.contactEmail,
      telephone: business.contactPhone || undefined,
      image: business.logo || undefined,
      address: business.address ? {
        '@type': 'PostalAddress',
        streetAddress: business.address,
        addressLocality: business.city || undefined,
      } : undefined,
      geo: business.coordinates ? {
        '@type': 'GeoCoordinates',
        latitude: business.coordinates.lat,
        longitude: business.coordinates.lng,
      } : undefined,
    }
  }

  static toPayload(seo) {
    return {
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      og_image: seo.ogImage,
      og_type: seo.ogType,
      og_locale: seo.ogLocale,
      canonical: seo.canonical,
      structured_data: seo.structuredData,
    }
  }
}
