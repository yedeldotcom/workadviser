import { createStateMachine } from '../types/state-machines';

export type ReviewStateValue =
  | 'pending_review'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'edited';

export type ReviewEvent =
  | 'start_review'
  | 'approve'
  | 'reject'
  | 'edit'
  | 'resubmit';

export const reviewApprovalMachine = createStateMachine<ReviewStateValue, ReviewEvent>({
  pending_review: {
    start_review: 'in_review',
  },
  in_review: {
    approve: 'approved',
    reject: 'rejected',
    edit: 'edited',
  },
  rejected: {
    resubmit: 'pending_review',
  },
  edited: {
    approve: 'approved',
    resubmit: 'pending_review',
  },
  approved: {},
});
