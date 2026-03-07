import { EmploymentStage, DisclosureLevel } from '../types/enums';

export interface InterviewQuestion {
  id: string;
  textHe: string;
  category: 'employment' | 'barrier' | 'trigger' | 'context' | 'disclosure' | 'change_event';
  stage: number;
  required: boolean;
  quickReplies?: string[];
}

/**
 * Returns the next set of questions based on current interview state.
 * Questions are structured to go from low-intensity to deeper probing.
 */
export function getQuestionsByStage(stage: number): InterviewQuestion[] {
  switch (stage) {
    case 1:
      return getOnboardingQuestions();
    case 2:
      return getEmploymentContextQuestions();
    case 3:
      return getBarrierExplorationQuestions();
    case 4:
      return getTriggerQuestions();
    case 5:
      return getDisclosureQuestions();
    case 6:
      return getClosingQuestions();
    default:
      return [];
  }
}

function getOnboardingQuestions(): InterviewQuestion[] {
  return [
    {
      id: 'onb_1',
      textHe: 'היי, לפני שנתחיל — מה שם שלך? (ניתן גם לא לציין)',
      category: 'context',
      stage: 1,
      required: false,
    },
    {
      id: 'onb_2',
      textHe: 'האם את/ה עובד/ת כרגע, מחפש/ת עבודה, או חוזר/ת לעבודה?',
      category: 'employment',
      stage: 1,
      required: true,
      quickReplies: ['עובד/ת כרגע', 'מחפש/ת עבודה', 'חוזר/ת לעבודה', 'אחר'],
    },
  ];
}

function getEmploymentContextQuestions(): InterviewQuestion[] {
  return [
    {
      id: 'emp_1',
      textHe: 'מה התפקיד שלך (או התפקיד שאת/ה מחפש/ת)?',
      category: 'employment',
      stage: 2,
      required: false,
    },
    {
      id: 'emp_2',
      textHe: 'באיזה סוג מקום עבודה?',
      category: 'employment',
      stage: 2,
      required: false,
      quickReplies: ['מגזר ציבורי', 'חברה פרטית', 'עמותה', 'חינוך', 'עסק קטן', 'אחר'],
    },
    {
      id: 'emp_3',
      textHe: 'כמה זמן את/ה בתפקיד הנוכחי?',
      category: 'employment',
      stage: 2,
      required: false,
      quickReplies: ['פחות מחודש', '1-6 חודשים', '6-12 חודשים', 'שנה ומעלה'],
    },
  ];
}

function getBarrierExplorationQuestions(): InterviewQuestion[] {
  return [
    {
      id: 'bar_1',
      textHe: 'מה הכי מקשה עליך בעבודה? אפשר לתאר בחופשיות, בטקסט או בהודעה קולית.',
      category: 'barrier',
      stage: 3,
      required: true,
    },
    {
      id: 'bar_2',
      textHe: 'האם יש מצבים ספציפיים בעבודה שמרגישים קשים במיוחד?',
      category: 'barrier',
      stage: 3,
      required: false,
    },
    {
      id: 'bar_3',
      textHe: 'איך סביבת העבודה הפיזית — רעש, תאורה, צפיפות?',
      category: 'barrier',
      stage: 3,
      required: false,
      quickReplies: ['בסדר', 'קצת מפריע', 'מאוד מפריע', 'לא רלוונטי'],
    },
  ];
}

function getTriggerQuestions(): InterviewQuestion[] {
  return [
    {
      id: 'trg_1',
      textHe: 'האם יש מצבים בעבודה שגורמים למתח חזק או לתגובה שקשה לך?',
      category: 'trigger',
      stage: 4,
      required: false,
    },
    {
      id: 'trg_2',
      textHe: 'איך היחסים עם המנהל/ת הישיר/ה?',
      category: 'trigger',
      stage: 4,
      required: false,
      quickReplies: ['טובים', 'בסדר', 'מאתגרים', 'מעדיף/ה לא לענות'],
    },
  ];
}

function getDisclosureQuestions(): InterviewQuestion[] {
  return [
    {
      id: 'dis_1',
      textHe: 'האם שיתפת את המעסיק שלך על מצבך?',
      category: 'disclosure',
      stage: 5,
      required: true,
      quickReplies: ['כן, באופן מלא', 'חלקית', 'לא', 'לא בטוח/ה'],
    },
    {
      id: 'dis_2',
      textHe: 'האם את/ה מעוניין/ת שניצור מסמך שיכול לעזור למעסיק להבין מה יכול לעזור?',
      category: 'disclosure',
      stage: 5,
      required: true,
      quickReplies: ['כן', 'אולי, אחליט אחר כך', 'לא כרגע'],
    },
  ];
}

function getClosingQuestions(): InterviewQuestion[] {
  return [
    {
      id: 'cls_1',
      textHe: 'יש משהו נוסף שחשוב לך שנדע?',
      category: 'context',
      stage: 6,
      required: false,
    },
  ];
}

/**
 * Returns IDs of all required questions across all stages.
 */
export function getRequiredQuestionIds(): string[] {
  const allQuestions: InterviewQuestion[] = [];
  for (let stage = 1; stage <= 6; stage++) {
    allQuestions.push(...getQuestionsByStage(stage));
  }
  return allQuestions.filter((q) => q.required).map((q) => q.id);
}

/**
 * Checks whether all required interview questions have been answered.
 */
export function isInterviewComplete(answeredIds: Set<string | null>): boolean {
  const requiredIds = getRequiredQuestionIds();
  return requiredIds.every((id) => answeredIds.has(id));
}

export function mapEmploymentStage(response: string): EmploymentStage | undefined {
  const map: Record<string, EmploymentStage> = {
    'עובד/ת כרגע': EmploymentStage.ACTIVE_EMPLOYMENT,
    'מחפש/ת עבודה': EmploymentStage.JOB_SEARCH,
    'חוזר/ת לעבודה': EmploymentStage.RETURN_TO_WORK,
  };
  return map[response];
}

export function mapDisclosureLevel(response: string): DisclosureLevel | undefined {
  const map: Record<string, DisclosureLevel> = {
    'כן, באופן מלא': DisclosureLevel.FULL_VOLUNTARY,
    'חלקית': DisclosureLevel.PARTIAL_CONTEXTUAL,
    'לא': DisclosureLevel.NONE,
    'לא בטוח/ה': DisclosureLevel.NONE,
  };
  return map[response];
}
