import { CAMPAIGN_STATUS, CAMPAIGN_TYPE } from '../operations.schema.js';
import { OPERATIONS_EVENTS, createOperationsEvent } from '../operations.events.js';

export default class CampaignManager {
  constructor(context) {
    this.context = context;
    this.campaigns = new Map();
    this.participants = new Map();
  }

  async createCampaign(destinationId, type, name, description, goal, rewards = []) {
    const id = 'campaign-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const campaign = {
      id, destinationId, type, name, description, goal,
      progress: { current: 0, target: goal.target || 100, percentage: 0 },
      rewards,
      status: CAMPAIGN_STATUS.DRAFT,
      startDate: null, endDate: null,
      createdBy: null, createdAt: new Date()
    };
    this.campaigns.set(id, campaign);
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.CAMPAIGN_CREATED, { campaignId: id, destinationId, type }));
    return campaign;
  }

  async startCampaign(campaignId, startedBy) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.status !== CAMPAIGN_STATUS.DRAFT) return null;
    campaign.status = CAMPAIGN_STATUS.ACTIVE;
    campaign.startDate = new Date();
    campaign.createdBy = startedBy;
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.CAMPAIGN_STARTED, { campaignId, destinationId: campaign.destinationId }));
    return campaign;
  }

  async updateProgress(campaignId, increment = 1) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.status !== CAMPAIGN_STATUS.ACTIVE) return null;
    campaign.progress.current = Math.min(campaign.progress.current + increment, campaign.progress.target);
    campaign.progress.percentage = Math.round((campaign.progress.current / campaign.progress.target) * 100);
    if (campaign.progress.current >= campaign.progress.target) {
      campaign.status = CAMPAIGN_STATUS.COMPLETED;
      campaign.endDate = new Date();
      this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.CAMPAIGN_COMPLETED, { campaignId, destinationId: campaign.destinationId }));
    } else if (campaign.progress.percentage >= 50 && campaign.progress.percentage < 55) {
      this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.CAMPAIGN_MILESTONE_REACHED, { campaignId, milestone: '50%' }));
    }
    return campaign;
  }

  async addParticipant(campaignId, visitorId) {
    const key = campaignId + ':' + visitorId;
    if (this.participants.has(key)) return false;
    this.participants.set(key, { campaignId, visitorId, joinedAt: new Date(), contributions: 0 });
    return true;
  }

  async recordContribution(campaignId, visitorId) {
    const key = campaignId + ':' + visitorId;
    const participant = this.participants.get(key);
    if (!participant) return null;
    participant.contributions++;
    await this.updateProgress(campaignId);
    return participant;
  }

  async archiveCampaign(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;
    campaign.status = CAMPAIGN_STATUS.ARCHIVED;
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.CAMPAIGN_ARCHIVED, { campaignId }));
    return campaign;
  }

  getCampaign(campaignId) {
    return this.campaigns.get(campaignId) || null;
  }

  getActiveCampaigns(destinationId) {
    return Array.from(this.campaigns.values()).filter(c => c.destinationId === destinationId && c.status === CAMPAIGN_STATUS.ACTIVE);
  }

  getCampaignsByType(destinationId, type) {
    return Array.from(this.campaigns.values()).filter(c => c.destinationId === destinationId && c.type === type);
  }

  getCampaignParticipants(campaignId) {
    return Array.from(this.participants.values()).filter(p => p.campaignId === campaignId);
  }

  getCampaignStats(destinationId) {
    const campaigns = Array.from(this.campaigns.values()).filter(c => c.destinationId === destinationId);
    return {
      total: campaigns.length,
      draft: campaigns.filter(c => c.status === CAMPAIGN_STATUS.DRAFT).length,
      active: campaigns.filter(c => c.status === CAMPAIGN_STATUS.ACTIVE).length,
      completed: campaigns.filter(c => c.status === CAMPAIGN_STATUS.COMPLETED).length,
      archived: campaigns.filter(c => c.status === CAMPAIGN_STATUS.ARCHIVED).length
    };
  }
}
