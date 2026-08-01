# Valdi Engine — Capability Inventory

## Registered Capabilities (21)

| # | ID | Name | Version | Dependencies | Files |
|---|-----|------|---------|--------------|-------|
| 1 | booking | Booking | 1.0.0 | — | booking.capability.js, booking.manager.js, booking.schema.js, booking.events.js |
| 2 | notifications | Notifications | 2.0.0 | — | notifications.capability.js, notification.manager.js, notification.schema.js, notification.events.js, templates/template.manager.js, preferences/notification.preferences.js, scheduler/notification.scheduler.js, batching/batch.processor.js, rate-limit/rate.limiter.js, analytics/notification.analytics.js |
| 3 | pwa | PWA | 1.0.0 | — | pwa.capability.js, manifest.js, install.manager.js |
| 4 | cms | CMS Bridge | 1.0.0 | — | cms.capability.js, wordpress.provider.js, cms.mapper.js, content.manager.js |
| 5 | communication | Communication | 1.0.0 | — | communication.capability.js, communication.schema.js, communication.events.js, providers/whatsapp.provider.js, providers/chat.provider.js, providers/email.provider.js, providers/push.provider.js |
| 6 | availability | Availability | 1.0.0 | — | availability.capability.js, availability.manager.js, availability.parser.js, availability.schema.js, availability.events.js |
| 7 | intelligence | Intelligence | 1.0.0 | availability | intelligence.capability.js, intelligence.schema.js, intelligence.events.js, availability.analytics.js, demand.analyzer.js, opportunity.engine.js, recommendation.manager.js |
| 8 | reservation | Reservation | 2.0.0 | booking, availability, communication, notifications | reservation.capability.js, reservation.manager.js, reservation.schema.js, reservation.events.js, reservation.workflow.js, reservation.status.js, reservation.timer.js, reservation.config.js, reservation.recovery.js, reservation.flow.js, ui/reservation.calendar.js, ui/reservation.selector.js, ui/reservation.form.js, ui/reservation.view.js |
| 9 | scheduler | Scheduler | 2.0.0 | — | scheduler.capability.js, scheduler.manager.js, scheduler.schema.js, scheduler.events.js, scheduler.jobs.js, executor.js, lock.manager.js, retry.manager.js, circuit.breaker.js, cleanup.manager.js |
| 10 | observability | Observability | 1.0.0 | — | observability.capability.js, observability.manager.js, observability.schema.js, observability.events.js, metrics.collector.js, health.monitor.js, alert.manager.js |
| 11 | onboarding | Onboarding | 1.0.0 | — | onboarding.capability.js, onboarding.manager.js, onboarding.schema.js, onboarding.events.js, business.registry.js, business.types.js, plans.js |
| 12 | owner | Owner | 1.0.0 | reservation, availability, communication, observability | owner.capability.js, owner.manager.js, owner.schema.js, owner.events.js, ui/dashboard.view.js, ui/reservations.view.js, ui/availability.view.js, ui/customers.view.js, ui/metrics.view.js |
| 13 | engagement | Engagement | 1.0.0 | communication, availability, observability | engagement.capability.js, engagement.manager.js, engagement.schema.js, engagement.events.js, automation/trigger.engine.js, automation/campaign.manager.js, automation/journey.manager.js, messages/template.manager.js, messages/message.builder.js, analytics/engagement.analytics.js |
| 14 | conversion | Conversion | 1.0.0 | communication, engagement, observability | conversion.capability.js, conversion.manager.js, conversion.schema.js, conversion.events.js, scoring/customer.score.js, scoring/lead.score.js, scoring/opportunity.score.js, automation/recovery.engine.js, automation/followup.engine.js, automation/retention.engine.js, analytics/conversion.analytics.js |
| 15 | public | Public | 1.0.0 | cms, pwa, reservation, communication, engagement | public.capability.js, public.manager.js, public.schema.js, public.events.js, renderer/page.renderer.js, renderer/section.renderer.js, renderer/component.renderer.js, navigation/menu.manager.js, navigation/route.manager.js, seo/metadata.manager.js, seo/schema.generator.js, seo/sitemap.manager.js, builder/page.builder.js, builder/section.builder.js |
| 16 | seo-intelligence | SEO Intelligence | 1.0.0 | cms, public, observability, intelligence | seo-intelligence.capability.js, seo-intelligence.manager.js, seo-intelligence.schema.js, seo-intelligence.events.js, analysis/content.analyzer.js, analysis/metadata.analyzer.js, analysis/schema.analyzer.js, analysis/keyword.analyzer.js, seo/seo.events.js, seo/linking/link.analyzer.js, seo/linking/link.recommendation.js |
| 17 | pwa-engine | PWA Engine | 1.0.0 | notifications, communication, public, observability | pwa-engine.capability.js, pwa-engine.manager.js, pwa-engine.schema.js, pwa-engine.events.js, manifest/manifest.generator.js, service-worker/service.worker.manager.js, service-worker/cache.strategy.js, install/install.manager.js, offline/offline.manager.js |
| 18 | admin | Admin | 1.0.0 | reservation, availability, seo-intelligence, pwa-engine, observability, onboarding, saas, billing | admin.capability.js, admin.manager.js, admin.schema.js, admin.events.js, users/user.manager.js, users/role.manager.js, tenant-admin/tenant.dashboard.js, tenant-admin/tenant.settings.js, billing/plan.manager.js, billing/subscription.manager.js, reservation-admin/reservation.admin.js, availability-admin/availability.admin.js, content-admin/content.admin.js, seo-admin/seo.admin.js, pwa-admin/pwa.admin.js, analytics-admin/analytics.admin.js |
| 19 | saas | SaaS | 1.0.0 | — | saas.capability.js, saas.schema.js, saas.events.js, product.catalog.js, plan.manager.js, subscription.manager.js, entitlement.manager.js, feature.flag.manager.js, limits.manager.js, upgrade.manager.js |
| 20 | billing | Billing | 1.0.0 | saas | billing.capability.js, billing.schema.js, billing.events.js, billing.config.js, invoice.manager.js, payment.manager.js, transaction.manager.js, provider.manager.js, subscription.billing.js |
| 21 | lifecycle | Lifecycle | 1.0.0 | saas, billing, communication, onboarding, observability | lifecycle.capability.js, lifecycle.schema.js, lifecycle.events.js, customer/customer.manager.js, customer/customer.profile.js, customer/customer.segment.js, onboarding/trial.manager.js, onboarding/activation.manager.js, onboarding/checklist.manager.js, growth/upgrade.manager.js, growth/recommendation.manager.js, growth/usage.analyzer.js, retention/churn.manager.js, retention/renewal.manager.js, retention/recovery.manager.js |

