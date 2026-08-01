# EVENT_INDEX.md

> Complete event catalog across all 26 capabilities + 4 event-only modules. ~425 total events.
> Naming convention: `domain:entity.action` or `domain.entity.action`
> Updated: P11.6 — Ecosystem Stabilization

---

## 1. availability (`capabilities/availability/availability.events.js`)

| Event | Description |
|-------|-------------|
| `availability:requested` | Availability data requested |
| `availability:received` | Availability data received from source |
| `availability:updated` | Availability data updated |
| `availability:expired` | Availability data expired |
| `availability:conflict_detected` | Scheduling conflict detected |
| `availability:calendar_synced` | Calendar synchronized |

---

## 2. booking (`capabilities/booking/booking.events.js`)

| Event | Description |
|-------|-------------|
| `booking:created` | New booking created |
| `booking:updated` | Booking updated |
| `booking:cancelled` | Booking cancelled |
| `booking:confirmed` | Booking confirmed |
| `booking:completed` | Booking completed |

---

## 3. communication (`capabilities/communication/communication.events.js`)

| Event | Description |
|-------|-------------|
| `communication:message_sent` | Message sent |
| `communication:message_failed` | Message failed to send |
| `communication:message_read` | Message read by recipient |
| `communication:conversation_started` | New conversation started |
| `communication:conversation_updated` | Conversation updated |
| `communication:channel_registered` | Communication channel registered |

---

## 4. intelligence (`capabilities/intelligence/intelligence.events.js`)

| Event | Description |
|-------|-------------|
| `intelligence.visitor.profile.created` | Visitor profile created |
| `intelligence.visitor.profile.updated` | Visitor profile updated |
| `intelligence.visitor.interest.detected` | Visitor interest detected |
| `intelligence.visitor.behavior.tracked` | Visitor behavior tracked |
| `intelligence.recommendation.generated` | Recommendation generated |
| `intelligence.experience.recommended` | Experience recommended |
| `intelligence.place.recommended` | Place recommended |
| `intelligence.business.recommended` | Business recommended |
| `intelligence.species.recommended` | Species recommended |
| `intelligence.destination.insight.created` | Destination insight created |
| `intelligence.tourism.pattern.detected` | Tourism pattern detected |
| `intelligence.ecology.pattern.detected` | Ecology pattern detected |
| `intelligence.economic.pattern.detected` | Economic pattern detected |
| `intelligence.demand.predicted` | Demand predicted |
| `intelligence.visitor.prediction.created` | Visitor prediction created |
| `intelligence.seasonal.prediction.created` | Seasonal prediction created |
| `intelligence.ai.assistant.requested` | AI assistant request |
| `intelligence.ai.assistant.responded` | AI assistant response |
| `intelligence.ai.assistant.feedback` | AI assistant feedback |
| `intelligence.knowledge.graph.updated` | Knowledge graph updated |
| `intelligence.knowledge.connection.discovered` | Knowledge connection discovered |
| `intelligence.sync.started` | Intelligence sync started |
| `intelligence.sync.completed` | Intelligence sync completed |
| `intelligence.sync.offline.queued` | Offline data queued for sync |

---

## 5. reservation (`capabilities/reservation/reservation.events.js`)

| Event | Description |
|-------|-------------|
| `reservation:created` | New reservation created |
| `reservation:validated` | Reservation validated |
| `reservation:owner_requested` | Owner confirmation requested |
| `reservation:owner_confirmed` | Owner confirmed reservation |
| `reservation:confirmed` | Reservation confirmed |
| `reservation:rejected` | Reservation rejected |
| `reservation:cancelled` | Reservation cancelled |
| `reservation:expired` | Reservation expired |
| `reservation:completed` | Reservation completed |
| `reservation:payment_pending` | Payment pending |
| `reservation:state_changed` | Reservation state changed |
| `reservation:timeout_warning` | Timeout warning |
| `reservation:recovered` | Reservation recovered from failure |
| `reservation:sync_required` | Sync required |

---

## 6. scheduler (`capabilities/scheduler/scheduler.events.js`)

