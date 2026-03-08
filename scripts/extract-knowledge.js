#!/usr/bin/env node
/**
 * Step 0.5 — Raw Files Analysis
 *
 * Reads each Hebrew source document from knowledge/raw/ and writes
 * structured JSON to knowledge/extracted/.
 *
 * Source documents and their roles (per FPP §3.1):
 *   1. שאלון חסמים בתעסוקה.docx          → classification authority (barriers questionnaire)
 *   2. שאלון החסמים ויזואלי.docx           → visual version of barriers questionnaire
 *   3. רקע לשאלון חסמים מתוך האוגדן.docx  → interpretation authority (background)
 *   4. אתגרי נגישות כפי שעלו מראיונות.xlsx → applied pattern authority (interview data)
 *   5. ספר נהלים ארגוני לדוגמה - נגישות רגשית.docx → implementation authority (procedures)
 *   6. הרצאה למעסיקים כנס נכי צהל גרסתסופית .pptx → communication authority (presentation)
 *   7. איך פוסט טראומטים מרגישים בעבודה_ - אנ״צ וננט״ל.pdf → communication authority (feelings)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { parseOffice } from 'officeparser';

const ROOT = resolve(import.meta.dirname, '..');
const RAW_DIR = join(ROOT, 'knowledge', 'raw');
const OUT_DIR = join(ROOT, 'knowledge', 'extracted');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ─── Helpers ────────────────────────────────────────────────────────────────

function writeJSON(filename, data) {
  const path = join(OUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✓ ${filename} (${JSON.stringify(data).length} bytes)`);
}

function stripEmpty(lines) {
  return lines.map(l => l.trim()).filter(Boolean);
}

// ─── 1. Barriers Questionnaire (שאלון חסמים בתעסוקה) ────────────────────────

async function extractBarriersQuestionnaire() {
  console.log('\n[1] שאלון חסמים בתעסוקה.docx');
  const filePath = join(RAW_DIR, 'שאלון חסמים בתעסוקה.docx');
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  const lines = stripEmpty(text.split('\n'));

  // The questionnaire contains barrier items with a Likert scale (1-5).
  // Extract each barrier item — they are the Hebrew text lines that describe difficulties.
  const barrierItems = [];
  const scaleLabels = [];
  const contextLines = [];

  // Known barrier keywords from the existing model (barriers.js)
  const knownBarrierHe = [
    'עייפות', 'בקרים', 'דחיינות', 'התארגנות', 'ניהול עצמי',
    'רעשים', 'צפיפות', 'תאורה', 'אי-נוחות',
    'יציאה מהבית', 'הימנעות',
    'רגזנות', 'פתיל קצר',
    'חרדה', 'התקפי',
    'ריכוז',
    'סמכות',
    'מוטיבציה',
    'ויסות רגשי',
    'ניהול זמן',
    'ערך עצמי', 'הערך העצמי',
  ];

  for (const line of lines) {
    // Check if line is a barrier item
    const isBarrier = knownBarrierHe.some(kw => line.includes(kw));
    // Check if line is a scale label (contains numbers 1-5 or descriptive scale text)
    const isScale = /^[1-5]/.test(line) || line.includes('בכלל לא') || line.includes('במידה');

    if (isBarrier) {
      barrierItems.push(line);
    } else if (isScale) {
      scaleLabels.push(line);
    } else {
      contextLines.push(line);
    }
  }

  const output = {
    source: 'שאלון חסמים בתעסוקה.docx',
    role: 'classification_authority',
    description: 'Employment barriers questionnaire — 13-item Likert scale defining the barrier taxonomy',
    raw_text: text,
    extracted: {
      barrier_items: barrierItems,
      scale_labels: scaleLabels,
      context: contextLines,
      total_lines: lines.length,
    },
    knowledge_units: barrierItems.map((item, i) => ({
      type: 'barrier_definition',
      index: i + 1,
      text_he: item,
      source_role: 'classification_authority',
    })),
  };

  writeJSON('01_barriers_questionnaire.json', output);
  return output;
}

// ─── 2. Visual Barriers Questionnaire (שאלון החסמים ויזואלי) ─────────────────

async function extractVisualQuestionnaire() {
  console.log('\n[2] שאלון החסמים ויזואלי.docx');
  const filePath = join(RAW_DIR, 'שאלון החסמים ויזואלי.docx');
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  const lines = stripEmpty(text.split('\n'));

  // Visual questionnaire may have additional formatting or user-friendly phrasing
  const output = {
    source: 'שאלון החסמים ויזואלי.docx',
    role: 'classification_authority',
    description: 'Visual version of barriers questionnaire — user-facing phrasing and layout cues',
    raw_text: text,
    extracted: {
      lines,
      total_lines: lines.length,
    },
    knowledge_units: lines
      .filter(l => l.length > 10) // skip very short formatting lines
      .map((line, i) => ({
        type: 'barrier_definition',
        subtype: 'visual_phrasing',
        index: i + 1,
        text_he: line,
        source_role: 'classification_authority',
      })),
  };

  writeJSON('02_visual_questionnaire.json', output);
  return output;
}

// ─── 3. Background to Barriers Questionnaire (רקע לשאלון חסמים) ──────────────

async function extractBarriersBackground() {
  console.log('\n[3] רקע לשאלון חסמים מתוך האוגדן.docx');
  const filePath = join(RAW_DIR, 'רקע לשאלון חסמים מתוך האוגדן.docx');
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  const lines = stripEmpty(text.split('\n'));

  // This document provides interpretation context: what barriers mean clinically,
  // how they correlate, trajectory data, and co-occurrence patterns.
  // Parse into sections based on structure cues.
  const sections = [];
  let currentSection = { title: '', content: [] };

  for (const line of lines) {
    // Heuristic: section headers are short and may end with colon or be in bold context
    const isLikelyHeader = line.length < 80 && (
      line.endsWith(':') ||
      line.startsWith('חלק') ||
      line.startsWith('פרק') ||
      line.startsWith('רקע') ||
      line.startsWith('ממצאים') ||
      line.startsWith('מסקנות') ||
      line.startsWith('מתאם') ||
      line.startsWith('תוצאות') ||
      line.startsWith('סיכום') ||
      /^\d+\./.test(line)
    );

    if (isLikelyHeader && currentSection.content.length > 0) {
      sections.push({ ...currentSection });
      currentSection = { title: line, content: [] };
    } else if (isLikelyHeader) {
      currentSection.title = line;
    } else {
      currentSection.content.push(line);
    }
  }
  if (currentSection.content.length > 0) sections.push(currentSection);

  // Extract mentions of correlations, trajectories, patterns
  const correlationMentions = lines.filter(l =>
    l.includes('מתאם') || l.includes('קורלציה') || l.includes('correlation') ||
    l.includes('חרדה') || l.includes('דיכאון') || l.includes('מסוגלות')
  );

  const trajectoryMentions = lines.filter(l =>
    l.includes('שינוי') || l.includes('ירידה') || l.includes('עליה') ||
    l.includes('מעקב') || l.includes('לאורך זמן') || l.includes('התחלת')
  );

  const patternMentions = lines.filter(l =>
    l.includes('דפוס') || l.includes('שילוב') || l.includes('ביחד') ||
    l.includes('מצטבר') || l.includes('פרופיל')
  );

  const output = {
    source: 'רקע לשאלון חסמים מתוך האוגדן.docx',
    role: 'interpretation_authority',
    description: 'Research background for the barriers questionnaire — clinical correlations, trajectories, and interpretation guidance',
    raw_text: text,
    extracted: {
      sections,
      correlation_mentions: correlationMentions,
      trajectory_mentions: trajectoryMentions,
      pattern_mentions: patternMentions,
      total_lines: lines.length,
    },
    knowledge_units: [
      ...correlationMentions.map((line, i) => ({
        type: 'context_modifier',
        subtype: 'clinical_correlation',
        index: i + 1,
        text_he: line,
        source_role: 'interpretation_authority',
      })),
      ...trajectoryMentions.map((line, i) => ({
        type: 'context_modifier',
        subtype: 'trajectory',
        index: i + 1,
        text_he: line,
        source_role: 'interpretation_authority',
      })),
      ...patternMentions.map((line, i) => ({
        type: 'context_modifier',
        subtype: 'co_occurrence_pattern',
        index: i + 1,
        text_he: line,
        source_role: 'interpretation_authority',
      })),
    ],
  };

  writeJSON('03_barriers_background.json', output);
  return output;
}

// ─── 4. Interview-derived Accessibility Challenges (אתגרי נגישות) ────────────

async function extractInterviewData() {
  console.log('\n[4] אתגרי נגישות כפי שעלו מראיונות.xlsx');
  const filePath = join(RAW_DIR, 'אתגרי נגישות כפי שעלו מראיונות.xlsx');
  const workbook = XLSX.readFile(filePath);

  const allSheets = {};
  const workplaceManifestations = [];
  const triggers = [];
  const quotes = [];
  const signals = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Store raw sheet data
    allSheets[sheetName] = {
      headers: data[0] || [],
      rows: data.slice(1),
      rowCount: data.length - 1,
    };

    // Extract knowledge units from each row
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.every(cell => cell === '')) continue;

      // Look for key data across columns
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = String(row[colIdx] || '').trim();
        if (!cell || cell.length < 5) continue;

        const header = String((data[0] || [])[colIdx] || '').trim();

        // Categorize based on header or content
        if (header.includes('ציטוט') || header.includes('quote') || cell.startsWith('"') || cell.startsWith('״')) {
          quotes.push({ text: cell, sheet: sheetName, row: rowIdx, column: header });
        } else if (header.includes('טריגר') || header.includes('trigger') || cell.includes('טריגר')) {
          triggers.push({ text: cell, sheet: sheetName, row: rowIdx, column: header });
        } else if (header.includes('סימן') || header.includes('signal') || header.includes('ביטוי')) {
          signals.push({ text: cell, sheet: sheetName, row: rowIdx, column: header });
        } else if (cell.length > 15) {
          workplaceManifestations.push({ text: cell, sheet: sheetName, row: rowIdx, column: header });
        }
      }
    }
  }

  const output = {
    source: 'אתגרי נגישות כפי שעלו מראיונות.xlsx',
    role: 'applied_pattern_authority',
    description: 'Interview-derived accessibility challenges — lived experience patterns, quotes, triggers, and workplace manifestations',
    extracted: {
      sheet_names: workbook.SheetNames,
      sheets: allSheets,
      workplace_manifestations: workplaceManifestations,
      triggers,
      quotes,
      signals,
      summary: {
        total_sheets: workbook.SheetNames.length,
        total_manifestations: workplaceManifestations.length,
        total_triggers: triggers.length,
        total_quotes: quotes.length,
        total_signals: signals.length,
      },
    },
    knowledge_units: [
      ...workplaceManifestations.map((m, i) => ({
        type: 'workplace_manifestation',
        index: i + 1,
        text_he: m.text,
        sheet: m.sheet,
        column: m.column,
        source_role: 'applied_pattern_authority',
      })),
      ...triggers.map((t, i) => ({
        type: 'trigger',
        index: i + 1,
        text_he: t.text,
        sheet: t.sheet,
        column: t.column,
        source_role: 'applied_pattern_authority',
      })),
      ...quotes.map((q, i) => ({
        type: 'signal',
        subtype: 'lived_experience_quote',
        index: i + 1,
        text_he: q.text,
        sheet: q.sheet,
        column: q.column,
        source_role: 'applied_pattern_authority',
      })),
      ...signals.map((s, i) => ({
        type: 'signal',
        subtype: 'indicator',
        index: i + 1,
        text_he: s.text,
        sheet: s.sheet,
        column: s.column,
        source_role: 'applied_pattern_authority',
      })),
    ],
  };

  writeJSON('04_interview_challenges.json', output);
  return output;
}

// ─── 5. Organizational Procedures Book (ספר נהלים ארגוני) ────────────────────

async function extractProceduresBook() {
  console.log('\n[5] ספר נהלים ארגוני לדוגמה - נגישות רגשית.docx');
  const filePath = join(RAW_DIR, 'ספר נהלים ארגוני לדוגמה - נגישות רגשית.docx');
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  const lines = stripEmpty(text.split('\n'));

  // This is the implementation authority — organizational procedures for emotional accessibility.
  // Parse into procedure modules based on section structure.
  const sections = [];
  let currentSection = { title: '', content: [], actions: [] };

  for (const line of lines) {
    // Detect section headers
    const isHeader = line.length < 100 && (
      /^\d+[\.\)]/.test(line) ||
      line.includes('נוהל') ||
      line.includes('פרק') ||
      line.includes('עיקרון') ||
      line.includes('מטרה') ||
      line.includes('הגדרות') ||
      line.includes('תחולה') ||
      line.includes('אחריות') ||
      line.startsWith('א.') || line.startsWith('ב.') || line.startsWith('ג.') ||
      line.endsWith(':')
    );

    // Detect action items
    const isAction = (
      line.includes('יש ל') ||
      line.includes('צריך ל') ||
      line.includes('חובה') ||
      line.includes('מומלץ') ||
      line.includes('ניתן ל') ||
      /^[-•●○]/.test(line)
    );

    if (isHeader && currentSection.content.length > 0) {
      sections.push({ ...currentSection });
      currentSection = { title: line, content: [], actions: [] };
    } else if (isHeader) {
      currentSection.title = line;
    } else {
      currentSection.content.push(line);
      if (isAction) currentSection.actions.push(line);
    }
  }
  if (currentSection.content.length > 0) sections.push(currentSection);

  // Extract principles and implementation actions
  const principles = lines.filter(l =>
    l.includes('עיקרון') || l.includes('ערך') || l.includes('גישה')
  );

  const implementationActions = lines.filter(l =>
    l.includes('יש ל') || l.includes('מומלץ') ||
    l.includes('חובה') || l.includes('ניתן ל') ||
    l.includes('צעד') || l.includes('פעולה')
  );

  const roleReferences = lines.filter(l =>
    l.includes('מנהל') || l.includes('משאבי אנוש') ||
    l.includes('עובד') || l.includes('צוות') ||
    l.includes('הנהלה') || l.includes('מש"א')
  );

  const output = {
    source: 'ספר נהלים ארגוני לדוגמה - נגישות רגשית.docx',
    role: 'implementation_authority',
    description: 'Organizational procedures book — employer-side implementation of emotional accessibility',
    raw_text: text,
    extracted: {
      sections,
      principles,
      implementation_actions: implementationActions,
      role_references: roleReferences,
      total_lines: lines.length,
      total_sections: sections.length,
    },
    knowledge_units: [
      ...principles.map((p, i) => ({
        type: 'implementation_action',
        subtype: 'principle',
        index: i + 1,
        text_he: p,
        source_role: 'implementation_authority',
      })),
      ...implementationActions.map((a, i) => ({
        type: 'implementation_action',
        subtype: 'action',
        index: i + 1,
        text_he: a,
        source_role: 'implementation_authority',
      })),
      ...roleReferences.map((r, i) => ({
        type: 'implementation_action',
        subtype: 'role_assignment',
        index: i + 1,
        text_he: r,
        source_role: 'implementation_authority',
      })),
    ],
  };

  writeJSON('05_procedures_book.json', output);
  return output;
}

// ─── 6. Employer Presentation (הרצאה למעסיקים) ──────────────────────────────

async function extractEmployerPresentation() {
  console.log('\n[6] הרצאה למעסיקים כנס נכי צהל גרסתסופית .pptx');
  const filePath = join(RAW_DIR, 'הרצאה למעסיקים כנס נכי צהל גרסתסופית .pptx');

  let text = '';
  try {
    const result = await parseOffice(filePath);
    text = typeof result === 'string' ? result : result.toString('utf-8');
  } catch (e) {
    console.log(`  ⚠ officeparser failed (${e.message}), skipping...`);
  }

  const lines = stripEmpty(text.split('\n'));

  // Extract communication framings, key messages, employer-facing language
  const keyMessages = [];
  const framingStatements = [];
  const objectionHandling = [];
  const dataPoints = [];

  for (const line of lines) {
    if (line.length < 5) continue;

    // Key messages tend to be shorter, impactful statements
    if (line.length < 120 && (
      line.includes('טראומה') || line.includes('מוח') ||
      line.includes('נגישות') || line.includes('מעסיק') ||
      line.includes('עובד') || line.includes('ניהול')
    )) {
      keyMessages.push(line);
    }

    // Objection handling patterns
    if (line.includes('אבל') || line.includes('למה') || line.includes('?') ||
        line.includes('עלות') || line.includes('אחריות')) {
      objectionHandling.push(line);
    }

    // Statistics or data
    if (/\d+%/.test(line) || /\d+\s*(מתוך|out of)/.test(line)) {
      dataPoints.push(line);
    }

    // General framing
    if (line.length > 20) {
      framingStatements.push(line);
    }
  }

  const output = {
    source: 'הרצאה למעסיקים כנס נכי צהל גרסתסופית .pptx',
    role: 'communication_authority',
    description: 'Employer-facing presentation — communication framing, key messages, objection handling, data points',
    raw_text: text || '',
    extracted: {
      lines,
      key_messages: keyMessages,
      framing_statements: framingStatements,
      objection_handling: objectionHandling,
      data_points: dataPoints,
      total_lines: lines.length,
    },
    knowledge_units: [
      ...keyMessages.map((m, i) => ({
        type: 'communication_framing',
        subtype: 'key_message',
        index: i + 1,
        text_he: m,
        source_role: 'communication_authority',
      })),
      ...objectionHandling.map((o, i) => ({
        type: 'communication_framing',
        subtype: 'objection_handling',
        index: i + 1,
        text_he: o,
        source_role: 'communication_authority',
      })),
      ...dataPoints.map((d, i) => ({
        type: 'communication_framing',
        subtype: 'data_point',
        index: i + 1,
        text_he: d,
        source_role: 'communication_authority',
      })),
    ],
  };

  writeJSON('06_employer_presentation.json', output);
  return output;
}

// ─── 7. How Post-Traumatics Feel at Work (PDF) ──────────────────────────────

async function extractFeelingsDocument() {
  console.log('\n[7] איך פוסט טראומטים מרגישים בעבודה_ - אנ״צ וננט״ל.pdf');
  const filePath = join(RAW_DIR, 'איך פוסט טראומטים מרגישים בעבודה_ - אנ״צ וננט״ל.pdf');
  const buf = readFileSync(filePath);

  let text;
  try {
    const parsed = await pdfParse(buf);
    text = parsed.text;
  } catch (e) {
    console.log(`  ⚠ pdf-parse failed (${e.message}), trying officeparser...`);
    try {
      const result = await parseOffice(filePath);
      text = typeof result === 'string' ? result : result.toString('utf-8');
    } catch (e2) {
      console.log(`  ⚠ officeparser also failed (${e2.message})`);
      text = '';
    }
  }

  const lines = stripEmpty((text || '').split('\n'));

  // This document captures how PTSD survivors experience the workplace.
  // Extract: feelings, workplace situations, triggers, lived experiences.
  const feelings = [];
  const situations = [];
  const livedExperiences = [];

  for (const line of lines) {
    if (line.length < 5) continue;

    // Feelings / emotional states
    if (line.includes('מרגיש') || line.includes('מרגישה') ||
        line.includes('תחושה') || line.includes('חווי') ||
        line.includes('פחד') || line.includes('חרדה') ||
        line.includes('כעס') || line.includes('בושה') ||
        line.includes('תסכול') || line.includes('עייפות')) {
      feelings.push(line);
    }

    // Workplace situations
    if (line.includes('עבודה') || line.includes('משרד') ||
        line.includes('ישיבה') || line.includes('מנהל') ||
        line.includes('צוות') || line.includes('פגישה')) {
      situations.push(line);
    }

    // Longer narrative / lived experience
    if (line.length > 30) {
      livedExperiences.push(line);
    }
  }

  const output = {
    source: 'איך פוסט טראומטים מרגישים בעבודה_ - אנ״צ וננט״ל.pdf',
    role: 'communication_authority',
    description: 'How post-traumatics feel at work — lived experience data for empathetic communication and signal detection',
    raw_text: text || '',
    extracted: {
      lines,
      feelings,
      situations,
      lived_experiences: livedExperiences,
      total_lines: lines.length,
      total_pages: text ? Math.ceil(text.length / 3000) : 0,
    },
    knowledge_units: [
      ...feelings.map((f, i) => ({
        type: 'signal',
        subtype: 'emotional_state',
        index: i + 1,
        text_he: f,
        source_role: 'communication_authority',
      })),
      ...situations.map((s, i) => ({
        type: 'workplace_manifestation',
        subtype: 'situation',
        index: i + 1,
        text_he: s,
        source_role: 'communication_authority',
      })),
    ],
  };

  writeJSON('07_feelings_at_work.json', output);
  return output;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  WorkAdviser — Step 0.5: Raw Files Knowledge Extraction');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\nSource: ${RAW_DIR}`);
  console.log(`Output: ${OUT_DIR}\n`);

  const results = {};
  const errors = [];

  const extractors = [
    ['barriers_questionnaire', extractBarriersQuestionnaire],
    ['visual_questionnaire', extractVisualQuestionnaire],
    ['barriers_background', extractBarriersBackground],
    ['interview_data', extractInterviewData],
    ['procedures_book', extractProceduresBook],
    ['employer_presentation', extractEmployerPresentation],
    ['feelings_document', extractFeelingsDocument],
  ];

  for (const [name, fn] of extractors) {
    try {
      results[name] = await fn();
    } catch (e) {
      console.error(`  ✗ ${name}: ${e.message}`);
      errors.push({ name, error: e.message });
    }
  }

  // ─── Extraction Summary ──────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Extraction Summary');
  console.log('═══════════════════════════════════════════════════════\n');

  let totalKnowledgeUnits = 0;
  const unitsByType = {};

  for (const [name, result] of Object.entries(results)) {
    if (!result) continue;
    const count = result.knowledge_units?.length || 0;
    totalKnowledgeUnits += count;
    console.log(`  ${name}: ${count} knowledge units (role: ${result.role})`);

    for (const unit of (result.knowledge_units || [])) {
      const key = unit.type + (unit.subtype ? '/' + unit.subtype : '');
      unitsByType[key] = (unitsByType[key] || 0) + 1;
    }
  }

  console.log(`\n  Total knowledge units: ${totalKnowledgeUnits}`);
  console.log('\n  By type:');
  for (const [type, count] of Object.entries(unitsByType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }

  if (errors.length > 0) {
    console.log(`\n  Errors: ${errors.length}`);
    for (const e of errors) {
      console.log(`    ✗ ${e.name}: ${e.error}`);
    }
  }

  // Write summary manifest
  const manifest = {
    extraction_date: new Date().toISOString(),
    source_directory: RAW_DIR,
    output_directory: OUT_DIR,
    files_processed: Object.keys(results).length,
    files_failed: errors.length,
    total_knowledge_units: totalKnowledgeUnits,
    units_by_type: unitsByType,
    errors,
    source_roles: {
      classification_authority: ['01_barriers_questionnaire.json', '02_visual_questionnaire.json'],
      interpretation_authority: ['03_barriers_background.json'],
      applied_pattern_authority: ['04_interview_challenges.json'],
      implementation_authority: ['05_procedures_book.json'],
      communication_authority: ['06_employer_presentation.json', '07_feelings_at_work.json'],
    },
  };

  writeJSON('_manifest.json', manifest);

  console.log('\n  ✓ Manifest written to _manifest.json');
  console.log('\n═══════════════════════════════════════════════════════\n');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
