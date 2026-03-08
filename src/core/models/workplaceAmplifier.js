/**
 * WorkplaceAmplifier — FPP §9.1
 *
 * A workplace condition that amplifies PTSD symptoms or barrier load.
 * Derived from friction types in workplace_scenarios.js and interview data.
 */

/**
 * @typedef {'sensory' | 'relational' | 'structural' | 'temporal'} AmplifierType
 *
 * @typedef {Object} WorkplaceAmplifier
 * @property {string} id
 * @property {string} text_he
 * @property {string} text_en
 * @property {AmplifierType} type
 * @property {string[]} workplaceTypes   - 'office' | 'remote' | 'hybrid' | 'field' | 'any'
 * @property {string[]} barrierIds       - Barriers this amplifies
 */

export function createWorkplaceAmplifier(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    text_he: fields.text_he ?? '',
    text_en: fields.text_en ?? '',
    type: fields.type ?? 'structural',
    workplaceTypes: fields.workplaceTypes ?? ['any'],
    barrierIds: fields.barrierIds ?? [],
  };
}

// Derived from friction types in workplace_scenarios.js + interview data
export const WORKPLACE_AMPLIFIERS = [
  createWorkplaceAmplifier({ id: 'AMP-001', text_he: 'עומס חושי (רעש, צפיפות, תאורה)',         text_en: 'Sensory overload (noise, crowding, lighting)',   type: 'sensory',    workplaceTypes: ['office', 'field'],    barrierIds: ['sensory_discomfort', 'concentration', 'anxiety_attacks'] }),
  createWorkplaceAmplifier({ id: 'AMP-002', text_he: 'סמכות בלתי צפויה או לא עקבית',           text_en: 'Unpredictable or inconsistent authority',         type: 'relational', workplaceTypes: ['any'],               barrierIds: ['authority', 'emotional_regulation', 'anxiety_attacks'] }),
  createWorkplaceAmplifier({ id: 'AMP-003', text_he: 'סטיגמה או "othering" סמוי',               text_en: 'Stigma or implicit othering',                    type: 'relational', workplaceTypes: ['any'],               barrierIds: ['self_worth', 'avoidance'] }),
  createWorkplaceAmplifier({ id: 'AMP-004', text_he: 'חוסר גמישות בנוכחות / שעות',              text_en: 'Rigid attendance / hours requirements',          type: 'temporal',   workplaceTypes: ['office'],            barrierIds: ['morning_functioning', 'fatigue', 'avoidance'] }),
  createWorkplaceAmplifier({ id: 'AMP-005', text_he: 'עומס משימות ואי-יכולת לתעדף',              text_en: 'Task overload and inability to prioritize',      type: 'structural', workplaceTypes: ['any'],               barrierIds: ['concentration', 'time_management', 'procrastination'] }),
  createWorkplaceAmplifier({ id: 'AMP-006', text_he: 'קונפליקט בין-אישי לא מנוהל',              text_en: 'Unmanaged interpersonal conflict',               type: 'relational', workplaceTypes: ['any'],               barrierIds: ['irritability', 'emotional_regulation', 'authority'] }),
  createWorkplaceAmplifier({ id: 'AMP-007', text_he: 'פרק אקוטי / אפיזודה בעבודה',              text_en: 'Acute episode at work',                          type: 'structural', workplaceTypes: ['any'],               barrierIds: ['anxiety_attacks', 'emotional_regulation', 'self_worth'] }),
  createWorkplaceAmplifier({ id: 'AMP-008', text_he: 'חוסר ודאות תעסוקתית (מכרזים, ארגון מחדש)', text_en: 'Employment uncertainty (tenders, reorganisation)', type: 'structural', workplaceTypes: ['any'],               barrierIds: ['anxiety_attacks', 'motivation', 'self_worth'] }),
  createWorkplaceAmplifier({ id: 'AMP-009', text_he: 'תקשורת לא ברורה של מנהל',                  text_en: 'Unclear manager communication',                  type: 'relational', workplaceTypes: ['any'],               barrierIds: ['concentration', 'authority', 'procrastination'] }),
  createWorkplaceAmplifier({ id: 'AMP-010', text_he: 'שינוי פתאומי בסביבת העבודה',               text_en: 'Sudden change in work environment',              type: 'structural', workplaceTypes: ['office', 'hybrid'],  barrierIds: ['sensory_discomfort', 'anxiety_attacks', 'avoidance'] }),
];