| Event | Description |
|-------|-------------|
| `scheduler:job_created` | Job created |
| `scheduler:job_executed` | Job executed |
| `scheduler:job_completed` | Job completed |
| `scheduler:job_failed` | Job failed |
| `scheduler:job_cancelled` | Job cancelled |
| `scheduler:job_expired` | Job expired |
| `scheduler:tick` | Scheduler tick |
| `scheduler:started` | Scheduler started |
| `scheduler:completed` | Scheduler completed |
| `scheduler:failed` | Scheduler failed |
| `scheduler:duplicate` | Duplicate job detected |
| `scheduler:blocked` | Job blocked |
| `scheduler:retry` | Job retrying |
| `scheduler:retry_exhausted` | Retry attempts exhausted |
| `scheduler:locked` | Resource locked |
| `scheduler:unlocked` | Resource unlocked |
| `scheduler:lock_expired` | Lock expired |
| `scheduler:cleanup` | Cleanup completed |
| `scheduler:circuit_breaker_open` | Circuit breaker opened |
| `scheduler:circuit_breaker_closed` | Circuit breaker closed |
| `scheduler:circuit_breaker_half_open` | Circuit breaker half-open |

---

## 7. observability (`capabilities/observability/observability.events.js`)

| Event | Description |
|-------|-------------|
| `observability:metric_created` | Metric created |
| `observability:metric_aggregated` | Metric aggregated |
| `observability:health_checked` | Health check performed |
| `observability:health_degraded` | Health degraded |
| `observability:health_recovered` | Health recovered |
| `observability:alert_created` | Alert created |
| `observability:alert_resolved` | Alert resolved |
| `observability:alert_escalated` | Alert escalated |
| `observability:started` | Observability started |
| `observability:stopped` | Observability stopped |

---

## 8. onboarding (`capabilities/onboarding/onboarding.events.js`)

| Event | Description |
|-------|-------------|
| `business:registered` | Business registered |
| `business:created` | Business created |
| `business:updated` | Business updated |
| `business:activated` | Business activated |
| `tenant:created` | Tenant created |
| `tenant:configured` | Tenant configured |
| `plan:assigned` | Plan assigned |
| `plan:changed` | Plan changed |
| `capabilities:activated` | Capabilities activated |

---

## 9. owner (`capabilities/owner/owner.events.js`)

| Event | Description |
|-------|-------------|
| `owner:dashboard_loaded` | Dashboard loaded |
| `owner:dashboard_updated` | Dashboard updated |
| `owner:reservation_viewed` | Reservation viewed |
| `owner:reservation_confirmed` | Reservation confirmed |
| `owner:reservation_rejected` | Reservation rejected |
| `owner:reservation_cancelled` | Reservation cancelled |
| `owner:availability_updated` | Availability updated |
| `owner:availability_blocked` | Availability blocked |
| `owner:availability_opened` | Availability opened |
| `owner:customer_viewed` | Customer viewed |
| `owner:customer_noted` | Customer note added |
| `owner:message_sent` | Message sent |
| `owner:conversation_opened` | Conversation opened |
| `owner:metrics_loaded` | Metrics loaded |
| `owner:logged_in` | Owner logged in |
| `owner:profile_loaded` | Profile loaded |

---

## 10. engagement (`capabilities/engagement/engagement.events.js`)

| Event | Description |
|-------|-------------|
| `engagement:created` | Engagement created |
| `engagement:triggered` | Engagement triggered |
| `engagement:message_sent` | Message sent |
| `engagement:response_received` | Response received |
| `engagement:campaign_created` | Campaign created |
| `engagement:campaign_started` | Campaign started |
| `engagement:campaign_completed` | Campaign completed |
| `engagement:campaign_paused` | Campaign paused |
| `engagement:availability_requested` | Availability requested |
| `engagement:availability_received` | Availability received |
| `engagement:opportunity_detected` | Opportunity detected |
| `engagement:recommendation_received` | Recommendation received |
| `engagement:journey_updated` | Journey updated |
| `engagement:journey_stage_changed` | Journey stage changed |
| `engagement:trigger_activated` | Trigger activated |
| `engagement:trigger_deactivated` | Trigger deactivated |
| `engagement:metric_recorded` | Metric recorded |

---

## 11. conversion (`capabilities/conversion/conversion.events.js`)

