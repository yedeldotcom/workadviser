import { describe, it, expect } from 'vitest';
import { outputReleaseStateMachine } from '../../src/core/state-machines/output-release';

describe('Output Release State Machine', () => {
  it('follows happy path: draft → review → approved → user delivery → delivered → viewed', () => {
    let state = outputReleaseStateMachine.transition('draft_generated', 'submit_for_review');
    expect(state).toBe('admin_review_required');

    state = outputReleaseStateMachine.transition(state, 'approve');
    expect(state).toBe('admin_edited_approved');

    state = outputReleaseStateMachine.transition(state, 'mark_ready_for_user');
    expect(state).toBe('user_delivery_ready');

    state = outputReleaseStateMachine.transition(state, 'deliver_to_user');
    expect(state).toBe('delivered_to_user');

    state = outputReleaseStateMachine.transition(state, 'user_view');
    expect(state).toBe('user_viewed');
  });

  it('follows employer sharing path', () => {
    let state = outputReleaseStateMachine.transition('user_viewed', 'user_approve_employer_sharing');
    expect(state).toBe('user_approved_employer_sharing');

    state = outputReleaseStateMachine.transition(state, 'mark_ready_for_employer');
    expect(state).toBe('employer_delivery_ready');

    state = outputReleaseStateMachine.transition(state, 'send_to_employer');
    expect(state).toBe('sent_to_employer');

    state = outputReleaseStateMachine.transition(state, 'employer_view');
    expect(state).toBe('employer_viewed');
  });

  it('supports user correction flow', () => {
    const state = outputReleaseStateMachine.transition('user_viewed', 'user_request_correction');
    expect(state).toBe('user_requested_correction');

    const next = outputReleaseStateMachine.transition(state, 'correction_complete');
    expect(next).toBe('draft_generated');
  });

  it('allows withholding from most states', () => {
    const states = [
      'draft_generated',
      'admin_review_required',
      'admin_edited_approved',
      'user_delivery_ready',
      'delivered_to_user',
    ] as const;

    for (const s of states) {
      expect(outputReleaseStateMachine.transition(s, 'withhold')).toBe('withheld_cancelled');
    }
  });

  it('terminal states have no transitions', () => {
    expect(outputReleaseStateMachine.validate('withheld_cancelled', 'approve')).toBeNull();
    expect(outputReleaseStateMachine.validate('archived_replaced', 'approve')).toBeNull();
  });
});
