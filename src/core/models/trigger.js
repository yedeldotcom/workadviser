/**
 * Trigger — FPP §9.1
 *
 * A workplace trigger — a specific stimulus that activates PTSD symptoms.
 * Triggers are distinct from barriers (barriers = functional difficulties;
 * triggers = causal activators). Currently derived heuristically; formal
 * taxonomy to be built in future enrichment pass.
 */

/**
 * @typedef {'sensory' | 'relational' | 'structural' | 'temporal' | 'contextual'} TriggerCategory
 *
 * @typedef {Object} Trigger
 * @property {string} id
 * @property {string} text_he
 * @property {string} text_en
 * @property {TriggerCategory} category
 * @property {string[]} barrierIds         - Barriers this trigger typically activates
 * @property {string[]} knowledgeSourceIds - KU IDs this trigger was derived from
 */

export function createTrigger(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    text_he: fields.text_he ?? '',
    text_en: fields.text_en ?? '',
    category: fields.category ?? 'contextual',
    barrierIds: fields.barrierIds ?? [],
    knowledgeSourceIds: fields.knowledgeSourceIds ?? [],
  };
}

// Seed triggers derived from interview data (KU-WRK-* units)
export const KNOWN_TRIGGERS = [
  createTrigger({ id: 'TR-001', text_he: 'ישיבות ספונטניות ולא מתוכננות',        text_en: 'Unplanned spontaneous meetings',             category: 'temporal',    barrierIds: ['anxiety_attacks', 'concentration'],  knowledgeSourceIds: ['KU-WRK-004'] }),
  createTrigger({ id: 'TR-002', text_he: 'שפה דחופה ומלחיצה ("חובת הגעה")',        text_en: 'Urgency language ("mandatory attendance")',  category: 'relational',  barrierIds: ['emotional_regulation', 'anxiety_attacks'], knowledgeSourceIds: ['KU-WRK-005'] }),
  createTrigger({ id: 'TR-003', text_he: 'שאלות על שירות צבאי או טראומה בראיון',  text_en: 'Questions about military service or trauma in job interviews', category: 'relational', barrierIds: ['anxiety_attacks', 'emotional_regulation'], knowledgeSourceIds: ['KU-WRK-003'] }),
  createTrigger({ id: 'TR-004', text_he: 'חוסר ודאות לגבי מקום ישיבה (hot desk)', text_en: 'Uncertainty about seating assignment (hot desk)', category: 'structural', barrierIds: ['anxiety_attacks', 'sensory_discomfort'], knowledgeSourceIds: ['KU-WRK-001'] }),
  createTrigger({ id: 'TR-005', text_he: 'מסדרונות חשוכים וחללים ללא חלונות',      text_en: 'Dark corridors and windowless spaces',        category: 'sensory',     barrierIds: ['sensory_discomfort', 'anxiety_attacks'], knowledgeSourceIds: ['KU-WRK-002'] }),
  createTrigger({ id: 'TR-006', text_he: 'פעילויות חברה עם תוכן לוחמני (מטווח, סיור)', text_en: 'Company events with combat-related content', category: 'contextual',  barrierIds: ['anxiety_attacks', 'emotional_regulation'], knowledgeSourceIds: ['KU-WRK-004'] }),
  createTrigger({ id: 'TR-007', text_he: 'פגישה אחד על אחד בחלל סגור',              text_en: 'One-on-one meeting in a closed room',         category: 'relational',  barrierIds: ['authority', 'anxiety_attacks'],         knowledgeSourceIds: ['KU-WRK-006'] }),
];
