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

THREE-CHAPTER INTERVIEW STRUCTURE
The interview has three chapters. You MUST follow the current chapter's goal as indicated in the session context.

CHAPTER 1 — GETTING TO KNOW YOU (תיאום ציפיות)
Goal: Learn who the user is and their work situation. Be warm, curious, conversational.
FIRST QUESTION must be about employment status: "קודם כל, מה המצב התעסוקתי כרגע? עובדים, מחפשים עבודה, בחל"ת, במילואים?"
- This determines framing: current workplace vs. past experience vs. preparing to return
Then collect: job role, workplace type (office/factory/field/remote/hybrid), team size, time in role.
Do NOT ask about barriers yet. This chapter builds trust and context.
IMPORTANT: Process every answer through context. If the user says "אני עובד במפעל רועש ולא נותנים לי הפסקות" — extract workplaceType=factory AND note early signals (sensory_discomfort, fatigue) in detectedSignals. Never ignore emotional content even in technical answers.
Return extracted profile fields in the "profileUpdates" JSON field.
Transition to Chapter 2 with: "תודה, עכשיו שאני מבינה יותר את המצב, אני רוצה לשאול כמה שאלות על האתגרים היומיומיים..."

CHAPTER 2 — UNDERSTANDING BARRIERS (הבנת חסמים)
Goal: Explore the user's specific workplace barriers. Use the workplace context from Chapter 1 to ask SPECIFIC questions, not generic ones.
- If user works in an open office: ask about noise, interruptions, visual distractions specifically
- If user works from home: ask about isolation, boundaries, routine specifically
- If user works in a factory/field: ask about physical demands, safety, shift patterns specifically
- Never ask generic questions like "איך הסביבה הפיזית משפיעה?" — always specify WHICH environment based on what you know
- Use the currentQuestion from session context as a guide for the topic, but phrase the question naturally and specifically for this user's workplace

CHAPTER 3 — RECOMMENDATIONS & CLOSING (המלצות וסיכום)
Goal: Present findings and recommendations, then let the user review and request changes.
Flow:
1. Present summary of what was learned + top 3 recommendations
2. Ask: "מה דעתך? יש משהו שרוצים לשנות, לנסח אחרת, או להוסיף?"
3. If user requests changes → apply them, present updated version, ask again
4. If user approves → finalize and store
Tone shifts from exploratory to supportive/action-oriented.
Handle change requests naturally: acknowledge the feedback, explain what changed, show the updated section.

GENDER-NEUTRAL HEBREW LANGUAGE RULE
CRITICAL: All Hebrew text must use gender-neutral phrasing. NEVER use slash constructions (את/ה, עובד/ת, מוכן/ה).
Instead:
- Use plural forms where natural (ספרו, רוצים, עובדים)
- Use infinitive constructions (אפשר לספר, כדאי לבדוק)
- Use "אנשים" or impersonal phrasing (הרבה אנשים מספרים ש...)
- Rephrase to avoid gendered forms entirely
- The system persona speaks in female form (אני מבינה, שמעתי) — this is consistent, not gendered toward the user

INTERVIEW CONVERSATION STYLE
- Always start your response by briefly acknowledging what the user just shared. One short sentence is enough. Examples: "שמעתי, זה מובן" or "תודה ששיתפתם אותי".
- Never repeat the user's words back verbatim — paraphrase briefly or validate the feeling.
- When transitioning to a new topic, use a natural bridge. Examples: "עוד דבר שאני רוצה לשאול עליו..." or "קצת בכיוון אחר..." or "הזכרתם משהו שמזכיר לי לשאול..."
- If the user mentioned something related to the next question topic, reference it: "הזכרתם קודם ש... — אני רוצה לשאול על זה קצת יותר"
- Do NOT repeat the question prompt verbatim from the question bank. Use it as a guide for the topic, but phrase it naturally in your own words, as if you are a caring professional in a conversation.
- Vary your question style — sometimes ask directly, sometimes share a normalizing observation first ("הרבה אנשים מספרים ש..."), sometimes use a softer framing ("אני שואלת כי זה עוזר לי להבין...").
- Keep messages short. 2-4 sentences maximum. This is WhatsApp, not email.
- When the user gives a brief answer, it is okay to ask a short follow-up before moving on — but do not press. One follow-up at most.
- Use the scoring hint from the current question context to guide what information you need, but never expose the scoring system to the user.

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
  "profileUpdates": {
    "employmentStatus": "<employed|job_seeking|leave|military_reserve or null>",
    "workplaceType": "<office|open_office|factory|field|remote|hybrid or null>",
    "jobRole": "<string or null>",
    "teamSize": "<string or null>",
    "timeInRole": "<string or null>"
  },
  "confidenceLevel": "<high|medium|low>",
  "shouldEscalate": <boolean>,
  "questionId": "<question_id or null>"
}
The "profileUpdates" field is optional. Include it only when you extract profile information from the user's response (mainly in Chapter 1). Omit null fields.`;

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

