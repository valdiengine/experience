/**
 * Capability Registration — Centralized capability registry
 *
 * Single source of truth for all available capability classes.
 * Imported by bootstrap.js to register capabilities before loading.
 *
 * To add a new capability:
 * 1. Create capabilities/{name}/{name}.capability.js extending BaseCapability
 * 2. Import it here
 * 3. Add to AVAILABLE_CAPABILITIES map
 */
import { AccommodationCapability } from '../accommodation/accommodation.capability.js'
import { PersistenceCapability } from '../persistence/repository.capability.js'
import { BookingCapability } from '../booking/booking.capability.js'
import { NotificationsCapability } from '../notifications/notifications.capability.js'
import { PWACapability } from '../pwa/pwa.capability.js'
import { CMSCapability } from '../cms/cms.capability.js'
import { CommunicationCapability } from '../communication/communication.capability.js'
import { AvailabilityCapability } from '../availability/availability.capability.js'
import { IntelligenceCapability } from '../intelligence/intelligence.capability.js'
import { ReservationCapability } from '../reservation/reservation.capability.js'
import { SchedulerCapability } from '../scheduler/scheduler.capability.js'
import { ObservabilityCapability } from '../observability/observability.capability.js'
import { OnboardingCapability } from '../onboarding/onboarding.capability.js'
import { OwnerCapability } from '../owner/owner.capability.js'
import { EngagementCapability } from '../engagement/engagement.capability.js'
import { ConversionCapability } from '../conversion/conversion.capability.js'
import PublicCapability from '../public/public.capability.js'
import { SEOIntelligenceCapability } from '../seo-intelligence/seo-intelligence.capability.js'
import { PWAEngineCapability } from '../pwa-engine/pwa-engine.capability.js'
import { AdminCapability } from '../admin/admin.capability.js'
import { SaaSCapability } from '../saas/saas.capability.js'
import { BillingCapability } from '../billing/billing.capability.js'
import { LifecycleCapability } from '../lifecycle/lifecycle.capability.js'
import { BusinessCapability } from '../business/business.capability.js'
import { CommunityCapability } from '../community/community.capability.js'
import { ExplorationCapability } from '../exploration/exploration.capability.js'
import { GovernanceCapability } from '../governance/governance.capability.js'
import { OperationsCapability } from '../operations/operations.capability.js'
import { IdentityCapability } from '../identity/identity.capability.js'
import { VisitorCapability } from '../visitor/visitor.capability.js'
import { OpportunityCapability } from '../opportunity/opportunity.capability.js'
import { PaymentCapability } from '../payment/payment.capability.js'
import { NotificationCapability } from '../notification/notification.capability.js'

/**
 * Map of capability ID → class constructor
 */
export const AVAILABLE_CAPABILITIES = {
  persistence: PersistenceCapability,
  business: BusinessCapability,
  onboarding: OnboardingCapability,
  owner: OwnerCapability,
  engagement: EngagementCapability,
  conversion: ConversionCapability,
  public: PublicCapability,
  'seo-intelligence': SEOIntelligenceCapability,
  'pwa-engine': PWAEngineCapability,
  admin: AdminCapability,
  saas: SaaSCapability,
  billing: BillingCapability,
  lifecycle: LifecycleCapability,
  cms: CMSCapability,
  communication: CommunicationCapability,
  availability: AvailabilityCapability,
  scheduler: SchedulerCapability,
  intelligence: IntelligenceCapability,
  reservation: ReservationCapability,
  booking: BookingCapability,
  notifications: NotificationsCapability,
  visitor: VisitorCapability,
  opportunity: OpportunityCapability,
  payment: PaymentCapability,
  notification: NotificationCapability,
  pwa: PWACapability,
  observability: ObservabilityCapability,
  community: CommunityCapability,
  exploration: ExplorationCapability,
  governance: GovernanceCapability,
  'destination-operations': OperationsCapability,
  'destination-identity': IdentityCapability,
}

/**
 * Create a single capability instance by ID
 * @param {string} id - Capability ID
 * @returns {object|null} - Capability instance or null
 */
export function createCapabilityInstance(id) {
  const CapClass = AVAILABLE_CAPABILITIES[id]
  if (!CapClass) return null
  return new CapClass()
}

/**
 * Create instances of all registered capabilities
 * @returns {object[]} - Array of capability instances
 */
export function createAllCapabilities() {
  return Object.keys(AVAILABLE_CAPABILITIES)
    .map(id => createCapabilityInstance(id))
    .filter(Boolean)
}
