/**
 * Tourism Directory Experience Configuration
 * 
 * Experience configuration for tourism directory platforms.
 */

export default {
  id: 'tourism-directory',
  name: 'Tourism Directory',
  type: 'directory',
  description: 'Directory of tourism businesses and services',

  configVersion: '1.0',

  sections: [
    'hero',
    'search',
    'categories',
    'featured',
    'map',
    'testimonials',
    'footer'
  ],

  components: [
    'search-bar',
    'category-grid',
    'business-list',
    'map-view',
    'filter-panel',
    'contact-form'
  ],

  modules: [
    'reservations',
    'availability',
    'gallery',
    'media',
    'maps',
    'notifications',
    'analytics'
  ],

  capabilities: [
    'reservation',
    'booking',
    'availability',
    'cms',
    'media',
    'maps',
    'notifications',
    'communication',
    'intelligence'
  ],

  theme: {
    layout: 'directory',
    cardStyle: 'modern',
    mapPosition: 'right'
  },

  layout: {
    heroHeight: '60vh',
    gridColumns: 3,
    sidebarEnabled: true
  },

  metadata: {
    experienceId: 'tourism-directory',
    category: 'tourism',
    industry: 'tourism'
  }
}
