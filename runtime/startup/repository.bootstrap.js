/**
 * Repository Bootstrap — registers the commercial repository registry
 *
 * P13.5.5 (Runtime Entry & Wiring): registration ONLY. No CRUD, no persistence logic,
 * no provider implementation. Repositories are thin metadata classes extending the
 * existing repository base contracts.
 *
 * Registration order follows the declared static dependencies (support repositories
 * first, then the commercial aggregate) so per-registration dependency validation
 * in RepositoryRegistry succeeds deterministically.
 *
 * Commercial aggregate (9): business, accommodation, availability, reservation,
 * visitor, owner, booking, notification, opportunity.
 * Support repositories (3): tenant, destination, identity — required by the
 * aggregate repositories' declared `static dependencies`.
 */
import { TenantRepository } from '../../capabilities/persistence/repositories/tenant/tenant.repository.js'
import { DestinationRepository } from '../../capabilities/persistence/repositories/destination/destination.repository.js'
import { IdentityRepository } from '../../capabilities/persistence/repositories/identity/identity.repository.js'
import { BusinessRepository } from '../../capabilities/persistence/repositories/business/business.repository.js'
import { AccommodationRepository } from '../../capabilities/persistence/repositories/accommodation/accommodation.repository.js'
import { AvailabilityRepository } from '../../capabilities/persistence/repositories/availability/availability.repository.js'
import { ReservationRepository } from '../../capabilities/persistence/repositories/reservation/reservation.repository.js'
import { VisitorRepository } from '../../capabilities/persistence/repositories/visitor/visitor.repository.js'
import { NotificationRepository } from '../../capabilities/persistence/repositories/notification/notification.repository.js'
import { OwnerRepository } from '../../capabilities/persistence/repositories/owner/owner.repository.js'
import { BookingRepository } from '../../capabilities/persistence/repositories/booking/booking.repository.js'
import { OpportunityRepository } from '../../capabilities/persistence/repositories/opportunity/opportunity.repository.js'
import { RepositoryBootstrapError } from './startup.errors.js'

export const SUPPORT_REPOSITORY_REGISTRATIONS = [
  { entityName: 'tenant', class: TenantRepository },
  { entityName: 'destination', class: DestinationRepository },
  { entityName: 'identity', class: IdentityRepository },
]

export const COMMERCIAL_REPOSITORY_REGISTRATIONS = [
  { entityName: 'business', class: BusinessRepository },
  { entityName: 'accommodation', class: AccommodationRepository },
  { entityName: 'availability', class: AvailabilityRepository },
  { entityName: 'reservation', class: ReservationRepository },
  { entityName: 'visitor', class: VisitorRepository },
  { entityName: 'owner', class: OwnerRepository },
  { entityName: 'booking', class: BookingRepository },
  { entityName: 'notification', class: NotificationRepository },
  { entityName: 'opportunity', class: OpportunityRepository },
]

export const REPOSITORY_REGISTRATIONS = [
  ...SUPPORT_REPOSITORY_REGISTRATIONS,
  ...COMMERCIAL_REPOSITORY_REGISTRATIONS,
]

/**
 * Register all repositories into the repository runtime (registration only).
 * @param {object} repositoryRuntime - RepositoryEngine module from the booted runtime
 * @returns {object[]} - Registry listing of registered repositories
 */
export function registerRepositories(repositoryRuntime) {
  if (!repositoryRuntime) {
    throw new RepositoryBootstrapError('Repository runtime is not available — runtime must boot first', {})
  }
  try {
    for (const { entityName, class: RepoClass } of REPOSITORY_REGISTRATIONS) {
      repositoryRuntime.register(entityName, { class: RepoClass })
    }
    return repositoryRuntime.registry.list()
  } catch (err) {
    throw new RepositoryBootstrapError(`Failed to register repositories: ${err.message}`, { error: err })
  }
}

export default registerRepositories
