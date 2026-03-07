import { describe, it, expect } from 'vitest';
import { recommendationLifecycleMachine } from '../../src/core/state-machines/recommendation-lifecycle';

describe('Recommendation Lifecycle State Machine', () => {
  it('draft → active', () => {
    expect(recommendationLifecycleMachine.transition('draft', 'activate')).toBe('active');
  });

  it('active → monitored → active', () => {
    expect(recommendationLifecycleMachine.transition('active', 'start_monitoring')).toBe('monitored');
    expect(recommendationLifecycleMachine.transition('monitored', 'activate')).toBe('active');
  });

  it('draft → experimental → active', () => {
    expect(recommendationLifecycleMachine.transition('draft', 'mark_experimental')).toBe('experimental');
    expect(recommendationLifecycleMachine.transition('experimental', 'activate')).toBe('active');
  });

  it('deprecated → reactivate → active', () => {
    expect(recommendationLifecycleMachine.transition('deprecated', 'reactivate')).toBe('active');
  });

  it('archived is terminal', () => {
    expect(recommendationLifecycleMachine.validate('archived', 'activate')).toBeNull();
  });

  it('any non-terminal state can archive', () => {
    const states = ['draft', 'active', 'monitored', 'experimental', 'deprecated'] as const;
    for (const s of states) {
      expect(recommendationLifecycleMachine.transition(s, 'archive')).toBe('archived');
    }
  });
});
