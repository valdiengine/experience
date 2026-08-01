import { STORY_TYPE, VALIDATION_STATUS } from '../identity.schema.js';
import { IDENTITY_EVENTS, createIdentityEvent } from '../identity.events.js';

export default class StoryManager {
  constructor(context) {
    this.context = context;
    this.stories = new Map();
  }

  async createStory(destinationId, type, title, summary, data = {}) {
    const id = 'story-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const story = {
      id, destinationId, type, title, summary,
      chapters: data.chapters || [],
      author: data.author || { name: 'Anonymous', verified: false },
      media: data.media || [],
      location: data.location || null,
      timePeriod: data.timePeriod || 'present',
      characters: data.characters || [],
      themes: data.themes || [],
      validationStatus: VALIDATION_STATUS.PENDING,
      publishedAt: null,
      createdAt: new Date()
    };
    this.stories.set(id, story);
    this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.STORY_CREATED, { storyId: id, destinationId, type }));
    return story;
  }

  async addChapter(storyId, chapter) {
    const story = this.stories.get(storyId);
    if (!story) return null;
    const chapterEntry = {
      id: 'ch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      title: chapter.title || '',
      content: chapter.content || '',
      media: chapter.media || [],
      timeline: chapter.timeline || null,
      characters: chapter.characters || []
    };
    story.chapters.push(chapterEntry);
    return story;
  }

  async publishStory(storyId) {
    const story = this.stories.get(storyId);
    if (!story) return null;
    story.validationStatus = VALIDATION_STATUS.COMMUNITY_APPROVED;
    story.publishedAt = new Date();
    this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.STORY_PUBLISHED, { storyId, destinationId: story.destinationId }));
    return story;
  }

  async validateStory(storyId, validatorId, status) {
    const story = this.stories.get(storyId);
    if (!story) return null;
    story.validationStatus = status;
    if (status === VALIDATION_STATUS.CULTURALLY_VALIDATED) {
      this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.STORY_VALIDATED, { storyId, destinationId: story.destinationId, validatorId }));
    }
    return story;
  }

  async addMedia(storyId, media) {
    const story = this.stories.get(storyId);
    if (!story) return null;
    story.media.push({ id: 'media-' + Date.now(), ...media, addedAt: new Date() });
    return story;
  }

  async addCharacter(storyId, character) {
    const story = this.stories.get(storyId);
    if (!story) return null;
    story.characters.push(character);
    return story;
  }

  async addTheme(storyId, theme) {
    const story = this.stories.get(storyId);
    if (!story) return null;
    if (!story.themes.includes(theme)) story.themes.push(theme);
    return story;
  }

  getStory(storyId) {
    return this.stories.get(storyId) || null;
  }

  getStoriesByDestination(destinationId) {
    return Array.from(this.stories.values()).filter(s => s.destinationId === destinationId);
  }

  getStoriesByType(destinationId, type) {
    return Array.from(this.stories.values()).filter(s => s.destinationId === destinationId && s.type === type);
  }

  getPublishedStories(destinationId) {
    return Array.from(this.stories.values()).filter(s => s.destinationId === destinationId && s.publishedAt);
  }

  getStoriesByLocation(destinationId, locationId) {
    return Array.from(this.stories.values()).filter(s => s.destinationId === destinationId && s.location?.id === locationId);
  }

  getStoriesByCharacter(destinationId, characterName) {
    return Array.from(this.stories.values()).filter(s => s.destinationId === destinationId && s.characters.some(c => c.name === characterName));
  }

  getStoryStats(destinationId) {
    const stories = this.getStoriesByDestination(destinationId);
    return {
      total: stories.length,
      published: stories.filter(s => s.publishedAt).length,
      pending: stories.filter(s => s.validationStatus === VALIDATION_STATUS.PENDING).length,
      validated: stories.filter(s => s.validationStatus === VALIDATION_STATUS.CULTURALLY_VALIDATED).length,
      byType: Object.fromEntries(Object.values(STORY_TYPE).map(t => [t, stories.filter(s => s.type === t).length]))
    };
  }
}
