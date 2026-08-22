/**
 * Gallery Component
 * 
 * Renders image gallery with lightbox/presentation state.
 * Consumes ExperienceViewModel - configuration-driven, destination-independent.
 * Media references only - does NOT access storage providers directly.
 */

import { BaseComponent, COMPONENT_EVENTS } from './base.component.js'

export class GalleryComponent extends BaseComponent {
  #lightboxOpen = false
  #selectedIndex = 0

  constructor(viewModel, props = {}) {
    super(viewModel, props)
    this.requiredViewModelProps = []
  }

  render() {
    const destination = this.getDestination()
    const branding = this.getBranding()
    const theme = this.getTheme()
    const images = this.#getGalleryImages()

    const gallery = {
      component: 'gallery',
      id: 'gallery-section',
      content: {
        title: 'Galería',
        subtitle: `Imágenes de ${destination.name}`,
        empty: images.length === 0
      },
      images: images,
      thumbnails: images.slice(0, 6).map((img, idx) => ({
        ...img,
        index: idx,
        selected: idx === this.#selectedIndex
      })),
      lightbox: {
        enabled: true,
        open: this.#lightboxOpen,
        currentIndex: this.#selectedIndex,
        currentImage: images[this.#selectedIndex] || null
      },
      theme: {
        mode: theme.mode,
        spacing: theme.spacing,
        borderRadius: theme.borderRadius,
        colors: branding.colors
      },
      branding: {
        colors: branding.colors
      },
      accessibility: {
        role: 'region',
        label: `Image gallery for ${destination.name}`,
        itemType: 'img'
      },
      layout: {
        columns: {
          mobile: 2,
          tablet: 3,
          desktop: 4
        },
        gap: theme.spacing
      },
      events: {
        onImageClick: { event: COMPONENT_EVENTS.GALLERY_OPEN },
        onThumbnailClick: { event: COMPONENT_EVENTS.GALLERY_NAVIGATE },
        onLightboxClose: { event: COMPONENT_EVENTS.GALLERY_CLOSE },
        onLightboxNext: { event: COMPONENT_EVENTS.GALLERY_NAVIGATE, direction: 'next' },
        onLightboxPrev: { event: COMPONENT_EVENTS.GALLERY_NAVIGATE, direction: 'prev' }
      }
    }

    this.emit(COMPONENT_EVENTS.RENDER, { component: 'gallery', data: gallery })
    return gallery
  }

  #getGalleryImages() {
    const destination = this.viewModel.destination
    const featured = destination?.featured
    
    if (!featured || !featured.items) {
      return this.#getDefaultImages()
    }

    return featured.items.map((item, index) => ({
      id: item.id || `gallery-${index}`,
      src: item.image || item.src || '/assets/placeholder.jpg',
      alt: item.title || item.name || `Gallery image ${index + 1}`,
      title: item.title || '',
      caption: item.description || ''
    }))
  }

  #getDefaultImages() {
    return [
      {
        id: 'gallery-1',
        src: '/assets/gallery/placeholder-1.jpg',
        alt: 'Featured location',
        title: 'Ubicación destacada',
        caption: 'Una vista hermosa de la región'
      },
      {
        id: 'gallery-2',
        src: '/assets/gallery/placeholder-2.jpg',
        alt: 'Local business',
        title: 'Negocio local',
        caption: 'Conoce nuestros negocios asociados'
      },
      {
        id: 'gallery-3',
        src: '/assets/gallery/placeholder-3.jpg',
        alt: 'Tourism experience',
        title: 'Experiencia turística',
        caption: 'Vive experiencias únicas'
      },
      {
        id: 'gallery-4',
        src: '/assets/gallery/placeholder-4.jpg',
        alt: 'Natural landscape',
        title: 'Paisaje natural',
        caption: 'Disfruta de la naturaleza'
      }
    ]
  }

  openLightbox(index = 0) {
    this.#selectedIndex = index
    this.#lightboxOpen = true
    this.setState({ lightboxOpen: true, selectedIndex: index })
    this.emit(COMPONENT_EVENTS.GALLERY_OPEN, { index })
  }

  closeLightbox() {
    this.#lightboxOpen = false
    this.setState({ lightboxOpen: false })
    this.emit(COMPONENT_EVENTS.GALLERY_CLOSE, {})
  }

  navigateLightbox(direction) {
    const images = this.#getGalleryImages()
    if (direction === 'next') {
      this.#selectedIndex = (this.#selectedIndex + 1) % images.length
    } else {
      this.#selectedIndex = (this.#selectedIndex - 1 + images.length) % images.length
    }
    this.setState({ selectedIndex: this.#selectedIndex })
    this.emit(COMPONENT_EVENTS.GALLERY_NAVIGATE, { 
      index: this.#selectedIndex, 
      direction 
    })
  }

  handleImageClick(index) {
    this.openLightbox(index)
  }

  handleThumbnailClick(index) {
    this.#selectedIndex = index
    this.setState({ selectedIndex: index })
    this.emit(COMPONENT_EVENTS.GALLERY_NAVIGATE, { index })
  }

  handleLightboxClose() {
    this.closeLightbox()
  }

  handleLightboxNext() {
    this.navigateLightbox('next')
  }

  handleLightboxPrev() {
    this.navigateLightbox('prev')
  }

  toJSON() {
    return {
      ...super.toJSON(),
      lightboxOpen: this.#lightboxOpen,
      selectedIndex: this.#selectedIndex
    }
  }
}

export default GalleryComponent