## Unregistered Files (Orphans)

These files exist on disk but are NOT in register.js. They are legacy placeholders from P1-3:

| File | Notes |
|------|-------|
| capabilities/catalog/catalog.capability.js | Placeholder, superseded by public + booking |
| capabilities/gallery/gallery.capability.js | Placeholder, superseded by public renderer |
| capabilities/payments/payments.capability.js | Placeholder, superseded by billing capability |

**Recommendation:** These 3 orphan files can be safely removed. They predate the capability system refactoring and their functionality is now provided by registered capabilities (billing > payments, public > catalog/gallery).

## Dependency Graph

```
No dependencies (7):
  booking, notifications, pwa, cms, communication, availability, scheduler, observability, onboarding, saas

Single dependency (3):
  intelligence → availability
  billing → saas

Multi-dependency (10):
  reservation → booking, availability, communication, notifications
  owner → reservation, availability, communication, observability
  engagement → communication, availability, observability
  conversion → communication, engagement, observability
  public → cms, pwa, reservation, communication, engagement
  seo-intelligence → cms, public, observability, intelligence
  pwa-engine → notifications, communication, public, observability
  admin → reservation, availability, seo-intelligence, pwa-engine, observability, onboarding, saas, billing
  lifecycle → saas, billing, communication, onboarding, observability
```

## Validation

- [x] All 21 registered capabilities have `.capability.js` files on disk
- [x] No circular dependencies detected
- [x] All dependency targets are registered capabilities
- [x] No capability imports another capability directly (cross-communication via context only)
- [x] All capabilities extend BaseCapability
- [x] All capabilities follow contract: id, name, version, dependencies, init, activate, deactivate, destroy
- [x] 3 orphan files exist (catalog, gallery, payments) — can be removed
