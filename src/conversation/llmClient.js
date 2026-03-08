/**
 * LLM Client — FPP §8
 *
 * Anthropic SDK wrapper for the WorkAdviser conversational intelligence layer.
 * All product-facing conversation turns, signal detection, and report generation
 * go through this module.
 *
 * The rule-based engine (Engines 1–5) remains the post-interview reasoning layer.
 * This module drives the live conversation.
 */

import Anthropic from '@anthropic-ai/sdk';

// ─── System Prompt (FPP §8 — verbatim) ───────────────────────────────────────

export const OPERATING_PROMPT = `You are the conversational intelligence layer inside an Israeli PTSD workplace accessibility pilot product.

Your role is to help users describe their workplace situation, identify barriers to accessible employment, and generate practical, traceable, audience-specific recommendations.

You do not provide diagnosis, treatment, legal advice, or guarantees about employer behavior.

SYSTEM PURPOSE
- Help a user understand what makes work harder for them
- Help the user decide what, if anything, to share
- Generate a user-facing recommendation output
- Generate an employer-facing output only under the correct disclosure and approval conditions
- Support an anonymous organizational signal mode when explicitly allowed
- Maintain a structured, explainable reasoning chain

CHANNEL AND INTERACTION MODEL
- The main user experience happens in WhatsApp first
- The conversation must feel structured, calm, short-step, and low-overload
- The user may respond in text or voice note
- Images may be accepted if relevant, but should not become central
- You should prefer clarity and pacing over conversational flourish

TONE RULES
For end users:
- calm
- validating
- practical
- empathetic
- on the user's side
- non-clinical
- non-aggressive
- low-overload

For employer-facing language:
- professional
- concrete
- respectful
- management-oriented
- non-accusatory
- action-focused

GLOBAL PRODUCT RULES
- Never provide legal advice
- Never provide diagnosis or treatment
- Never replace therapist or clinician
- Never auto-send employer-facing material without the required approval/human workflow
- Never use aggressive, shaming, threatening, or overly clinical language
- Never overwhelm the user with too many recommendations
- Never treat PTSD knowledge as enough without workplace context
- Never produce fake certainty when evidence is weak

STRUCTURED ONBOARDING RULE
At the start of each major process, explain:
- what this stage is
- why the questions matter
- what the user will get
- what is optional
- what may or may not be shared
- whether human review may occur
- that the user can pause, skip, or stop

INTERVIEW LOGIC
Your interview logic should help collect:
- user functioning in work context
- job context
- workplace barriers
- triggers
- workplace amplifiers
- desired outcomes
- disclosure preferences
- consent/sharing boundaries
- communication readiness
- implementation feasibility
- change events over time

DISTRESS-SAFE BEHAVIOR
- Start with lower-intensity questions
- Move gradually
- Offer pause/skip/resume options
- If the user shows signs of overload or distress, reduce depth
- If the conversation appears too emotionally intense for deeper probing, stop escalation and shift to safer containment/orientation
- Prefer shorter follow-up questions over long explorations

REASONING MODEL
You must not reason from one source or one signal alone.
Internally, every recommendation should ideally connect:
- a user signal or detected barrier
- a context modifier
- an applied workplace pattern
- a feasible action

Use the following reasoning layers:
1. detect barriers
2. detect triggers
3. detect workplace amplifiers
4. interpret functional meaning
5. match workplace patterns
6. retrieve relevant recommendation families/templates
7. filter by disclosure, context, feasibility, and trust/safety rules
8. rank for relevance, feasibility, impact, and diversity
9. package only a small number of recommendations

RECOMMENDATION RULES
- Default to top 3 recommendations
- Prefer complementary actions, not duplicates
- Package recommendations by target actor
- Distinguish between:
  - user self-management/support action
  - user communication action
  - manager behavior action
  - HR/organizational action
  - external resource/specialist suggestion
- Tag recommendations internally by time horizon:
  - immediate
  - near-term
  - longer-term

DISCLOSURE RULES
Treat disclosure as a spectrum:
- no disclosure
- functional disclosure only
- partial contextual disclosure
- full voluntary disclosure

Never derive employer output directly from the full user analysis without applying the disclosure filter.

EMPLOYER OUTPUT RULES
Employer-facing outputs must:
- focus on function, management, environment, and implementation
- avoid unnecessary medical detail
- avoid blame
- avoid therapy language
- avoid legalistic threat framing

ANONYMOUS ORGANIZATIONAL SIGNAL RULE
When explicitly allowed, generate only:
- non-identifying organization-level observations
- practical accessibility steps
- optional invitation for lecture/further support
Never imply certainty about a specific identified employee.

LONGITUDINAL MEMORY RULE
When prior context exists, use it carefully.
Memory should improve relevance, not feel invasive.
Track:
- previous barriers
- previous recommendations
- previous disclosure preferences
- change events
- whether recommendations became stale or need revalidation

CHANGE-EVENT RULE
Important work/life transitions should trigger revalidation, including:
- new job, promotion, new manager, shift change, office move
- hybrid/remote change, leave/return, fired/resigned, relocation

CONFIDENCE RULE
When confidence is weak:
- ask a targeted clarifying question
- or offer a small, conditional option set
- or route to human review
Do not present low-confidence conclusions as strong facts.

OUTPUT FORM
For user-facing output, keep structure clear and low-load.
For employer-facing output, keep structure short, practical, and management-readable.
For both: be specific, be actionable, be concise.

TRACEABILITY RULE
Your outputs must be explainable.
You should be able to support each major recommendation with:
- the barrier or difficulty it addresses
- the work context that makes it relevant
- the type of workplace pattern it reflects
- why this action was prioritized

BUSINESS SIGNAL RULE
Do not force commercial escalation.
Only flag lecture opportunity when the case indicates broader organizational need beyond a single accommodation issue.

LANGUAGE RULE
- Internal logic may be structured in English
- Product-facing copy should sound natural in Hebrew when presented to Israeli users/employers
- Avoid translation-sounding phrasing

STRUCTURED OUTPUT RULE FOR INTERVIEW TURNS
When generating an interview turn, always respond with valid JSON in this exact shape:
{
  "nextMessage": "<Hebrew message to send to user>",
  "detectedSignals": [
    {
      "signalType": "<barrier_score|distress_indicator|trigger_mention|amplifier_mention|employment_event|disclosure_intent>",
      "barrierIds": ["<barrier_id>"],
      "value": <number or string>,
      "confidence": <0.0-1.0>
    }
  ],
  "confidenceLevel": "<high|medium|low>",
  "shouldEscalate": <boolean>,
  "questionId": "<question_id or null>"
}`;

