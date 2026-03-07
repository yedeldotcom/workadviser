import type { InterviewQuestion } from './branching';

export type ChangeEventType =
  | 'role_change'
  | 'manager_change'
  | 'team_change'
  | 'location_change'
  | 'schedule_change'
  | 'workload_change'
  | 'org_restructure'
  | 'return_from_leave'
  | 'new_policy'
  | 'conflict_event'
  | 'performance_review'
  | 'promotion'
  | 'other';

/**
 * Returns a shorter set of follow-up questions focused on
 * what changed and how it affects existing barriers.
 */
export function getFollowUpQuestions(changeType?: string): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [
    {
      id: 'fu_1',
      textHe: 'שלום! חזרנו לבדוק איך הדברים בעבודה. מה השתנה מאז הפעם הקודמת?',
      category: 'context',
      stage: 1,
      required: true,
    },
    {
      id: 'fu_2',
      textHe: 'איך השינוי הזה השפיע על העבודה שלך?',
      category: 'barrier',
      stage: 1,
      required: true,
      quickReplies: ['יותר קשה', 'בערך אותו דבר', 'יותר קל', 'קשה לדעת'],
    },
    {
      id: 'fu_3',
      textHe: 'האם ההמלצות שקיבלת בפעם הקודמת עדיין רלוונטיות?',
      category: 'context',
      stage: 1,
      required: true,
      quickReplies: ['כן, עדיין רלוונטיות', 'חלקית', 'לא, המצב השתנה', 'לא ניסיתי אותן'],
    },
  ];

  // Add change-specific questions
  if (changeType === 'manager_change' || changeType === 'team_change') {
    questions.push({
      id: 'fu_mgr_1',
      textHe: 'איך היחסים עם המנהל/ת או הצוות החדש?',
      category: 'trigger',
      stage: 1,
      required: false,
      quickReplies: ['טובים', 'בסדר', 'מאתגרים', 'מוקדם לדעת'],
    });
  }

  if (changeType === 'workload_change' || changeType === 'role_change') {
    questions.push({
      id: 'fu_load_1',
      textHe: 'איך אתה מרגיש/ה לגבי העומס הנוכחי?',
      category: 'barrier',
      stage: 1,
      required: false,
      quickReplies: ['סביר', 'קצת גבוה', 'גבוה מדי', 'נמוך מדי'],
    });
  }

  questions.push({
    id: 'fu_close',
    textHe: 'יש עוד משהו שחשוב שנדע?',
    category: 'context',
    stage: 1,
    required: false,
  });

  return questions;
}