| Event | Description |
|-------|-------------|
| `conversion:lead_created` | Lead created |
| `conversion:score_updated` | Score updated |
| `conversion:customer_scored` | Customer scored |
| `conversion:opportunity_detected` | Opportunity detected |
| `conversion:opportunity_actioned` | Opportunity actioned |
| `conversion:recovery_started` | Recovery started |
| `conversion:recovered` | Customer recovered |
| `conversion:recovery_failed` | Recovery failed |
| `conversion:followup_sent` | Follow-up sent |
| `conversion:followup_completed` | Follow-up completed |
| `conversion:followup_failed` | Follow-up failed |
| `conversion:returning_customer_detected` | Returning customer detected |
| `conversion:retention_action` | Retention action taken |
| `conversion:metric_recorded` | Metric recorded |

---

## 12. saas (`capabilities/saas/saas.events.js`)

| Event | Description |
|-------|-------------|
| `saas:product_created` | Product created |
| `saas:product_updated` | Product updated |
| `saas:product_deleted` | Product deleted |
| `saas:plan_created` | Plan created |
| `saas:plan_updated` | Plan updated |
| `saas:plan_assigned` | Plan assigned |
| `saas:plan_changed` | Plan changed |
| `saas:subscription_created` | Subscription created |
| `saas:subscription_activated` | Subscription activated |
| `saas:subscription_suspended` | Subscription suspended |
| `saas:subscription_cancelled` | Subscription cancelled |
| `saas:subscription_expired` | Subscription expired |
| `saas:subscription_renewed` | Subscription renewed |
| `saas:feature_enabled` | Feature enabled |
| `saas:feature_disabled` | Feature disabled |
| `saas:feature_changed` | Feature changed |
| `saas:limit_reached` | Limit reached |
| `saas:limit_warning` | Limit warning |
| `saas:limit_reset` | Limit reset |
| `saas:upgrade_recommended` | Upgrade recommended |
| `saas:upgrade_completed` | Upgrade completed |
| `saas:entitlement_changed` | Entitlement changed |

---

## 13. billing (`capabilities/billing/billing.events.js`)

| Event | Description |
|-------|-------------|
| `billing:invoice_created` | Invoice created |
| `billing:invoice_sent` | Invoice sent |
| `billing:invoice_paid` | Invoice paid |
| `billing:invoice_failed` | Invoice failed |
| `billing:invoice_cancelled` | Invoice cancelled |
| `billing:invoice_overdue` | Invoice overdue |
| `billing:payment_created` | Payment created |
| `billing:payment_processing` | Payment processing |
| `billing:payment_completed` | Payment completed |
| `billing:payment_failed` | Payment failed |
| `billing:payment_cancelled` | Payment cancelled |
| `billing:subscription_activated` | Subscription activated |
| `billing:subscription_suspended` | Subscription suspended |
| `billing:subscription_cancelled` | Subscription cancelled |
| `billing:subscription_renewed` | Subscription renewed |
| `billing:refund_created` | Refund created |
| `billing:refund_completed` | Refund completed |
| `billing:provider_error` | Provider error |

---

## 14. lifecycle (`capabilities/lifecycle/lifecycle.events.js`)

| Event | Description |
|-------|-------------|
| `lifecycle:customer_created` | Customer created |
| `lifecycle:customer_activated` | Customer activated |
| `lifecycle:customer_updated` | Customer updated |
| `lifecycle:customer_segment_changed` | Customer segment changed |
| `lifecycle:customer_health_updated` | Customer health updated |
| `lifecycle:trial_started` | Trial started |
| `lifecycle:trial_ending` | Trial ending soon |
| `lifecycle:trial_expired` | Trial expired |
| `lifecycle:trial_converted` | Trial converted |
| `lifecycle:trial_cancelled` | Trial cancelled |
| `lifecycle:upgrade_recommended` | Upgrade recommended |
| `lifecycle:upgrade_requested` | Upgrade requested |
| `lifecycle:plan_changed` | Plan changed |
| `lifecycle:customer_inactive` | Customer inactive |
| `lifecycle:customer_churn_risk` | Churn risk detected |
| `lifecycle:customer_recovered` | Customer recovered |
| `lifecycle:customer_renewed` | Customer renewed |
| `lifecycle:activation_step_completed` | Activation step completed |
| `lifecycle:activation_completed` | Activation completed |

---

## 15. cms (`capabilities/cms/cms.events.js`)

