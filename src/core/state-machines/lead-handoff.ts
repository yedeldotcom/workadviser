import { createStateMachine } from '../types/state-machines';

export type LeadHandoffStateValue =
  | 'detected'
  | 'lead_created'
  | 'exported'
  | 'confirmed';

export type LeadHandoffEvent =
  | 'create_lead'
  | 'export'
  | 'confirm';

export const leadHandoffMachine = createStateMachine<LeadHandoffStateValue, LeadHandoffEvent>({
  detected: {
    create_lead: 'lead_created',
  },
  lead_created: {
    export: 'exported',
  },
  exported: {
    confirm: 'confirmed',
  },
  confirmed: {},
});