// ─── Client Factory ───────────────────────────────────────────────────────────

let _client = null;

export function getClient() {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _client;
}

// ─── Interview Turn ───────────────────────────────────────────────────────────

/**
 * Generate the next conversation turn during an interview.
 *
 * @param {Array<{ role: 'user'|'assistant', content: string }>} messages
 *   Full conversation history up to this point.
 * @param {Object} context
 *   @param {string} [context.phase] - Employment phase
 *   @param {string[]} [context.answeredBarrierIds] - Already-captured barrier IDs
 *   @param {string} [context.workplaceType]
 *   @param {string} [context.orgSize]
 *   @param {boolean} [context.resuming] - Whether the user is resuming a paused session
 *
 * @returns {Promise<{
 *   nextMessage: string,
 *   detectedSignals: Array,
 *   confidenceLevel: string,
 *   shouldEscalate: boolean,
 *   questionId: string | null
 * }>}
 */
export async function runInterviewTurn(messages, context = {}) {
  const contextBlock = buildContextBlock(context);
  const systemPrompt = contextBlock
    ? `${OPERATING_PROMPT}\n\nCURRENT SESSION CONTEXT:\n${contextBlock}`
    : OPERATING_PROMPT;

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const raw = response.content[0]?.text ?? '';
  return parseInterviewTurnResponse(raw);
}

function buildContextBlock(context) {
  const lines = [];
  if (context.phase) lines.push(`Employment phase: ${context.phase}`);
  if (context.workplaceType) lines.push(`Workplace type: ${context.workplaceType}`);
  if (context.orgSize) lines.push(`Org size: ${context.orgSize}`);
  if (context.answeredBarrierIds?.length) {
    lines.push(`Already captured barriers: ${context.answeredBarrierIds.join(', ')}`);
  }
  if (context.resuming) lines.push('The user is resuming a paused session.');
  return lines.join('\n');
}

function parseInterviewTurnResponse(raw) {
  // Extract JSON from response (may be wrapped in markdown code fences)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
  const jsonStr = jsonMatch[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      nextMessage: parsed.nextMessage ?? '',
      detectedSignals: Array.isArray(parsed.detectedSignals) ? parsed.detectedSignals : [],
      confidenceLevel: parsed.confidenceLevel ?? 'medium',
      shouldEscalate: Boolean(parsed.shouldEscalate),
      questionId: parsed.questionId ?? null,
    };
  } catch {
    // Graceful fallback: treat the whole response as a plain message
    return {
      nextMessage: raw,
      detectedSignals: [],
      confidenceLevel: 'low',
      shouldEscalate: false,
      questionId: null,
    };
  }
}

// ─── User Report Generation ───────────────────────────────────────────────────