| Event | Description |
|-------|-------------|
| `cms:content_loaded` | Content loaded from CMS |
| `cms:content_updated` | Content updated |
| `cms:content_deleted` | Content deleted |
| `cms:sync_started` | CMS sync started |
| `cms:sync_completed` | CMS sync completed |
| `cms:sync_failed` | CMS sync failed |

---

## 16. public (`capabilities/public/public.events.js`)

| Event | Description |
|-------|-------------|
| `public:loaded` | Public page loaded |
| `public:page_rendered` | Page rendered |
| `public:route_changed` | Route changed |
| `public:menu_clicked` | Menu clicked |
| `public:seo_generated` | SEO metadata generated |
| `public:metadata_updated` | Metadata updated |
| `public:pwa_ready` | PWA ready |
| `public:pwa_install_prompted` | PWA install prompted |
| `public:reservation_opened` | Reservation opened |
| `public:reservation_submitted` | Reservation submitted |
| `public:cms_content_loaded` | CMS content loaded |
| `public:cms_content_rendered` | CMS content rendered |

---

## 17. seo-intelligence (`capabilities/seo-intelligence/seo-intelligence.events.js`)

| Event | Description |
|-------|-------------|
| `seo-intelligence:analysis_started` | Analysis started |
| `seo-intelligence:analysis_completed` | Analysis completed |
| `seo-intelligence:analysis_failed` | Analysis failed |
| `seo-intelligence:issue_detected` | SEO issue detected |
| `seo-intelligence:issue_resolved` | SEO issue resolved |
| `seo-intelligence:opportunity_found` | SEO opportunity found |
| `seo-intelligence:opportunity_applied` | Opportunity applied |
| `seo-intelligence:content_updated` | Content updated |
| `seo-intelligence:content_published` | Content published |
| `seo-intelligence:score_changed` | SEO score changed |

---

## 18. seo-intelligence/seo (`capabilities/seo-intelligence/seo/seo.events.js`)

| Event | Description |
|-------|-------------|
| `seo:analysis_started` | SEO analysis started |
| `seo:analysis_completed` | SEO analysis completed |
| `seo:analysis_failed` | SEO analysis failed |
| `seo:issue_detected` | SEO issue detected |
| `seo:issue_resolved` | SEO issue resolved |
| `seo:opportunity_found` | SEO opportunity found |
| `seo:opportunity_applied` | Opportunity applied |
| `seo:content_updated` | Content updated |
| `seo:content_published` | Content published |
| `seo:links_analyzed` | Links analyzed |
| `seo:link_recommendation` | Link recommendation |
| `seo:score_changed` | SEO score changed |

---

## 19. pwa-engine (`capabilities/pwa-engine/pwa-engine.events.js`)

| Event | Description |
|-------|-------------|
| `pwa-engine:manifest_generated` | Manifest generated |
| `pwa-engine:manifest_injected` | Manifest injected |
| `pwa-engine:sw_registered` | Service worker registered |
| `pwa-engine:sw_activated` | Service worker activated |
| `pwa-engine:sw_update_available` | SW update available |
| `pwa-engine:sw_updated` | SW updated |
| `pwa-engine:sw_error` | SW error |
| `pwa-engine:cache_updated` | Cache updated |
| `pwa-engine:cache_cleared` | Cache cleared |
| `pwa-engine:install_available` | Install available |
| `pwa-engine:install_triggered` | Install triggered |
| `pwa-engine:installed` | Installed |
| `pwa-engine:install_dismissed` | Install dismissed |
| `pwa-engine:install_failed` | Install failed |
| `pwa-engine:offline_detected` | Offline detected |
| `pwa-engine:offline_restored` | Online restored |
| `pwa-engine:offline_page_shown` | Offline page shown |
| `pwa-engine:push_permission_granted` | Push permission granted |
| `pwa-engine:push_permission_denied` | Push permission denied |
| `pwa-engine:push_received` | Push received |
| `pwa-engine:push_clicked` | Push clicked |
| `pwa-engine:pwa_opened` | PWA opened |
| `pwa-engine:pwa_notification_clicked` | PWA notification clicked |

---

## 20. admin (`capabilities/admin/admin.events.js`)

