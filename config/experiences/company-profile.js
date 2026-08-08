/**
 * Company Profile Experience Configuration
 * 
 * Experience configuration for company profile pages.
 */

export default {
  id: 'company-profile',
  name: 'Company Profile',
  type: 'profile',
  description: 'Business profile with services and contact',

  configVersion: '1.0',

  sections: [
    'hero',
    'about',
    'services',
    'gallery',
    'team',
    'testimonials',
    'contact',
    'footer'
  ],

  components: [
    'hero-carousel',
    'about-section',
    'service-grid',
    'image-gallery',
    'team-list',
    'testimonial-slider',
    'contact-form',
    'map-embed'
  ],

  modules: [
    'gallery',
    'media',
    'notifications',
    'maps'
  ],

  capabilities: [
    'cms',
    'media',
    'notifications',
    'communication',
    'maps'
  ],

  theme: {
    layout: 'profile',
    heroStyle: 'fullwidth',
    galleryStyle: 'masonry'
  },

  layout: {
    heroHeight: '70vh',
    sections: {
      about: { style: 'split', imagePosition: 'left' },
      services: { style: 'grid', columns: 3 },
      gallery: { style: 'masonry', columns: 4 }
    }
  },

  metadata: {
    experienceId: 'company-profile',
    category: 'general',
    industry: 'multi'
  }
}