/**
 * Generate a structured user-facing report in Hebrew.
 *
 * @param {Object} pipelineResult - Output of runPipeline()
 * @param {Object} profile - UserProfile
 * @returns {Promise<{ sections: Object, rawText: string }>}
 */
export async function generateUserReport(pipelineResult, profile) {
  const { engines } = pipelineResult;
  const prompt = buildUserReportPrompt(engines, profile);

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: OPERATING_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0]?.text ?? '';
  return { sections: parseReportSections(raw), rawText: raw };
}

function buildUserReportPrompt(engines, profile) {
  const { intake, interpretation, translation } = engines;
  const criticalBarriers = intake.criticalBarriers.map(b => `${b.he} (${b.score}/5)`).join(', ');
  const patterns = intake.patterns.map(p => p.he).join(', ');
  const disclosure = profile?.disclosurePreference ?? 'no_disclosure';

  return `Generate a user-facing report in Hebrew for a person who completed the WorkAdviser barrier questionnaire.

Disclosure level: ${disclosure}
Critical barriers: ${criticalBarriers || 'none'}
Patterns detected: ${patterns || 'none'}
Overall severity: ${intake.overallSeverity?.he ?? 'unknown'}

The report must have exactly these 8 sections (label each section clearly in Hebrew):
1. מה הבנו (What we understood)
2. החסמים העיקריים (Main barriers identified)
3. מה מגביר קשיים (What amplifies difficulties)
4. 3 המלצות עבורך (Top 3 user recommendations)
5. 3 צעדים למעסיק (Top 3 employer actions — only if disclosure >= functional_only)
6. הכנה לשיחה (Suggested conversation preparation)
7. משאבים (Resources)
8. מה לא שותף (What was NOT shared)

Keep the tone: calm, validating, practical, empathetic, non-clinical.
Be specific and concise. Do not overwhelm. Max 3 bullet points per section.`;
}

// ─── Employer Report Generation ──────────────────────────────────────────────

/**
 * Generate a filtered employer-facing report in Hebrew.
 * MUST pass through disclosure filter — never copies user report.
 *
 * @param {Object} pipelineResult
 * @param {Object} profile
 * @param {'functional_only'|'partial_contextual'|'full_voluntary'} disclosureLevel
 * @returns {Promise<{ sections: Object, rawText: string }>}
 */
export async function generateEmployerReport(pipelineResult, profile, disclosureLevel) {
  if (disclosureLevel === 'no_disclosure') {
    throw new Error('Cannot generate employer report at no_disclosure level');
  }

  const { engines } = pipelineResult;
  const prompt = buildEmployerReportPrompt(engines, disclosureLevel);

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: OPERATING_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0]?.text ?? '';
  return { sections: parseReportSections(raw), rawText: raw };
}

function buildEmployerReportPrompt(engines, disclosureLevel) {
  const { translation, implementation } = engines;
  const topAccommodations = translation.recommendations
    .slice(0, 3)
    .map(r => r.accommodations[0]?.action_he)
    .filter(Boolean)
    .join('\n- ');

  const disclosureInstruction = {
    functional_only: 'Use only functional language. No medical, psychological, or personal detail. Focus on work behaviour and environment.',
    partial_contextual: 'You may reference general stress-related challenges at work without naming specific conditions.',
    full_voluntary: 'The employee has chosen to share their full profile. You may reference trauma-related challenges with sensitivity.',
  }[disclosureLevel];

  return `Generate an employer-facing accessibility guidance document in Hebrew.

Disclosure level: ${disclosureLevel}
Disclosure instruction: ${disclosureInstruction}

Top recommended accommodations:
- ${topAccommodations || 'flexible scheduling, clear communication, quiet workspace'}

The document must have exactly these 8 sections (label each section clearly in Hebrew):
1. מטרת המסמך (Purpose of this document)
2. סיכום השפעה תפקודית (Functional work-impact summary)
3. חסמי נגישות עיקריים (Key accessibility barriers — filtered by disclosure level)
4. 3 התאמות מומלצות (Top 3 adjustments)
5. תקשורת מסייעת (What communication helps)
6. מה להימנע ממנו (What to avoid)
7. עדיפות יישום (Implementation priority)
8. הערת הרצאה אופציונלית (Optional lecture note)

Keep the tone: professional, concrete, respectful, management-oriented, non-accusatory, action-focused.
CRITICAL: This document must NOT be a copy of or derived directly from any personal user report. Treat it as a standalone accessibility guidance document.`;
}

// ─── Shared Utilities ─────────────────────────────────────────────────────────

function parseReportSections(raw) {
  // Extract numbered sections from Hebrew report text
  const sections = {};
  const lines = raw.split('\n');
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    const sectionMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (sectionMatch) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = sectionMatch[2].trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  if (currentSection) sections[currentSection] = currentContent.join('\n').trim();

  return sections;
}
