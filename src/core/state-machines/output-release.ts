import { createStateMachine } from '../types/state-machines';

export type ReleaseStateValue =
  | 'draft_generated'
  | 'admin_review_required'
  | 'admin_edited_approved'
  | 'user_delivery_ready'
  | 'delivered_to_user'
  | 'user_viewed'
  | 'user_requested_correction'
  | 'user_approved_employer_sharing'
  | 'employer_delivery_ready'
  | 'sent_to_employer'
  | 'employer_viewed'
  | 'withheld_cancelled'
  | 'archived_replaced';

export type ReleaseEvent =
  | 'submit_for_review'
  | 'approve'
  | 'mark_ready_for_user'
  | 'deliver_to_user'
  | 'user_view'
  | 'user_request_correction'
  | 'correction_complete'
  | 'user_approve_employer_sharing'
  | 'mark_ready_for_employer'
  | 'send_to_employer'
  | 'employer_view'
  | 'withhold'
  | 'cancel'
  | 'archive'
  | 'replace';

export const outputReleaseStateMachine = createStateMachine<ReleaseStateValue, ReleaseEvent>({
  draft_generated: {
    submit_for_review: 'admin_review_required',
    mark_ready_for_user: 'user_delivery_ready',
    withhold: 'withheld_cancelled',
  },
  admin_review_required: {
    approve: 'admin_edited_approved',
    withhold: 'withheld_cancelled',
  },
  admin_edited_approved: {
    mark_ready_for_user: 'user_delivery_ready',
    withhold: 'withheld_cancelled',
  },
  user_delivery_ready: {
    deliver_to_user: 'delivered_to_user',
    withhold: 'withheld_cancelled',
  },
  delivered_to_user: {
    user_view: 'user_viewed',
    withhold: 'withheld_cancelled',
  },
  user_viewed: {
    user_request_correction: 'user_requested_correction',
    user_approve_employer_sharing: 'user_approved_employer_sharing',
    archive: 'archived_replaced',
  },
  user_requested_correction: {
    correction_complete: 'draft_generated',
    cancel: 'withheld_cancelled',
  },
  user_approved_employer_sharing: {
    mark_ready_for_employer: 'employer_delivery_ready',
    cancel: 'withheld_cancelled',
  },
  employer_delivery_ready: {
    send_to_employer: 'sent_to_employer',
    cancel: 'withheld_cancelled',
  },
  sent_to_employer: {
    employer_view: 'employer_viewed',
    archive: 'archived_replaced',
  },
  employer_viewed: {
    archive: 'archived_replaced',
    replace: 'archived_replaced',
  },
  withheld_cancelled: {},
  archived_replaced: {},
});
