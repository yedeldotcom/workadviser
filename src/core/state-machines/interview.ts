import { createStateMachine } from '../types/state-machines';

export type InterviewStateValue =
  | 'onboarding'
  | 'active'
  | 'paused'
  | 'completed'
  | 'follow_up';

export type InterviewEvent =
  | 'start_interview'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'start_follow_up'
  | 'distress_pause';

export const interviewStateMachine = createStateMachine<InterviewStateValue, InterviewEvent>({
  onboarding: {
    start_interview: 'active',
  },
  active: {
    pause: 'paused',
    distress_pause: 'paused',
    complete: 'completed',
  },
  paused: {
    resume: 'active',
  },
  completed: {
    start_follow_up: 'follow_up',
  },
  follow_up: {
    pause: 'paused',
    complete: 'completed',
  },
});
