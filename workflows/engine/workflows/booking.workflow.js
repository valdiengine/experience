/**
 * Workflow Engine — Predefined Booking Workflow
 *
 * Handles the full booking lifecycle: trigger → validate → reserve → notify → complete
 * Business-agnostic: booking is a generic reservation workflow
 */

export const BOOKING_WORKFLOW = {
  id: 'booking_workflow',
  tenantId: null, // Set per tenant
  name: 'Booking Lifecycle',
  description: 'Handles booking from request to confirmation',
  status: 'active',
  variables: {
    reservationId: null,
    customerName: null,
    customerEmail: null,
    resourceId: null,
    date: null,
    confirmed: false,
  },
  nodes: [
    {
      id: 'trigger',
      type: 'trigger',
      name: 'Booking Request',
      config: {
        triggerType: 'event',
        eventName: 'booking:created',
      },
    },
    {
      id: 'validate',
      type: 'action',
      name: 'Validate Booking',
      config: {
        actionType: 'set_variable',
        params: { key: 'validated', value: true },
      },
    },
    {
      id: 'check_availability',
      type: 'condition',
      name: 'Check Availability',
      config: {
        field: 'validated',
        operator: 'equals',
        value: true,
      },
    },
    {
      id: 'reserve',
      type: 'action',
      name: 'Create Reservation',
      config: {
        actionType: 'call_service',
        service: 'reservation',
        method: 'create',
        params: {
          resource: '$resourceId',
          date: '$date',
          customer: { name: '$customerName', email: '$customerEmail' },
        },
      },
    },
    {
      id: 'notify_confirmation',
      type: 'action',
      name: 'Send Confirmation',
      config: {
        actionType: 'call_service',
        service: 'notification',
        method: 'sendFromTemplate',
        params: {
          templateId: 'reservation_confirmation',
          recipient: '$customerEmail',
          variables: { customer_name: '$customerName', reservation_id: '$reservationId' },
        },
      },
    },
    {
      id: 'end',
      type: 'end',
      name: 'Booking Complete',
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'validate' },
    { id: 'e2', source: 'validate', target: 'check_availability' },
    { id: 'e3', source: 'check_availability', target: 'reserve', label: 'true' },
    { id: 'e4', source: 'reserve', target: 'notify_confirmation' },
    { id: 'e5', source: 'notify_confirmation', target: 'end' },
  ],
}