| Event | Description |
|-------|-------------|
| `admin:user_created` | User created |
| `admin:user_updated` | User updated |
| `admin:user_deleted` | User deleted |
| `admin:user_login` | User login |
| `admin:user_logout` | User logout |
| `admin:tenant_created` | Tenant created |
| `admin:tenant_updated` | Tenant updated |
| `admin:tenant_suspended` | Tenant suspended |
| `admin:tenant_activated` | Tenant activated |
| `admin:plan_changed` | Plan changed |
| `admin:plan_upgraded` | Plan upgraded |
| `admin:plan_downgraded` | Plan downgraded |
| `admin:capability_enabled` | Capability enabled |
| `admin:capability_disabled` | Capability disabled |
| `admin:reservation_confirmed` | Reservation confirmed |
| `admin:reservation_rejected` | Reservation rejected |
| `admin:reservation_cancelled` | Reservation cancelled |
| `admin:content_published` | Content published |
| `admin:content_updated` | Content updated |
| `admin:analytics_viewed` | Analytics viewed |

---

## 21. notifications (`capabilities/notifications/notification.events.js`)

| Event | Description |
|-------|-------------|
| `notification:sent` | Notification sent |
| `notification:failed` | Notification failed |
| `notification:queued` | Notification queued |
| `notification:delivered` | Notification delivered |
| `notification:opened` | Notification opened |
| `notification:clicked` | Notification clicked |
| `notification:scheduled` | Notification scheduled |
| `notification:schedule_cancelled` | Schedule cancelled |
| `notification:schedule_triggered` | Schedule triggered |
| `notification:batch_created` | Batch created |
| `notification:batch_completed` | Batch completed |
| `notification:batch_failed` | Batch failed |
| `notification:rate_limited` | Rate limited |
| `notification:template_created` | Template created |
| `notification:template_updated` | Template updated |
| `notification:template_deleted` | Template deleted |
| `notification:template_rendered` | Template rendered |
| `notification:preference_updated` | Preference updated |
| `notification:retry_scheduled` | Retry scheduled |
| `notification:retry_exhausted` | Retry exhausted |
| `notification:analytics_updated` | Analytics updated |

---

## 22. community (`capabilities/community/community.events.js`)

> **Added (P11.6):** `community.story.created` event for community-submitted stories.

| Event | Description |
|-------|-------------|
| `community:visitor_registered` | Visitor registered |
| `community:visitor_updated` | Visitor updated |
| `memory:created` | Memory created |
| `memory:updated` | Memory updated |
| `memory:approved` | Memory approved |
| `memory:featured` | Memory featured |
| `memory:liked` | Memory liked |
| `memory:commented` | Memory commented |
| `review:created` | Review created |
| `review:updated` | Review updated |
| `review:approved` | Review approved |
| `review:reported` | Review reported |
| `interaction:created` | Interaction created |
| `visitor:visited_destination` | Destination visited |
| `visitor:visited_place` | Place visited |
| `visitor:visited_locality` | Locality visited |
| `visitor:visited_experience` | Experience visited |
| `reputation:updated` | Reputation updated |
| `community:content_flagged` | Content flagged |
| `community:content_approved` | Content approved |
| `community:content_rejected` | Content rejected |
| `community:metric_recorded` | Metric recorded |

---

## 23. exploration (`capabilities/exploration/exploration.events.js`)

| Event | Description |
|-------|-------------|
| `explorer:created` | Explorer profile created |
| `explorer:updated` | Explorer profile updated |
| `explorer:leveled_up` | Explorer leveled up |
| `explorer:discovery_registered` | Discovery registered |
| `explorer:visited_place` | Place visited |
| `explorer:discovered_species` | Species discovered |
| `explorer:completed_experience` | Experience completed |
| `explorer:created_memory` | Memory created |
| `explorer:earned_badge` | Badge earned |
| `explorer:points_earned` | Points earned |
| `mission:started` | Mission started |
| `mission:progress` | Mission progress |
| `mission:completed` | Mission completed |
| `mission:claimed` | Mission reward claimed |
| `pokedex:entry_added` | Pokedex entry added |
| `pokedex:entry_updated` | Pokedex entry updated |
| `pokedex:knowledge_unlocked` | Knowledge unlocked |
| `leaderboard:updated` | Leaderboard updated |
| `media:optimized` | Media optimized |
| `exploration:metric_recorded` | Metric recorded |

