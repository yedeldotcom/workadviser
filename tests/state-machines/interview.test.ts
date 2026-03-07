import { describe, it, expect } from 'vitest';
import { interviewStateMachine } from '../../src/core/state-machines/interview';

describe('Interview State Machine', () => {
  it('transitions from onboarding to active', () => {
    expect(interviewStateMachine.transition('onboarding', 'start_interview')).toBe('active');
  });

  it('transitions from active to paused', () => {
    expect(interviewStateMachine.transition('active', 'pause')).toBe('paused');
  });

  it('transitions from active to paused on distress', () => {
    expect(interviewStateMachine.transition('active', 'distress_pause')).toBe('paused');
  });

  it('transitions from paused back to active', () => {
    expect(interviewStateMachine.transition('paused', 'resume')).toBe('active');
  });

  it('transitions from active to completed', () => {
    expect(interviewStateMachine.transition('active', 'complete')).toBe('completed');
  });

  it('transitions from completed to follow_up', () => {
    expect(interviewStateMachine.transition('completed', 'start_follow_up')).toBe('follow_up');
  });

  it('transitions from follow_up to completed', () => {
    expect(interviewStateMachine.transition('follow_up', 'complete')).toBe('completed');
  });

  it('throws on invalid transition', () => {
    expect(() => interviewStateMachine.transition('onboarding', 'complete')).toThrow(
      'Invalid transition'
    );
  });

  it('validate returns null for invalid transition', () => {
    expect(interviewStateMachine.validate('completed', 'pause')).toBeNull();
  });

  it('validate returns next state for valid transition', () => {
    expect(interviewStateMachine.validate('active', 'complete')).toBe('completed');
  });
});
