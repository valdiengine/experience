/**
 * Public Events — Event definitions for public experience
 */
export const PUBLIC_EVENTS = {
  // Loading
  LOADED: 'public:loaded',
  PAGE_RENDERED: 'public:page_rendered',

  // Navigation
  ROUTE_CHANGED: 'public:route_changed',
  MENU_CLICKED: 'public:menu_clicked',

  // SEO
  SEO_GENERATED: 'public:seo_generated',
  METADATA_UPDATED: 'public:metadata_updated',

  // PWA
  PWA_READY: 'public:pwa_ready',
  PWA_INSTALL_PROMPTED: 'public:pwa_install_prompted',

  // Reservation
  RESERVATION_OPENED: 'public:reservation_opened',
  RESERVATION_SUBMITTED: 'public:reservation_submitted',

  // CMS
  CMS_CONTENT_LOADED: 'public:cms_content_loaded',
  CMS_CONTENT_RENDERED: 'public:cms_content_rendered',
}
