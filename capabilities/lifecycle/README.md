# Lifecycle Capability

**Version:** 1.0.0
**Status:** Stable
**Dependencies:** saas, billing, communication, engagement, observability

## Purpose

SaaS Customer Lifecycle & Revenue Management — manages the complete lifecycle of businesses using the SaaS platform, from onboarding through growth to retention.

## Architecture

```
lifecycle.capability.js
├── CustomerManager       → Create, track, classify customers
├── CustomerProfile       → Detailed customer information
├── CustomerSegment       → Automatic classification engine
├── TrialManager          → Free trial lifecycle
├── ActivationManager     → Onboarding progress tracking
├── ChecklistManager      → Onboarding checklists per business type
├── UpgradeManager        → Detect and recommend plan upgrades
├── RecommendationManager → Personalized recommendations
├── UsageAnalyzer         → Analyze customer usage patterns
├── ChurnManager          → Detect and score churn risk
├── RenewalManager        → Handle subscription renewals
└── RecoveryManager       → Re-engage inactive customers
```

## Customer Segments

| Segment | Description | Priority |
|---------|-------------|----------|
| new_customer | Recently registered | medium |
| active_free | Free plan with active usage | medium |
| growing_business | Active paid customer | high |
| premium_customer | High-value customer | high |
| inactive_customer | Low activity | medium |
| churn_risk | At risk of churning | critical |
| trial_active | Currently in trial | high |
| ecosystem_partner | Accommodation partner | medium |

## Lifecycle Flow

```
Business Registration
  ↓
Customer Created
  ↓
Trial Started (optional)
  ↓
Activation Steps
  ↓
Customer Active
  ↓
Usage Growth
  ↓
Upgrade Recommended
  ↓
Plan Change
  ↓
Renewal
  ↓
Retention / Churn Detection
  ↓
Recovery Actions
```

## Usage

```javascript
const lifecycle = context.capabilities.get('lifecycle')

// Create customer
lifecycle.createCustomer({
  tenantId: 'tenant_123',
  businessId: 'biz_123',
  plan: 'magnum_saas',
  businessType: 'accommodation',
})

// Start trial
lifecycle.startTrial('tenant_123', 'magnum_saas', 14)

// Track activation
lifecycle.completeActivationStep('tenant_123', 'photos_uploaded')
const progress = lifecycle.getActivationProgress('tenant_123')
// { percentage: 40, completed: 3, total: 7, blockers: [...] }

// Get recommendations
const recs = lifecycle.getRecommendations('tenant_123')
// [{ type: 'upgrade_available', priority: 'low', ... }]

// Check churn risk
const risk = lifecycle.getChurnRisk('tenant_123')
// { score: 65, riskLevel: 'high', factors: [...] }

// Record usage
lifecycle.recordUsage('tenant_123', 'reservation', 5)

// Get upgrade readiness
const readiness = lifecycle.analyzeUpgradeReadiness('tenant_123')
// { readinessScore: 75, signals: [...], recommendation: 'upgrade_candidate' }
```

## Trial Flow

```javascript
// Start 14-day trial
lifecycle.startTrial('tenant_123', 'magnum_saas', 14)

// Check expiration
lifecycle.checkTrialExpiration('tenant_123')
// { expired: false, daysRemaining: 10 }

// Convert to paid
lifecycle.convertTrial('tenant_123')
// → Subscription activated via SaaS
```

## Churn Detection

```javascript
// Calculate risk
const risk = lifecycle.getChurnRisk('tenant_123')
// { score: 65, riskLevel: 'high', factors: [...] }

// Get all high-risk customers
const highRisk = lifecycle.getHighRiskCustomers()

// Get distribution
const dist = lifecycle.getChurnDistribution()
// { total: 100, low: 60, medium: 20, high: 15, critical: 5 }
```

## Recovery

```javascript
// Create recovery action
lifecycle.createRecoveryAction('tenant_123', 'inactive', { plan: 'magnum_saas' })

// Get suggestions
const suggestions = lifecycle.getRecoverySuggestions('tenant_123')
// [{ type: 'inactive', priority: 'medium', message: '...' }]
```

## Events

| Event | Description |
|-------|-------------|
| `lifecycle:customer_created` | Customer created |
| `lifecycle:customer_activated` | Customer activated |
| `lifecycle:trial_started` | Trial started |
| `lifecycle:trial_converted` | Trial converted to paid |
| `lifecycle:upgrade_recommended` | Upgrade recommended |
| `lifecycle:customer_churn_risk` | Churn risk detected |
| `lifecycle:customer_recovered` | Customer recovered |
| `lifecycle:customer_renewed` | Subscription renewed |
