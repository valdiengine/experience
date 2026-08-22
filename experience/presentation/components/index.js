/**
 * Experience Presentation Components
 * 
 * P15.3.2 - Reusable presentation components
 * 
 * Components consume ExperienceViewModel and produce render structures.
 * Framework-agnostic - produces data structures for rendering.
 */

export { BaseComponent, COMPONENT_EVENTS } from './base.component.js'
export { HeaderComponent } from './header.component.js'
export { HeroComponent } from './hero.component.js'
export { ServicesComponent } from './services.component.js'
export { GalleryComponent } from './gallery.component.js'
export { CompaniesComponent } from './companies.component.js'
export { ContactComponent } from './contact.component.js'
export { FooterComponent } from './footer.component.js'
export { QuoteUIComponent, QUOTE_COMPONENT_EVENTS } from './quote.component.js'

import { BaseComponent } from './base.component.js'
import { HeaderComponent } from './header.component.js'
import { HeroComponent } from './hero.component.js'
import { ServicesComponent } from './services.component.js'
import { GalleryComponent } from './gallery.component.js'
import { CompaniesComponent } from './companies.component.js'
import { ContactComponent } from './contact.component.js'
import { FooterComponent } from './footer.component.js'
import { QuoteUIComponent } from './quote.component.js'

export default {
  BaseComponent,
  HeaderComponent,
  HeroComponent,
  ServicesComponent,
  GalleryComponent,
  CompaniesComponent,
  ContactComponent,
  FooterComponent,
  QuoteUIComponent
}