---

## 24. exploration/engagement (`capabilities/exploration/engagement/engagement.events.js`)

> **Renamed:** `ENGAGEMENT_EVENTS` → `EXPLORATION_ENGAGEMENT_EVENTS` (P11.6) to avoid namespace collision with `engagement/engagement.events.js`.

| Event | Description |
|-------|-------------|
| `eco:tokens_earned` | Eco-tokens earned |
| `eco:tokens_spent` | Eco-tokens spent |
| `eco:tokens_balance_changed` | Eco-token balance changed |
| `eco:score_updated` | Eco-score updated |
| `eco:score_level_up` | Eco-score level up |
| `trust:updated` | Trust score updated |
| `trust:violation` | Trust violation |
| `trust:restriction` | Trust restriction applied |
| `badge:awarded` | Badge awarded |
| `badge:progress` | Badge progress |
| `engagement:mission_started` | Engagement mission started |
| `engagement:mission_completed` | Engagement mission completed |
| `engagement:mission_claimed` | Engagement mission claimed |
| `sports:activity_started` | Sports activity started |
| `sports:activity_completed` | Sports activity completed |
| `sports:discovery` | Sports discovery |
| `sports:observation` | Sports observation |
| `territory:progress_updated` | Territory progress updated |
| `territory:completed` | Territory completed |
| `validation:requested` | Validation requested |
| `validation:completed` | Validation completed |
| `engagement:domain_action` | Domain action |
| `engagement:anti_gaming_flag` | Anti-gaming flag |

---

## 25. governance (`capabilities/governance/governance.events.js`)

| Event | Description |
|-------|-------------|
| `governance.destination.created` | Destination created |
| `governance.destination.approved` | Destination approved |
| `governance.destination.updated` | Destination updated |
| `governance.destination.suspended` | Destination suspended |
| `governance.locality.created` | Locality created |
| `governance.locality.manager.assigned` | Manager assigned |
| `governance.locality.manager.removed` | Manager removed |
| `governance.locality.updated` | Locality updated |
| `governance.place.submitted` | Place submitted |
| `governance.place.approved` | Place approved |
| `governance.place.rejected` | Place rejected |
| `governance.experience.submitted` | Experience submitted |
| `governance.experience.approved` | Experience approved |
| `governance.business.registered` | Business registered |
| `governance.business.verified` | Business verified |
| `governance.business.suspended` | Business suspended |
| `governance.partner.certified` | Partner certified |
| `governance.partner.level.changed` | Partner level changed |
| `governance.observation.submitted` | Observation submitted |
| `governance.observation.validated` | Observation validated |
| `governance.observation.rejected` | Observation rejected |
| `governance.scientific.record.approved` | Scientific record approved |
| `governance.content.flagged` | Content flagged |
| `governance.moderation.completed` | Moderation completed |
| `governance.moderation.escalated` | Moderation escalated |
| `governance.account.suspended` | Account suspended |
| `governance.account.banned` | Account banned |
| `governance.audit.created` | Audit record created |
| `governance.permission.changed` | Permission changed |
| `governance.workflow.state.changed` | Workflow state changed |
| `governance.reputation.changed` | Reputation changed |
| `governance.badge.awarded` | Badge awarded |
| `governance.health.calculated` | Health calculated |
| `governance.health.reported` | Health reported |

---

## 26. operations (`capabilities/operations/operations.events.js`)

| Event | Description |
|-------|-------------|
| `operations.destination.activated` | Destination activated |
| `operations.destination.paused` | Destination paused |
| `operations.destination.stage.changed` | Stage changed |
| `operations.destination.status.changed` | Status changed |
| `operations.health.updated` | Health updated |
| `operations.health.alert.created` | Health alert created |
| `operations.health.check.completed` | Health check completed |
| `operations.campaign.created` | Campaign created |
| `operations.campaign.started` | Campaign started |
| `operations.campaign.completed` | Campaign completed |
| `operations.campaign.archived` | Campaign archived |
| `operations.campaign.milestone.reached` | Milestone reached |
| `operations.season.activated` | Season activated |
| `operations.season.deactivated` | Season deactivated |
| `operations.seasonal.recommendation.generated` | Seasonal recommendation |
| `operations.check.completed` | Check completed |
| `operations.alert.created` | Alert created |
| `operations.alert.resolved` | Alert resolved |
| `operations.report.generated` | Report generated |
| `operations.agent.recommendation.created` | Agent recommendation |
| `operations.agent.alert.triggered` | Agent alert triggered |

