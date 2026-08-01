# SEO Intelligence Capability

**Version:** 1.0.0
**Status:** Stable
**Dependencies:** cms, public, observability, intelligence

## Purpose

Business-agnostic SEO intelligence and content management layer. Analyzes tenant content, detects SEO issues, finds optimization opportunities, and manages content normalization.

## Architecture

```
seo-intelligence.capability.js → SEOIntelligenceManager
                                  ├── ContentAnalyzer
                                  ├── MetadataAnalyzer
                                  ├── SchemaAnalyzer
                                  ├── KeywordAnalyzer
                                  ├── LinkAnalyzer
                                  └── LinkRecommendation

cms/content.manager.js → ContentManager (normalizes WordPress, future Backend, Static JSON)

public/builder/ → PageBuilder + SectionBuilder (dynamic landing pages)
```

## Modules

### SEO Intelligence

#### SEOIntelligenceManager
- Orchestrates all SEO analysis sub-modules
- Consumes normalized CMS data only
- Never touches WordPress directly

#### ContentAnalyzer
- Missing descriptions
- Thin content
- Missing sections
- Duplicate content
- Content freshness

#### MetadataAnalyzer
- Title validation (30-60 chars)
- Description validation (70-160 chars)
- Canonical URL check
- Open Graph metadata
- Twitter Card metadata

#### SchemaAnalyzer
- JSON-LD validation
- Business schema validation
- Required fields by type
- Tenant schema completeness

#### KeywordAnalyzer
- Topic extraction
- Search intent classification
- Keyword opportunities
- Related terms detection

#### LinkAnalyzer
- Internal link mapping
- Orphan page detection
- Broken link detection
- Link score calculation

#### LinkRecommendation
- Contextual link suggestions
- Topic-based cross-linking
- Orphan page recovery
- Content similarity analysis

### Content Management

#### ContentManager
- Multi-source normalization (WordPress, future Backend, Static JSON)
- Unified page format
- Cache management
- SEO metadata extraction (Yoast, custom fields)

### Dynamic Pages

#### PageBuilder
- Tenant-configured pages
- Service pages auto-generation
- Landing pages
- Campaign pages

#### SectionBuilder
- 12 section types: hero, services, gallery, testimonials, contact, pricing, faq, booking, map, about, carousel, custom
- HTML rendering from config

## Events

| Event | Description |
|-------|-------------|
| `seo-intelligence:analysis_started` | Analysis started |
| `seo-intelligence:analysis_completed` | Analysis completed |
| `seo-intelligence:issue_detected` | SEO issue found |
| `seo-intelligence:opportunity_found` | Optimization opportunity found |
| `seo:content_updated` | Content updated |
| `seo:content_published` | Content published |

## Usage

```javascript
// Analyze tenant SEO
const result = await seoIntelligence.analyzeTenant('tenant_123')
// { score: 85, issues: [...], opportunities: [...], recommendations: [...] }

// Analyze single page
const pageResult = await seoIntelligence.analyzePage('page_1', 'tenant_123')

// Get cached analysis
const cached = seoIntelligence.getCachedAnalysis('tenant_123')

// Link analysis
const links = linkAnalyzer.analyze(pages)
// { links, orphanPages, brokenLinks, score }

// Link recommendations
const recommendations = linkRecommendation.generate(pages, links)

// Content normalization
const contentManager = new ContentManager(context)
contentManager.registerSource('wordpress', wpAdapter)
const pages = await contentManager.loadAll('tenant_123')

// Dynamic page building
pageBuilder.registerPage('torres-del-paine', {
  title: 'Torres del Paine',
  sections: [...],
})
const html = pageBuilder.renderPage('torres-del-paine')
```
