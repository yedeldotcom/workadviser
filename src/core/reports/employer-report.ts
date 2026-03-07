import { CaseProfile } from '../engine/case-profiler';
import { PackagedRecommendation } from '../engine/packager';
import { DisclosureLevel } from '../types/enums';
import { filterBarrierDescriptions } from './disclosure-filter';

export interface EmployerReportSection {
  id: string;
  titleHe: string;
  contentHe: string;
}

export interface EmployerReport {
  sections: EmployerReportSection[];
  recommendations: PackagedRecommendation[];
  generatedAt: Date;
}

/**
 * Generates an employer-facing report INDEPENDENTLY from the user report.
 * This is NOT a copy of the user report — it's built from the case profile
 * with disclosure filtering applied.
 */
export function generateEmployerReport(
  profile: CaseProfile,
  employerRecs: PackagedRecommendation[]
): EmployerReport | null {
  if (profile.disclosureLevel === DisclosureLevel.NONE) {
    return null;
  }

  if (employerRecs.length === 0) {
    return null;
  }

  const sections: EmployerReportSection[] = [];

  // Section 1: Purpose
  sections.push({
    id: 'purpose',
    titleHe: 'מטרת המסמך',
    contentHe: 'המסמך נועד לעזור להבין אילו התאמות ניהוליות וסביבתיות יכולות לשפר את היכולת של עובד/ת לתפקד בצורה יציבה וברורה יותר בעבודה. הדגש כאן הוא תפקודי וניהולי: מה מקשה, מה יכול לעזור, ואילו צעדים פשוטים יחסית יכולים לשפר את המצב.',
  });

  // Section 2: Functional impact summary
  const barrierDescriptions = filterBarrierDescriptions(
    profile.barriers,
    profile.disclosureLevel
  );
  sections.push({
    id: 'functional_impact',
    titleHe: 'סיכום השפעה תפקודית',
    contentHe: barrierDescriptions
      .filter((b) => b.functional)
      .map((b) => `• ${b.functional}`)
      .join('\n'),
  });

  // Section 3: Key barriers in context
  sections.push({
    id: 'barriers_in_context',
    titleHe: 'חסמי נגישות עיקריים בהקשר העבודה',
    contentHe: buildContextualBarriers(profile),
  });

  // Section 4: Top adjustments
  sections.push({
    id: 'adjustments',
    titleHe: 'התאמות ניהוליות וסביבתיות מומלצות',
    contentHe: employerRecs
      .map((r, i) => `${i + 1}. ${r.contentHe}`)
      .join('\n\n'),
  });

  // Section 5: Communication guidance
  sections.push({
    id: 'communication',
    titleHe: 'מה עוזר בתקשורת',
    contentHe: buildCommunicationGuidance(profile),
  });

  // Section 6: What to avoid
  sections.push({
    id: 'avoid',
    titleHe: 'מה להימנע ממנו',
    contentHe: buildAvoidanceGuidance(profile),
  });

  // Section 7: Priority
  sections.push({
    id: 'priority',
    titleHe: 'סדר עדיפות ליישום',
    contentHe: buildPrioritySummary(employerRecs),
  });

  // Section 8: Training note (optional)
  sections.push({
    id: 'training_note',
    titleHe: 'הערה',
    contentHe: 'ניתן לפנות לקבלת הרצאה או ייעוץ ארגוני בנושא נגישות תעסוקתית לעובדים המתמודדים עם אתגרים הקשורים לטראומה.',
  });

  return {
    sections,
    recommendations: employerRecs,
    generatedAt: new Date(),
  };
}

function buildContextualBarriers(profile: CaseProfile): string {
  if (profile.barriers.length === 0) return 'לא זוהו חסמים ספציפיים.';

  const contextual: string[] = [];

  for (const barrier of profile.barriers) {
    const functional = getFunctionalContext(barrier.category);
    if (functional) contextual.push(`• ${functional}`);
  }

  return contextual.join('\n');
}

function getFunctionalContext(category: string): string {
  const contexts: Record<string, string> = {
    uncertainty: 'שינויים לא צפויים בתנאי העבודה עלולים להקשות על תפקוד יציב',
    overload: 'עומס של משימות מקבילות עלול לפגוע בריכוז ובביצועים',
    communication: 'אופן התקשורת — ביקורת, עימותים, אי-בהירות — עלול להשפיע על תפקוד',
    sensory_environment: 'רגישות לתנאי הסביבה הפיזית (רעש, תאורה, צפיפות) עלולה להקשות',
    schedule: 'חוסר גמישות בלוח הזמנים עלול להוות קושי משמעותי',
    concentration: 'ריכוז ממושך ועקיבה אחרי תהליכים מורכבים עלולים להיות מאתגרים',
    trust: 'תחושת חוסר ביטחון בסביבת העבודה עלולה להשפיע על מעורבות ותפקוד',
    autonomy: 'חוסר שליטה על תהליכי עבודה עלול ליצור קושי',
    social: 'אינטראקציות חברתיות אינטנסיביות עלולות להוות עומס',
    performance_pressure: 'לחץ ביצועים חזק עלול לפגוע בתפקוד',
  };
  return contexts[category] ?? '';
}

function buildCommunicationGuidance(profile: CaseProfile): string {
  const guidance = [
    '• לתקשר באופן ישיר, ברור וקצר',
    '• לתת התראה מוקדמת לפני שינויים',
    '• לאפשר שאלות הבהרה ללא שיפוטיות',
    '• לקיים שיחות 1:1 קבועות במועד ידוע מראש',
  ];
  return guidance.join('\n');
}

function buildAvoidanceGuidance(profile: CaseProfile): string {
  const avoidance = [
    '• להימנע מהפתעות ושינויים לא מתוקשרים',
    '• להימנע מביקורת פומבית או מול הצוות',
    '• להימנע מלחץ מיותר ודדליינים צפופים ללא צורך',
    '• להימנע מ"טיפים" טיפוליים — ההתאמות הן ניהוליות, לא קליניות',
  ];
  return avoidance.join('\n');
}

function buildPrioritySummary(recs: PackagedRecommendation[]): string {
  const immediate = recs.filter((r) => r.timeHorizon === 'immediate');
  const nearTerm = recs.filter((r) => r.timeHorizon === 'near_term');
  const longerTerm = recs.filter((r) => r.timeHorizon === 'longer_term');

  const parts: string[] = [];

  if (immediate.length > 0) {
    parts.push(`מיידי: ${immediate.map((r) => r.contentHe.substring(0, 50) + '...').join('; ')}`);
  }
  if (nearTerm.length > 0) {
    parts.push(`טווח קרוב: ${nearTerm.map((r) => r.contentHe.substring(0, 50) + '...').join('; ')}`);
  }
  if (longerTerm.length > 0) {
    parts.push(`טווח ארוך: ${longerTerm.map((r) => r.contentHe.substring(0, 50) + '...').join('; ')}`);
  }

  return parts.join('\n');
}
