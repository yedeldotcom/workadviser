import { CaseProfile } from '../engine/case-profiler';
import { PackagedRecommendation } from '../engine/packager';
import { Audience } from '../types/enums';
import { applyDisclosureFilter } from './disclosure-filter';

export interface UserReportSection {
  id: string;
  titleHe: string;
  contentHe: string;
}

export interface UserReport {
  sections: UserReportSection[];
  recommendations: PackagedRecommendation[];
  generatedAt: Date;
}

export function generateUserReport(
  profile: CaseProfile,
  userRecs: PackagedRecommendation[],
  employerRecs: PackagedRecommendation[]
): UserReport {
  const sections: UserReportSection[] = [];

  // Section 1: What we understood
  sections.push({
    id: 'situation_summary',
    titleHe: 'מה הבנו מהשיחה',
    contentHe: buildSituationSummary(profile),
  });

  // Section 2: Main barriers
  sections.push({
    id: 'main_barriers',
    titleHe: 'חסמים עיקריים שזוהו',
    contentHe: buildBarriersSummary(profile),
  });

  // Section 3: What may be making them harder
  if (profile.amplifiers.length > 0 || profile.triggers.length > 0) {
    sections.push({
      id: 'amplifiers',
      titleHe: 'מה עלול להחמיר את המצב',
      contentHe: buildAmplifiersSummary(profile),
    });
  }

  // Section 4: Top recommendations for you
  sections.push({
    id: 'user_recommendations',
    titleHe: 'המלצות עבורך',
    contentHe: buildRecommendationsList(userRecs),
  });

  // Section 5: What an employer may need
  if (employerRecs.length > 0) {
    sections.push({
      id: 'employer_summary',
      titleHe: 'מה מעסיק יכול לעשות',
      contentHe: buildRecommendationsList(employerRecs),
    });
  }

  // Section 6: Conversation prep
  sections.push({
    id: 'conversation_prep',
    titleHe: 'הכנה לשיחה עם מעסיק',
    contentHe: buildConversationPrep(profile),
  });

  // Section 7: Resources
  sections.push({
    id: 'resources',
    titleHe: 'משאבים שימושיים',
    contentHe: 'לרשימת ארגונים ושירותים התומכים בנגישות תעסוקתית לאנשים עם פוסט-טראומה, ניתן לפנות אלינו.',
  });

  // Section 8: What was not shared
  sections.push({
    id: 'not_shared',
    titleHe: 'מה לא שותף ללא אישור',
    contentHe: `רמת השיתוף שבחרת: ${getDisclosureLevelHe(profile.disclosureLevel)}. שום מידע לא ישותף עם המעסיק ללא אישור מפורש שלך.`,
  });

  return {
    sections,
    recommendations: userRecs,
    generatedAt: new Date(),
  };
}

function buildSituationSummary(profile: CaseProfile): string {
  const parts: string[] = [];

  if (profile.jobTitle) {
    parts.push(`תפקיד: ${profile.jobTitle}`);
  }

  parts.push(`שלב תעסוקתי: ${getEmploymentStageHe(profile.employmentStage)}`);

  if (profile.hasActiveChangeEvent) {
    parts.push('זוהו שינויים לאחרונה שעשויים להשפיע על המצב');
  }

  return parts.join('\n');
}

function buildBarriersSummary(profile: CaseProfile): string {
  if (profile.barriers.length === 0) {
    return 'לא זוהו חסמים ספציפיים בשלב זה.';
  }

  return profile.barriers
    .map((b) => `• ${getBarrierNameHe(b.category)}`)
    .join('\n');
}

function buildAmplifiersSummary(profile: CaseProfile): string {
  const items: string[] = [];

  for (const t of profile.triggers) {
    items.push(`• טריגר: ${t.category}${t.contextDescription ? ` — ${t.contextDescription}` : ''}`);
  }

  for (const a of profile.amplifiers) {
    items.push(`• מגבר: ${a.category}${a.description ? ` — ${a.description}` : ''}`);
  }

  return items.join('\n');
}

function buildRecommendationsList(recs: PackagedRecommendation[]): string {
  if (recs.length === 0) return 'אין המלצות זמינות בשלב זה.';

  return recs
    .map((r, i) => `${i + 1}. ${r.contentHe}`)
    .join('\n\n');
}

function buildConversationPrep(profile: CaseProfile): string {
  if (profile.disclosureLevel === 'none') {
    return 'בחרת לא לשתף מידע עם המעסיק. זו בחירה לגיטימית לחלוטין. תוכל/י לשנות את ההחלטה בכל שלב.';
  }

  return 'אם תבחר/י לשתף, כדאי לתכנן את השיחה מראש: מה לומר, מתי, ולמי. אנחנו יכולים לעזור לך להתכונן.';
}

function getDisclosureLevelHe(level: string): string {
  const map: Record<string, string> = {
    none: 'ללא שיתוף',
    functional: 'שיתוף תפקודי בלבד',
    partial_contextual: 'שיתוף חלקי',
    full_voluntary: 'שיתוף מלא',
  };
  return map[level] ?? level;
}

function getEmploymentStageHe(stage: string): string {
  const map: Record<string, string> = {
    job_search: 'חיפוש עבודה',
    recruitment: 'תהליך גיוס',
    onboarding: 'קליטה',
    active_employment: 'תעסוקה פעילה',
    change_instability: 'שינוי / חוסר יציבות',
    return_to_work: 'חזרה לעבודה',
    retention_risk: 'סיכון לעזיבה',
  };
  return map[stage] ?? stage;
}

function getBarrierNameHe(category: string): string {
  const map: Record<string, string> = {
    uncertainty: 'חוסר ודאות',
    overload: 'עומס',
    communication: 'תקשורת',
    sensory_environment: 'סביבה חושית',
    schedule: 'לוח זמנים',
    concentration: 'ריכוז וזיכרון',
    trust: 'אמון וביטחון',
    autonomy: 'אוטונומיה ושליטה',
    social: 'אינטראקציות חברתיות',
    performance_pressure: 'לחץ ביצועים',
  };
  return map[category] ?? category;
}
