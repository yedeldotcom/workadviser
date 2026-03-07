import { CaseProfile } from '../engine/case-profiler';
import { PackagedRecommendation } from '../engine/packager';

export interface OrgSignalSection {
  id: string;
  titleHe: string;
  contentHe: string;
}

export interface OrgSignalReport {
  sections: OrgSignalSection[];
  generatedAt: Date;
}

/**
 * Generate an anonymous organizational signal report.
 * Contains NO identifying information about the user.
 */
export function generateOrgSignal(
  profile: CaseProfile,
  orgRecs: PackagedRecommendation[]
): OrgSignalReport {
  const sections: OrgSignalSection[] = [];

  // Section 1: Why this report
  sections.push({
    id: 'purpose',
    titleHe: 'למה הארגון מקבל את המסמך הזה',
    contentHe: 'המסמך הזה נשלח כדי לשקף כי ייתכן שקיימים בארגון חסמים תעסוקתיים שמשפיעים על עובדים המתמודדים עם אתגרים הקשורים לטראומה.',
  });

  // Section 2: General indication
  sections.push({
    id: 'general_indication',
    titleHe: 'חסמים כלליים שזוהו',
    contentHe: buildGeneralIndication(profile),
  });

  // Section 3: Common patterns
  sections.push({
    id: 'common_patterns',
    titleHe: 'דפוסים נפוצים בארגונים',
    contentHe: buildCommonPatterns(),
  });

  // Section 4: Practical actions
  sections.push({
    id: 'actions',
    titleHe: 'צעדים שהארגון יכול לנקוט',
    contentHe: orgRecs.length > 0
      ? orgRecs.map((r, i) => `${i + 1}. ${r.contentHe}`).join('\n\n')
      : buildGenericActions(),
  });

  // Section 5: Invitation
  sections.push({
    id: 'invitation',
    titleHe: 'הזמנה',
    contentHe: 'ניתן לפנות אלינו להרצאה או ייעוץ ארגוני בנושא נגישות תעסוקתית ורגשית במקום העבודה.',
  });

  // Section 6: No-identifying statement
  sections.push({
    id: 'privacy_statement',
    titleHe: 'הצהרת פרטיות',
    contentHe: 'מסמך זה לא כולל מידע אישי מזהה כלשהו. אין לנסות לזהות עובד/ת ספציפי/ת על סמך תוכנו.',
  });

  return {
    sections,
    generatedAt: new Date(),
  };
}

function buildGeneralIndication(profile: CaseProfile): string {
  // Use only general categories, no personal details
  const barrierTypes = profile.barrierCategories;
  if (barrierTypes.length === 0) {
    return 'זוהו חסמים כלליים הקשורים לנגישות תעסוקתית בסביבת העבודה.';
  }

  const generalDescriptions: Record<string, string> = {
    uncertainty: 'אי-בהירות בתהליכים וציפיות',
    overload: 'עומס יתר',
    communication: 'אתגרים תקשורתיים',
    sensory_environment: 'תנאי סביבה פיזית',
    schedule: 'גמישות בלוח זמנים',
    concentration: 'ריכוז וזיכרון',
    trust: 'ביטחון בסביבת העבודה',
    autonomy: 'שליטה על תהליכי עבודה',
    social: 'אינטראקציות חברתיות',
    performance_pressure: 'לחץ ביצועים',
  };

  const descriptions = barrierTypes
    .map((bt) => generalDescriptions[bt])
    .filter(Boolean);

  return `זוהו חסמים בתחומים הבאים: ${descriptions.join(', ')}.`;
}

function buildCommonPatterns(): string {
  return [
    '• חוסר מנגנון לתקשורת מוקדמת על שינויים',
    '• היעדר הכנה מראש לשיחות משוב והערכה',
    '• סביבה פיזית שלא מותאמת לרגישויות חושיות',
    '• חוסר גמישות בזמנים ובמבנה יום העבודה',
    '• תרבות תקשורת שאינה מכילה מספיק',
  ].join('\n');
}

function buildGenericActions(): string {
  return [
    '1. לבדוק אם קיימים מנגנונים לתקשורת מוקדמת על שינויים בתנאי העבודה',
    '2. לשקול הכשרה למנהלים בנושא נגישות רגשית ותפקודית',
    '3. לוודא שקיימת אפשרות לגמישות בסביבת העבודה ובזמנים',
    '4. ליצור ערוצים בטוחים לפנייה ודיווח על קשיים',
  ].join('\n\n');
}
