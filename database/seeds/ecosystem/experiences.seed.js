/**
 * Ecosystem Seed — Experiences
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates initial Experience Engine configurations.
 * Experiences define the layout and composition of pages.
 */

export const EXPERIENCES_SEED = [
  {
    slug: 'tourism-landing',
    name: 'Tourism Landing Experience',
    type: 'tourism',
    description: 'Landing page experience for tourism destinations',
    shortDescription: 'Experience principal para destinos turísticos',
    layouts: {
      hero: {
        component: 'HeroSection',
        props: {
          showCta: true,
          showWeather: true,
          showMap: true,
        },
      },
      sections: [
        { component: 'ServicesSection', order: 1 },
        { component: 'GallerySection', order: 2 },
        { component: 'CompaniesSection', order: 3 },
        { component: 'ReservationsSection', order: 4 },
        { component: 'ReviewsSection', order: 5 },
        { component: 'ContactSection', order: 6 },
      ],
    },
    navigation: {
      header: {
        logo: true,
        menu: true,
        search: true,
        language: true,
      },
      footer: {
        links: true,
        social: true,
        newsletter: true,
      },
    },
    workflows: {
      reservation: {
        enabled: true,
        steps: ['select', 'details', 'payment', 'confirm'],
      },
    },
    seo: {
      titleTemplate: '%s | Tourism',
      descriptionTemplate: 'Discover %s - Your next travel destination',
    },
    i18n: {
      defaultLocale: 'es-CL',
      supportedLocales: ['es-CL', 'es', 'en'],
    },
    settings: {
      theme: 'valdivia-default',
      container: 'wide',
    },
    sortOrder: 1,
    status: 'published',
  },
  {
    slug: 'business-landing',
    name: 'Business Landing Experience',
    type: 'business',
    description: 'Landing page experience for businesses',
    shortDescription: 'Experience para landing de negocios',
    layouts: {
      hero: {
        component: 'BusinessHeroSection',
        props: {
          showCta: true,
          showContact: true,
          showGallery: true,
        },
      },
      sections: [
        { component: 'ServicesSection', order: 1 },
        { component: 'PortfolioSection', order: 2 },
        { component: 'TestimonialsSection', order: 3 },
        { component: 'PricingSection', order: 4 },
        { component: 'ContactSection', order: 5 },
      ],
    },
    navigation: {
      header: {
        logo: true,
        menu: true,
        contact: true,
      },
      footer: {
        links: true,
        social: true,
      },
    },
    workflows: {
      contact: {
        enabled: true,
        steps: ['form', 'confirm'],
      },
    },
    seo: {
      titleTemplate: '%s | Business',
      descriptionTemplate: '%s - Professional services',
    },
    settings: {
      theme: 'valdivia-default',
      container: 'standard',
    },
    sortOrder: 2,
    status: 'published',
  },
  {
    slug: 'accommodation-listing',
    name: 'Accommodation Listing Experience',
    type: 'accommodation',
    description: 'Experience for accommodation listing and booking',
    shortDescription: 'Experience para listar alojamientos',
    layouts: {
      hero: {
        component: 'AccommodationHeroSection',
        props: {
          showSearch: true,
          showFilters: true,
          showMap: true,
        },
      },
      sections: [
        { component: 'FilterSection', order: 1 },
        { component: 'ListingSection', order: 2 },
        { component: 'MapSection', order: 3 },
        { component: 'CategoriesSection', order: 4 },
      ],
    },
    navigation: {
      header: {
        logo: true,
        menu: true,
        search: true,
        filters: true,
      },
      footer: {
        links: true,
        social: true,
      },
    },
    workflows: {
      booking: {
        enabled: true,
        steps: ['select-dates', 'select-room', 'guest-details', 'payment', 'confirmation'],
      },
    },
    seo: {
      titleTemplate: '%s | Accommodations',
      descriptionTemplate: 'Find the perfect accommodation in %s',
    },
    settings: {
      theme: 'valdivia-default',
      container: 'wide',
    },
    sortOrder: 3,
    status: 'published',
  },
  {
    slug: 'tourism-destination',
    name: 'Tourism Destination Experience',
    type: 'destination',
    description: 'Full destination experience with all tourism features',
    shortDescription: 'Experience completo de destino turístico',
    layouts: {
      hero: {
        component: 'DestinationHeroSection',
        props: {
          showGallery: true,
          showWeather: true,
          showMap: true,
          showCta: true,
        },
      },
      sections: [
        { component: 'AboutSection', order: 1 },
        { component: 'ExperiencesSection', order: 2 },
        { component: 'CompaniesSection', order: 3 },
        { component: 'EventsSection', order: 4 },
        { component: 'GallerySection', order: 5 },
        { component: 'ReviewsSection', order: 6 },
        { component: 'WeatherSection', order: 7 },
        { component: 'MapSection', order: 8 },
        { component: 'ContactSection', order: 9 },
      ],
    },
    navigation: {
      header: {
        logo: true,
        menu: true,
        search: true,
        language: true,
        currency: true,
      },
      footer: {
        links: true,
        social: true,
        newsletter: true,
        emergency: true,
      },
    },
    workflows: {
      booking: {
        enabled: true,
        steps: ['select', 'details', 'payment', 'confirm'],
      },
      inquiry: {
        enabled: true,
        steps: ['form', 'confirm'],
      },
    },
    seo: {
      titleTemplate: '%s | Destination',
      descriptionTemplate: 'Explore %s - Activities, accommodations, and more',
    },
    i18n: {
      defaultLocale: 'es-CL',
      supportedLocales: ['es-CL', 'es', 'en'],
    },
    settings: {
      theme: 'valdivia-default',
      container: 'wide',
      sidebar: true,
    },
    sortOrder: 1,
    status: 'draft',
  },
]

export default EXPERIENCES_SEED
