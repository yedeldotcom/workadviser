/**
 * Knowledge Enrichment Pass
 *
 * Takes raw extracted JSON files and produces structured, traceable knowledge units
 * in knowledge/extracted/enriched/ with:
 *   - Stable IDs (KU-TYPE-SOURCE-INDEX)
 *   - English translations for key terms
 *   - source_ref with file + sheet/section + row
 *   - barrier_ids_inferred via keyword matching
 *   - Master traceability index
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXTRACTED = join(ROOT, 'knowledge', 'extracted');
const ENRICHED = join(ROOT, 'knowledge', 'extracted', 'enriched');

mkdirSync(ENRICHED, { recursive: true });

// ─── Barrier reference (from src/engines/intake/barriers.js) ──────────────────

const BARRIER_MAP = [
  { id: 'fatigue',             index: 1,  text_he: 'עייפות',                                                              text_en: 'Fatigue',                              cluster: 'physical_functional' },
  { id: 'morning_functioning', index: 2,  text_he: 'יכולת להיות פעיל.ה בבקרים',                                          text_en: 'Morning functioning',                  cluster: 'physical_functional' },
  { id: 'procrastination',     index: 3,  text_he: 'דחיינות או קושי בהתארגנות וניהול עצמי',                              text_en: 'Procrastination / self-organisation',  cluster: 'self_regulation' },
  { id: 'sensory_discomfort',  index: 4,  text_he: 'אי-נוחות בסביבת העבודה (יותר מידי רעשים, צפיפות, תאורה וכדומה)',    text_en: 'Workplace sensory discomfort',         cluster: 'environmental' },
  { id: 'avoidance',           index: 5,  text_he: 'מיעוט ביציאה מהבית (או הימנעות אחרת)',                               text_en: 'Avoidance / reduced leaving home',     cluster: 'avoidance_social' },
  { id: 'irritability',        index: 6,  text_he: 'רגזנות יתר (פתיל קצר)',                                               text_en: 'Irritability / short fuse',            cluster: 'relational' },
  { id: 'anxiety_attacks',     index: 7,  text_he: 'התקפי חרדה',                                                          text_en: 'Anxiety attacks',                      cluster: 'psychological' },
  { id: 'concentration',       index: 8,  text_he: 'קשיי ריכוז',                                                          text_en: 'Concentration difficulties',           cluster: 'cognitive' },
  { id: 'authority',           index: 9,  text_he: 'התמודדות עם גורם סמכות',                                              text_en: 'Coping with authority figures',        cluster: 'relational' },
  { id: 'motivation',          index: 10, text_he: 'היעדר מוטיבציה',                                                      text_en: 'Lack of motivation',                   cluster: 'self_regulation' },
  { id: 'emotional_regulation',index: 11, text_he: 'ויסות רגשי בעבודה',                                                   text_en: 'Emotional regulation at work',         cluster: 'psychological' },
  { id: 'time_management',     index: 12, text_he: 'ניהול זמן וניהול עצמי בעבודה',                                        text_en: 'Time management / self-management at work', cluster: 'self_regulation' },
  { id: 'self_worth',          index: 13, text_he: 'הערך העצמי שלי',                                                      text_en: 'Self-worth',                           cluster: 'psychological' },
];

// Keyword → barrier_id(s) — used for heuristic cross-referencing
const BARRIER_KEYWORDS = [
  { keywords: ['עייפות', 'עייף', 'עייפה', 'תשישות', 'תשישה'],                             ids: ['fatigue'] },
  { keywords: ['בוקר', 'בוקרים', 'שעות הבוקר', 'להתעורר', 'פעיל בבקרים'],               ids: ['morning_functioning'] },
  { keywords: ['דחיינות', 'ארגון עצמי', 'התארגנות', 'ניהול עצמי'],                        ids: ['procrastination', 'time_management'] },
  { keywords: ['רעש', 'רעשים', 'צפיפות', 'תאורה', 'סביבת עבודה', 'סנסורי', 'פלורוסנט', 'חלונות', 'מרחב'], ids: ['sensory_discomfort'] },
  { keywords: ['הימנעות', 'ביציאה מהבית', 'יציאה מהבית', 'צאת מהבית'],                    ids: ['avoidance'] },
  { keywords: ['רגזנות', 'פתיל קצר', 'זעם', 'כעס', 'התפרצות'],                            ids: ['irritability'] },
  { keywords: ['חרדה', 'פאניקה', 'התקף חרדה', 'התקפי חרדה'],                              ids: ['anxiety_attacks'] },
  { keywords: ['ריכוז', 'קשיי ריכוז', 'ריכוז בעבודה', 'הסחה', 'הסחת דעת'],               ids: ['concentration'] },
  { keywords: ['סמכות', 'מנהל', 'מנהלת', 'ממונה', 'בוס', 'היררכיה'],                      ids: ['authority'] },
  { keywords: ['מוטיבציה', 'העדר מוטיבציה', 'חוסר מוטיבציה', 'אבדן עניין'],              ids: ['motivation'] },
  { keywords: ['ויסות רגשי', 'רגשות', 'ויסות', 'הצפה רגשית', 'הצפה'],                    ids: ['emotional_regulation'] },
  { keywords: ['ניהול זמן', 'ארגון זמן', 'עמידה בלוחות זמנים', 'מועדים'],                 ids: ['time_management'] },
  { keywords: ['ערך עצמי', 'הערך העצמי', 'ביטחון עצמי', 'דימוי עצמי'],                   ids: ['self_worth'] },
  { keywords: ['טריגר', 'טריגרים', 'גורם מעורר', 'מעורר'],                                 ids: ['anxiety_attacks', 'emotional_regulation'] },
  { keywords: ['חוסר ודאות', 'אי ודאות'],                                                   ids: ['anxiety_attacks', 'procrastination'] },
  { keywords: ['קשיי תפקוד', 'תפקוד'],                                                       ids: ['fatigue', 'concentration'] },
];

function guessBarrierIds(text) {
  if (!text || typeof text !== 'string') return [];
  const found = new Set();
  for (const entry of BARRIER_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) {
        entry.ids.forEach(id => found.add(id));
        break;
      }
    }
  }
  return [...found];
}

function pad(n, width = 3) {
  return String(n).padStart(width, '0');
}

// ─── 1. Barriers Questionnaire ────────────────────────────────────────────────

function enrichBarriersQuestionnaire() {
  const raw = JSON.parse(readFileSync(join(EXTRACTED, '01_barriers_questionnaire.json'), 'utf8'));

  const units = BARRIER_MAP.map(b => ({
    id: `KU-BARRIER-${pad(b.index)}`,
    type: 'barrier_definition',
    barrier_id: b.id,
    index: b.index,
    text_he: b.text_he,
    text_en: b.text_en,
    cluster: b.cluster,
    scale: {
      min: 1,
      max: 5,
      labels_he: ['בכלל לא מפריע', 'מפריע מעט', 'מפריע במידה מסוימת', 'מפריע במידה רבה', 'מפריע במידה רבה מאוד'],
      labels_en: ['Does not interfere at all', 'Interferes a little', 'Interferes to some extent', 'Interferes greatly', 'Interferes very greatly'],
    },
    source_ref: {
      file: raw.source,
      role: raw.role,
      item_index: b.index,
    },
    barrier_ids_inferred: [b.id],
    lifecycle_state: 'active',
    promotion_state: 'validated',
  }));

  const output = {
    enriched_at: new Date().toISOString(),
    source_file: raw.source,
    source_role: raw.role,
    unit_count: units.length,
    id_prefix: 'KU-BARRIER',
    description: '13-item barrier taxonomy — classification authority. Stable IDs correspond 1:1 with BARRIER_IDS in src/engines/intake/barriers.js',
    units,
  };

  writeFileSync(join(ENRICHED, '01_barriers_questionnaire.json'), JSON.stringify(output, null, 2));
  console.log(`  ✓ Barriers questionnaire: ${units.length} units`);
  return units.length;
}

// ─── 2. Barriers Background (Interpretation Authority) ───────────────────────

function enrichBarriersBackground() {
  const raw = JSON.parse(readFileSync(join(EXTRACTED, '03_barriers_background.json'), 'utf8'));

  // Structured clinical correlations extracted from the raw document
  const clinical_correlations = [
    {
      id: 'KU-INTERP-001',
      type: 'context_modifier',
      subtype: 'clinical_correlation',
      text_he: 'קשר חיובי בין הערכת חסמים לחרדה, דיכאון, תסמינים פוסט-טראומתיים, וקשיי תפקוד',
      text_en: 'Positive correlation between barrier score and anxiety, depression, PTSD symptoms, and functional difficulties',
      finding_period: '2021–2023',
      data_source: 'Natal Employment Unit',
      time_points: ['entry', 'completion', 'follow_up'],
      barrier_ids_inferred: ['anxiety_attacks', 'emotional_regulation', 'fatigue', 'concentration'],
      source_ref: { file: raw.source, role: raw.role, section: 'פירוש הממצאים' },
    },
    {
      id: 'KU-INTERP-002',
      type: 'context_modifier',
      subtype: 'clinical_correlation',
      text_he: 'ציון חסמים גבוה קשור לדימוי החלמה נמוך ולמסוגלות מקצועית נמוכה בכניסה לאימון',
      text_en: 'High barrier score at program entry correlates with lower recovery self-assessment and lower occupational self-efficacy',
      finding_period: '2021–2023',
      data_source: 'Natal Employment Unit',
      time_points: ['entry'],
      barrier_ids_inferred: ['motivation', 'self_worth'],
      source_ref: { file: raw.source, role: raw.role, section: 'פירוש הממצאים' },
    },
  ];

  const trajectory_findings = [
    {
      id: 'KU-INTERP-003',
      type: 'context_modifier',
      subtype: 'trajectory',
      text_he: 'הקשר בין הימנעות לחסמים מחליש ממשמעותי בסיום האימון — מרמה מובהקת לבלתי מובהקת',
      text_en: 'The correlation between avoidance barrier and overall score weakens significantly by program completion — from significant to non-significant',
      phase: 'program_completion',
      direction: 'decreasing',
      barrier_ids_inferred: ['avoidance'],
      source_ref: { file: raw.source, role: raw.role, section: 'פירוש הממצאים' },
    },
    {
      id: 'KU-INTERP-004',
      type: 'context_modifier',
      subtype: 'trajectory',
      text_he: 'בשלבים הראשונים של השתלבות בעבודה — עלייה בחשיפה לטריגרים, ועלייה בחסמי ויסות רגשי ועייפות',
      text_en: 'Early employment integration phase: increased trigger exposure → higher emotional regulation and fatigue barriers. General functioning improves despite this.',
      phase: 'early_employment',
      direction: 'increasing_then_stabilising',
      barrier_ids_inferred: ['emotional_regulation', 'fatigue', 'anxiety_attacks'],
      source_ref: { file: raw.source, role: raw.role, section: 'פירוש הממצאים' },
    },
    {
      id: 'KU-INTERP-005',
      type: 'context_modifier',
      subtype: 'trajectory',
      text_he: 'למרות עלייה בחסמים הסובייקטיביים בתחילת העבודה — התפקוד הכללי עולה והמטופלים מדווחים על יכולת גוברת לניהול הסימפטומים',
      text_en: 'Despite subjective barrier increase at employment entry, overall functioning improves and patients report growing symptom management capacity',
      phase: 'early_employment',
      direction: 'positive_functional_trajectory',
      barrier_ids_inferred: ['emotional_regulation', 'fatigue', 'self_worth'],
      source_ref: { file: raw.source, role: raw.role, section: 'פירוש הממצאים' },
    },
  ];

  const questionnaire_metadata = {
    id: 'KU-INTERP-006',
    type: 'context_modifier',
    subtype: 'instrument_description',
    text_he: 'שאלון אד-הוק שנבנה על ידי צוות התעסוקה והמחקר של נט"ל, 13 פריטים, סולם ליקרט 1–5, טווח ציונים 13–65, ציון גבוה = חסמים גבוהים יותר',
    text_en: 'Ad-hoc questionnaire built by Natal employment and research team. 13 items, Likert 1–5, score range 13–65. Higher score = higher barrier load.',
    scoring_range: { min: 13, max: 65 },
    item_count: 13,
    source_ref: { file: raw.source, role: raw.role, section: 'תיאור השאלון' },
    barrier_ids_inferred: [],
  };

  const all_units = [questionnaire_metadata, ...clinical_correlations, ...trajectory_findings];

  const output = {
    enriched_at: new Date().toISOString(),
    source_file: raw.source,
    source_role: raw.role,
    unit_count: all_units.length,
    id_prefix: 'KU-INTERP',
    description: 'Clinical interpretation context: questionnaire metadata, barrier-outcome correlations, and employment trajectory findings (Natal 2021–2023)',
    clinical_correlations,
    trajectory_findings,
    questionnaire_metadata,
    units: all_units,
  };

  writeFileSync(join(ENRICHED, '02_barriers_background.json'), JSON.stringify(output, null, 2));
  console.log(`  ✓ Barriers background: ${all_units.length} units`);
  return all_units.length;
}

// ─── 3. Interview — Workplace Sheet ──────────────────────────────────────────

function enrichInterviewWorkplace() {
  const raw = JSON.parse(readFileSync(join(EXTRACTED, '04_interview_challenges.json'), 'utf8'));
  const sheet = raw.extracted.sheets['משרדים ועבודה'];

  // Solution type → English
  const SOLUTION_TYPE_EN = {
    'נהלים והדרכה': 'Policies and training',
    'חקיקה ומדיניות': 'Legislation and policy',
    'תשתית ועיצוב': 'Infrastructure and design',
    'טכנולוגיה': 'Technology',
    'שירות ותמיכה': 'Service and support',
    'תקשורת ושפה': 'Communication and language',
    'כלים ומשאבים': 'Tools and resources',
  };

  const units = [];
  let kuIndex = 0;

  for (let i = 0; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    const rowId = row[0];
    const challengeType = row[1];
    const challengeDesc = row[2];
    const solutionType = row[3];
    const solutionDesc = row[4];
    const quote = row[5];
    const technicalDesc = row[6];

    // Skip fully empty rows; keep rows with at least a row ID or a description
    if (!rowId && !challengeType && !challengeDesc) continue;
    if (!rowId) continue; // rows without an ID are spreadsheet padding

    kuIndex++;
    const combinedText = [challengeType, challengeDesc, solutionDesc, quote, technicalDesc]
      .filter(Boolean).join(' ');

    units.push({
      id: `KU-WRK-${pad(kuIndex)}`,
      type: 'workplace_manifestation',
      source_ref: {
        file: raw.source,
        role: raw.role,
        sheet: 'משרדים ועבודה',
        row_id: String(rowId),
        row_index: i,
      },
      challenge_type_he: challengeType || null,
      challenge_description_he: challengeDesc || null,
      solution_type_he: solutionType || null,
      solution_type_en: SOLUTION_TYPE_EN[solutionType] || solutionType || null,
      solution_description_he: solutionDesc || null,
      quote_he: quote || null,
      technical_description_he: technicalDesc || null,
      barrier_ids_inferred: guessBarrierIds(combinedText),
      pilot_scope: true,
      lifecycle_state: 'active',
      promotion_state: 'validated',
    });
  }

  const output = {
    enriched_at: new Date().toISOString(),
    source_file: raw.source,
    source_role: raw.role,
    sheet: 'משרדים ועבודה',
    unit_count: units.length,
    id_prefix: 'KU-WRK',
    description: 'Workplace-domain accessibility challenges from lived-experience interviews. Each unit is one challenge-solution pair with optional interviewee quote. pilot_scope=true.',
    units,
  };

  writeFileSync(join(ENRICHED, '03_interview_workplace.json'), JSON.stringify(output, null, 2));
  console.log(`  ✓ Interview workplace: ${units.length} units (from ${sheet.rows.length} rows)`);
  return units.length;
}

// ─── 4. Interview — General Recommendations Sheet ────────────────────────────

function enrichInterviewGeneralRecs() {
  const raw = JSON.parse(readFileSync(join(EXTRACTED, '04_interview_challenges.json'), 'utf8'));
  const sheet = raw.extracted.sheets['המלצות כלליות'];

  const units = [];
  let kuIndex = 0;

  for (let i = 0; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    const seqId = row[0];
    const challengeType = row[1];
    const generalSolution = row[2];
    const technicalDesc = row[3];

    if (!seqId || !challengeType) continue;

    kuIndex++;
    const combinedText = [challengeType, generalSolution, technicalDesc].filter(Boolean).join(' ');

    units.push({
      id: `KU-GENREC-${pad(kuIndex)}`,
      type: 'implementation_action',
      subtype: 'general_recommendation',
      source_ref: {
        file: raw.source,
        role: raw.role,
        sheet: 'המלצות כלליות',
        seq_id: seqId,
        row_index: i,
      },
      challenge_type_he: challengeType || null,
      general_solution_he: generalSolution || null,
      technical_description_he: technicalDesc || null,
      barrier_ids_inferred: guessBarrierIds(combinedText),
      cross_domain: true,
      lifecycle_state: 'active',
      promotion_state: 'candidate',
    });
  }

  const output = {
    enriched_at: new Date().toISOString(),
    source_file: raw.source,
    source_role: raw.role,
    sheet: 'המלצות כלליות',
    unit_count: units.length,
    id_prefix: 'KU-GENREC',
    description: 'Cross-domain general recommendations from the interview study. These apply across multiple accessibility domains, not just workplace.',
    units,
  };

  writeFileSync(join(ENRICHED, '04_interview_general_recs.json'), JSON.stringify(output, null, 2));
  console.log(`  ✓ Interview general recs: ${units.length} units`);
  return units.length;
}

// ─── 5. Procedures Book ──────────────────────────────────────────────────────

function enrichProceduresBook() {
  const raw = JSON.parse(readFileSync(join(EXTRACTED, '05_procedures_book.json'), 'utf8'));

  // Module name hints for grouping — these map to the 15 modules in procedures.js
  const MODULE_KEYWORDS = [
    { module: 'recruitment', keywords: ['גיוס', 'גיוס עובדים', 'ראיון עבודה', 'מכרז'] },
    { module: 'onboarding', keywords: ['קליטה', 'קליטת עובד', 'יום ראשון', 'תחילת עבודה'] },
    { module: 'physical_environment', keywords: ['סביבת עבודה', 'מרחב', 'פיזי', 'עיצוב'] },
    { module: 'schedule_flexibility', keywords: ['שעות עבודה', 'גמישות', 'לוח זמנים', 'היעדרות'] },
    { module: 'communication_protocols', keywords: ['תקשורת', 'פגישות', 'ישיבות', 'קשר'] },
    { module: 'manager_training', keywords: ['מנהל', 'הדרכה למנהלים', 'אימון מנהלים'] },
    { module: 'hr_protocols', keywords: ['HR', 'משאבי אנוש', 'נהלי HR'] },
    { module: 'crisis_response', keywords: ['משבר', 'מצוקה', 'חירום', 'אירוע'] },
    { module: 'disclosure_handling', keywords: ['חשיפה', 'גילוי', 'שיתוף'] },
  ];

  function guessModule(text) {
    for (const m of MODULE_KEYWORDS) {
      for (const kw of m.keywords) {
        if (text && text.includes(kw)) return m.module;
      }
    }
    return null;
  }

  const units = raw.knowledge_units.map((ku, i) => {
    const text = ku.text_he || '';
    return {
      id: `KU-PROC-${pad(i + 1)}`,
      type: ku.type,
      subtype: ku.subtype,
      original_index: ku.index,
      text_he: text,
      source_ref: {
        file: raw.source,
        role: raw.role,
        unit_index: i + 1,
        original_index: ku.index,
      },
      module_hint: guessModule(text),
      barrier_ids_inferred: guessBarrierIds(text),
      lifecycle_state: 'active',
      promotion_state: 'validated',
    };
  });

  const output = {
    enriched_at: new Date().toISOString(),
    source_file: raw.source,
    source_role: raw.role,
    unit_count: units.length,
    id_prefix: 'KU-PROC',
    description: 'Organizational procedure book: employer implementation actions, principles, and role assignments. Module hints are heuristic — verify against procedures.js.',
    units,
  };

  writeFileSync(join(ENRICHED, '05_procedures_book.json'), JSON.stringify(output, null, 2));
  console.log(`  ✓ Procedures book: ${units.length} units`);
  return units.length;
}

// ─── 6. Feelings at Work (PDF) ───────────────────────────────────────────────

function enrichFeelingsAtWork() {
  const raw = JSON.parse(readFileSync(join(EXTRACTED, '07_feelings_at_work.json'), 'utf8'));

  const units = raw.knowledge_units.map((ku, i) => {
    const text = ku.text_he || ku.text || '';
    return {
      id: `KU-PDF-${pad(i + 1)}`,
      type: ku.type || 'signal',
      subtype: ku.subtype || 'lived_experience',
      original_index: ku.index,
      text_he: text,
      source_ref: {
        file: raw.source,
        role: raw.role,
        unit_index: i + 1,
      },
      barrier_ids_inferred: guessBarrierIds(text),
      extraction_quality: 'poor',
      note: 'Source PDF is image-heavy; only ~50 lines were extractable. Low confidence.',
      lifecycle_state: 'active',
      promotion_state: 'candidate',
    };
  });

  const output = {
    enriched_at: new Date().toISOString(),
    source_file: raw.source,
    source_role: raw.role,
    unit_count: units.length,
    id_prefix: 'KU-PDF',
    extraction_quality: 'poor',
    description: 'Feelings-at-work PDF (Natal/Anatz). Image-heavy source — only partial extraction possible. Use for qualitative illustration only.',
    units,
  };

  writeFileSync(join(ENRICHED, '06_feelings_at_work.json'), JSON.stringify(output, null, 2));
  console.log(`  ✓ Feelings at work: ${units.length} units (poor quality — PDF image-heavy)`);
  return units.length;
}

// ─── 7. Master Traceability Index ────────────────────────────────────────────

function buildEnrichmentIndex(counts) {
  const index = {
    generated_at: new Date().toISOString(),
    version: '1.0',
    description: 'Master traceability index for all enriched knowledge units',
    id_prefix_map: {
      'KU-BARRIER':  { file: '01_barriers_questionnaire.json', source: 'barriers_questionnaire.docx', role: 'classification_authority', count: counts.barriers },
      'KU-INTERP':   { file: '02_barriers_background.json',    source: 'barriers_background.docx',    role: 'interpretation_authority', count: counts.background },
      'KU-WRK':      { file: '03_interview_workplace.json',    source: 'interview_challenges.xlsx',   role: 'applied_pattern_authority', count: counts.workplace },
      'KU-GENREC':   { file: '04_interview_general_recs.json', source: 'interview_challenges.xlsx',   role: 'applied_pattern_authority', count: counts.genrec },
      'KU-PROC':     { file: '05_procedures_book.json',        source: 'org_procedures.docx',         role: 'implementation_authority',  count: counts.procedures },
      'KU-PDF':      { file: '06_feelings_at_work.json',       source: 'ptsd_at_work.pdf',            role: 'communication_authority',   count: counts.pdf },
    },
    barrier_id_reference: BARRIER_MAP.map(b => ({
      barrier_id: b.id,
      index: b.index,
      text_he: b.text_he,
      text_en: b.text_en,
      cluster: b.cluster,
      ku_id: `KU-BARRIER-${pad(b.index)}`,
    })),
    total_enriched_units: Object.values(counts).reduce((a, b) => a + b, 0),
    enriched_files: [
      'enriched/01_barriers_questionnaire.json',
      'enriched/02_barriers_background.json',
      'enriched/03_interview_workplace.json',
      'enriched/04_interview_general_recs.json',
      'enriched/05_procedures_book.json',
      'enriched/06_feelings_at_work.json',
    ],
    out_of_scope_files: [
      { file: '02_visual_questionnaire.json', reason: 'Image-only file — no extractable text' },
      { file: '06_employer_presentation.json', reason: 'PPTX image-heavy — framing.js is canonical' },
    ],
    how_to_look_up: [
      'To find a unit: read the file listed in id_prefix_map for its prefix',
      'To find all units for a barrier: grep barrier_ids_inferred in any enriched file',
      'To trace back to source: use source_ref.file + source_ref.sheet/section + source_ref.row_index',
      'To find barrier metadata: see barrier_id_reference or src/engines/intake/barriers.js',
    ],
  };

  writeFileSync(join(ENRICHED, '_index.json'), JSON.stringify(index, null, 2));
  console.log(`  ✓ Master index: ${index.total_enriched_units} total enriched units`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('═══ Knowledge Enrichment Pass ═══\n');

const counts = {
  barriers:   enrichBarriersQuestionnaire(),
  background: enrichBarriersBackground(),
  workplace:  enrichInterviewWorkplace(),
  genrec:     enrichInterviewGeneralRecs(),
  procedures: enrichProceduresBook(),
  pdf:        enrichFeelingsAtWork(),
};

buildEnrichmentIndex(counts);

console.log('\n═══ Done ═══');
console.log(`Output directory: knowledge/extracted/enriched/`);
console.log(`Total enriched units: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
