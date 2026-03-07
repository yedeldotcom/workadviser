import { describe, it, expect } from 'vitest';
import { reviewApprovalMachine } from '../../src/core/state-machines/review-approval';

describe('Review Approval State Machine', () => {
  it('pending → in_review → approved', () => {
    let state = reviewApprovalMachine.transition('pending_review', 'start_review');
    expect(state).toBe('in_review');
    state = reviewApprovalMachine.transition(state, 'approve');
    expect(state).toBe('approved');
  });

  it('supports reject and resubmit', () => {
    let state = reviewApprovalMachine.transition('in_review', 'reject');
    expect(state).toBe('rejected');
    state = reviewApprovalMachine.transition(state, 'resubmit');
    expect(state).toBe('pending_review');
  });

  it('supports edit then approve', () => {
    let state = reviewApprovalMachine.transition('in_review', 'edit');
    expect(state).toBe('edited');
    state = reviewApprovalMachine.transition(state, 'approve');
    expect(state).toBe('approved');
  });

  it('approved is terminal', () => {
    expect(reviewApprovalMachine.validate('approved', 'reject')).toBeNull();
  });
});