---

## 27. identity (`capabilities/identity/identity.events.js`)

| Event | Description |
|-------|-------------|
| `identity.destination.created` | Destination identity created |
| `identity.destination.updated` | Destination identity updated |
| `identity.story.created` | Story created |
| `identity.story.published` | Story published |
| `identity.story.validated` | Story validated |
| `identity.heritage.item.added` | Heritage item added |
| `identity.heritage.item.validated` | Heritage item validated |
| `identity.heritage.item.updated` | Heritage item updated |
| `identity.hero.added` | Local hero added |
| `identity.hero.verified` | Hero verified |
| `identity.hero.recognized` | Hero recognized |
| `identity.cultural.discovery.completed` | Cultural discovery completed |
| `identity.cultural.pokedex.entry.added` | Cultural pokedex entry |
| `identity.cultural.memory.created` | Cultural memory created |
| `identity.cultural.memory.validated` | Cultural memory validated |
| `identity.community.story.submitted` | Community story submitted |
| `identity.community.story.approved` | Community story approved |
| `identity.story.recommendation.generated` | Story recommendation |
| `identity.cultural.route.created` | Cultural route created |

---

## 28. ecology (`capabilities/ecology/ecology.events.js`)

| Event | Description |
|-------|-------------|
| `ecology:species.registered` | Species registered |
| `ecology:habitat.mapped` | Habitat mapped |
| `ecology:conservation.alert` | Conservation alert |
| `ecology:observation.recorded` | Ecological observation recorded |
| `ecology:ecosystem.health.updated` | Ecosystem health updated |
| `ecology:biodiversity.index.calculated` | Biodiversity index calculated |

---

## 29. economy (`capabilities/economy/economy.events.js`)

| Event | Description |
|-------|-------------|
| `economy:partner.registered` | Economic partner registered |
| `economy:revenue.tracked` | Revenue tracked |
| `economy:service.listed` | Service listed |
| `economy:transaction.completed` | Transaction completed |

---

## 30. destination (`capabilities/destination/destination.events.js`)

| Event | Description |
|-------|-------------|
| `destination:activated` | Destination activated |
| `destination:configuration.updated` | Destination configuration updated |
| `destination:status.changed` | Destination status changed |
| `destination:metadata.synced` | Destination metadata synced |

---

## 31. locality (`capabilities/locality/locality.events.js`)

| Event | Description |
|-------|-------------|
| `locality:created` | Locality created |
| `locality:updated` | Locality updated |
| `locality:manager.assigned` | Locality manager assigned |

---

## Summary

| Capability | Events | File |
|------------|--------|------|
| availability | 6 | availability.events.js |
| booking | 5 | booking.events.js |
| communication | 6 | communication.events.js |
| intelligence | 24 | intelligence.events.js |
| reservation | 14 | reservation.events.js |
| scheduler | 21 | scheduler.events.js |
| observability | 10 | observability.events.js |
| onboarding | 9 | onboarding.events.js |
| owner | 16 | owner.events.js |
| engagement | 17 | engagement.events.js |
| conversion | 14 | conversion.events.js |
| saas | 22 | saas.events.js |
| billing | 18 | billing.events.js |
| lifecycle | 19 | lifecycle.events.js |
| cms | 6 | cms.events.js |
| public | 12 | public.events.js |
| seo-intelligence | 10 | seo-intelligence.events.js |
| seo-intelligence/seo | 12 | seo.events.js |
| pwa-engine | 23 | pwa-engine.events.js |
| admin | 20 | admin.events.js |
| notifications | 21 | notification.events.js |
| community | 22 | community.events.js |
| exploration | 20 | exploration.events.js |
| exploration/engagement | 23 | engagement.events.js |
| governance | 35 | governance.events.js |
| operations | 21 | operations.events.js |
| identity | 19 | identity.events.js |
| ecology | 6 | ecology.events.js |
| economy | 4 | economy.events.js |
| destination | 4 | destination.events.js |
| locality | 3 | locality.events.js |
| **TOTAL** | **~425** | 31 files |