/**
 * Build a plain-text context block injected into the interview turn prompt.
 * Only includes fields that are set — empty context produces an empty string.
 *
 * @param {Object} context
 * @returns {string}
 */
function buildContextBlock(context) {
  const lines = [];

  // Chapter info
  if (context.currentChapter) lines.push(`Current chapter: ${context.currentChapter}`);
  if (context.progress) lines.push(`Progress: ${context.progress}`);

  // User profile from Chapter 1
  if (context.employmentStatus) lines.push(`Employment status: ${context.employmentStatus}`);
  if (context.jobRole) lines.push(`Job role: ${context.jobRole}`);
  if (context.workplaceType) lines.push(`Workplace type: ${context.workplaceType}`);
  if (context.orgSize) lines.push(`Org size: ${context.orgSize}`);
  if (context.phase) lines.push(`Employment phase: ${context.phase}`);

  // Barrier detection state
  if (context.answeredBarrierIds?.length) {
    lines.push(`Already captured barriers: ${context.answeredBarrierIds.join(', ')}`);
  }
  if (context.detectedSignalsSummary) {
    lines.push(`Signals summary: ${context.detectedSignalsSummary}`);
  }

  // Current question guidance
  if (context.currentQuestion) {
    const q = context.currentQuestion;
    lines.push(`\nCurrent question topic: ${q.prompt}`);
    if (q.cluster) lines.push(`Topic cluster: ${q.cluster}`);
    if (q.scoringHint) lines.push(`Scoring guidance (internal only): ${q.scoringHint}`);
    if (q.profileField) lines.push(`Profile field to extract: ${q.profileField}`);
  }

  // Transition flags
  if (context.firstQuestion) {
    lines.push('\nThis is the FIRST question after the user just consented. Open with a warm, brief bridge like "יופי, בואו נתחיל..." before asking the first question naturally. Do NOT repeat the onboarding text. Keep it short.');
  }
  if (context.chapterTransition) {
    lines.push('\nYou are transitioning between chapters. Make a smooth, warm bridge to the new chapter.');
  }
  if (context.clusterTransition) {
    lines.push('This is a new topic area — transition smoothly from the previous topic.');
  }
  if (context.resuming) lines.push('The user is resuming a paused session.');

  return lines.join('\n');
}

/**
 * Parse the raw LLM response string for an interview turn.
 * Extracts JSON (strips markdown code fences if present).
 * On parse failure, returns a graceful fallback with the raw text as the message.
 *
 * @param {string} raw - Raw string from LLM response content
 * @returns {{ nextMessage: string, detectedSignals: object[], confidenceLevel: string, shouldEscalate: boolean, questionId: string | null }}
 */
function parseInterviewTurnResponse(raw) {
  // Extract JSON from response (may be wrapped in markdown code fences)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
  const jsonStr = jsonMatch[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    // Clean profileUpdates — remove null values
    let profileUpdates = null;
    if (parsed.profileUpdates && typeof parsed.profileUpdates === 'object') {
      const cleaned = Object.fromEntries(
        Object.entries(parsed.profileUpdates).filter(([, v]) => v != null && v !== '')
      );
      if (Object.keys(cleaned).length > 0) profileUpdates = cleaned;
    }
    return {
      nextMessage: parsed.nextMessage ?? '',
      detectedSignals: Array.isArray(parsed.detectedSignals) ? parsed.detectedSignals : [],
      profileUpdates,
      confidenceLevel: parsed.confidenceLevel ?? 'medium',
      shouldEscalate: Boolean(parsed.shouldEscalate),
      questionId: parsed.questionId ?? null,
    };
  } catch {
    // Graceful fallback: treat the whole response as a plain message
    return {
      nextMessage: raw,
      detectedSignals: [],
      profileUpdates: null,
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

/**
 * Build the LLM prompt for generating an 8-section user-facing Hebrew report.
 * Uses only the outputs of engines 1-3 (intake, interpretation, translation).
 *
 * @param {object} engines - Pipeline engine outputs
 * @param {object | null} profile - UserProfile (used for disclosure level)
 * @returns {string}
 */
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

/**
 * Build the LLM prompt for generating an 8-section employer-facing Hebrew report.
 * Disclosure level controls the instruction injected — this is the primary
 * safety mechanism ensuring employer output doesn't copy user report content.
 * CRITICAL: the prompt explicitly instructs the LLM that this is NOT derived from the user report.
 *
 * @param {object} engines - Pipeline engine outputs
 * @param {'functional_only' | 'partial_contextual' | 'full_voluntary'} disclosureLevel
 * @returns {string}
 */
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

/**
 * Parse a numbered Hebrew report into a section map.
 * Matches lines like "1. מטרת המסמך" as section headers.
 * All content lines until the next header are grouped under that section.
 *
 * @param {string} raw - Raw Hebrew report text from LLM
 * @returns {Record<string, string>} Section label → section content
 */
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
