/**
 * Workflow Engine — Predefined Lead Workflow
 *
 * Handles lead capture → scoring → qualification → follow-up
 * Business-agnostic: leads are generic potential customers
 */

export const LEAD_WORKFLOW = {
  id: 'lead_workflow',
  tenantId: null,
  name: 'Lead Capture & Qualification',
  description: 'Captures leads, scores them, and triggers follow-up',
  status: 'active',
  variables: {
    leadName: null,
    leadEmail: null,
    leadSource: null,
    score: 0,
    qualified: false,
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger',
      name: 'Lead Captured',
      config: {
        triggerType: 'event',
        eventName: 'lead:created',
      },
    },
    {
      id: 'score_lead',
      type: 'action',
      name: 'Score Lead',
      config: {
        actionType: 'set_variable',
        params: { key: 'score', value: 50 },
      },
    },
    {
      id: 'check_qualification',
      type: 'condition',
      name: 'Check Qualification',
      config: {
        field: 'score',
        operator: 'gte',
        value: 40,
      },
    },
    {
      id: 'qualify',
      type: 'action',
      name: 'Mark Qualified',
      config: {
        actionType: 'set_variable',
        params: { key: 'qualified', value: true },
      },
    },
    {
      id: 'send_welcome',
      type: 'action',
      name: 'Send Welcome Email',
      config: {
        actionType: 'call_service',
        service: 'notification',
        method: 'sendFromTemplate',
        params: {
          templateId: 'welcome_customer',
          recipient: '$leadEmail',
          variables: { customer_name: '$leadName' },
        },
      },
    },
    {
      id: 'follow_up_delay',
      type: 'delay',
      name: 'Wait 1 Day',
      config: {
        delayType: 'fixed',
        duration: 1,
        unit: 'days',
      },
    },
    {
      id: 'follow_up',
      type: 'action',
      name: 'Send Follow-up',
      config: {
        actionType: 'log',
        params: { message: 'Follow-up sent for lead', level: 'info' },
      },
    },
    {
      id: 'end',
      type: 'end',
      name: 'Lead Processed',
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'score_lead' },
    { id: 'e2', source: 'score_lead', target: 'check_qualification' },
    { id: 'e3', source: 'check_qualification', target: 'qualify', label: 'true' },
    { id: 'e4', source: 'qualify', target: 'send_welcome' },
    { id: 'e5', source: 'send_welcome', target: 'follow_up_delay' },
    { id: 'e6', source: 'follow_up_delay', target: 'follow_up' },
    { id: 'e7', source: 'follow_up', target: 'end' },
  ],
}
