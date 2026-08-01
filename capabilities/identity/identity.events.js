export const IDENTITY_EVENTS = Object.freeze({
  IDENTITY_CREATED: 'identity.destination.created',
  IDENTITY_UPDATED: 'identity.destination.updated',

  STORY_CREATED: 'identity.story.created',
  STORY_PUBLISHED: 'identity.story.published',
  STORY_VALIDATED: 'identity.story.validated',

  HERITAGE_ITEM_ADDED: 'identity.heritage.item.added',
  HERITAGE_ITEM_VALIDATED: 'identity.heritage.item.validated',
  HERITAGE_ITEM_UPDATED: 'identity.heritage.item.updated',

  HERO_ADDED: 'identity.hero.added',
  HERO_VERIFIED: 'identity.hero.verified',
  HERO_RECOGNIZED: 'identity.hero.recognized',

  CULTURAL_DISCOVERY_COMPLETED: 'identity.cultural.discovery.completed',
  CULTURAL_POKEDEX_ENTRY_ADDED: 'identity.cultural.pokedex.entry.added',

  CULTURAL_MEMORY_CREATED: 'identity.cultural.memory.created',
  CULTURAL_MEMORY_VALIDATED: 'identity.cultural.memory.validated',

  COMMUNITY_STORY_SUBMITTED: 'identity.community.story.submitted',
  COMMUNITY_STORY_APPROVED: 'identity.community.story.approved',

  STORY_RECOMMENDATION_GENERATED: 'identity.story.recommendation.generated',
  CULTURAL_ROUTE_CREATED: 'identity.cultural.route.created'
});

export function createIdentityEvent(type, data) {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    source: 'identity-capability'
  };
}
