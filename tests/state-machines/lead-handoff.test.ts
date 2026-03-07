import { describe, it, expect } from 'vitest';
import { leadHandoffMachine } from '../../src/core/state-machines/lead-handoff';

describe('Lead Handoff State Machine', () => {
  it('follows full path: detected → created → exported → confirmed', () => {
    let state = leadHandoffMachine.transition('detected', 'create_lead');
    expect(state).toBe('lead_created');

    state = leadHandoffMachine.transition(state, 'export');
    expect(state).toBe('exported');

    state = leadHandoffMachine.transition(state, 'confirm');
    expect(state).toBe('confirmed');
  });

  it('confirmed is terminal', () => {
    expect(leadHandoffMachine.validate('confirmed', 'create_lead')).toBeNull();
  });

  it('throws on skipping steps', () => {
    expect(() => leadHandoffMachine.transition('detected', 'export')).toThrow('Invalid transition');
  });
});
