import { createStateMachine } from '../types/state-machines';

export type RecommendationLifecycleValue =
  | 'draft'
  | 'active'
  | 'monitored'
  | 'experimental'
  | 'deprecated'
  | 'archived';

export type RecommendationLifecycleEvent =
  | 'activate'
  | 'start_monitoring'
  | 'mark_experimental'
  | 'deprecate'
  | 'archive'
  | 'reactivate';

export const recommendationLifecycleMachine = createStateMachine<
  RecommendationLifecycleValue,
  RecommendationLifecycleEvent
>({
  draft: {
    activate: 'active',
    mark_experimental: 'experimental',
    archive: 'archived',
  },
  active: {
    start_monitoring: 'monitored',
    deprecate: 'deprecated',
    archive: 'archived',
  },
  monitored: {
    activate: 'active',
    deprecate: 'deprecated',
    archive: 'archived',
  },
  experimental: {
    activate: 'active',
    deprecate: 'deprecated',
    archive: 'archived',
  },
  deprecated: {
    reactivate: 'active',
    archive: 'archived',
  },
  archived: {},
});
