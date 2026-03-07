import { callLLM } from '../llm/client';
import { ACKNOWLEDGMENT_PROMPT } from '../llm/prompts';

/**
 * Generates a brief, empathetic Hebrew acknowledgment of the user's answer.
 * Falls back to a static response if LLM is unavailable.
 */
export async function buildAcknowledgment(
  content: string,
  stage: number
): Promise<string> {
  try {
    const result = await callLLM({
      systemPrompt: ACKNOWLEDGMENT_PROMPT,
      userMessage: content,
      maxTokens: 150,
    });
    if (result.text.trim()) {
      return result.text.trim();
    }
  } catch {
    // Fall back to static
  }
  return getStaticAcknowledgment(stage);
}

function getStaticAcknowledgment(stage: number): string {
  const responses: Record<number, string> = {
    1: 'תודה על השיתוף.',
    2: 'הבנתי, תודה.',
    3: 'אני שומע/ת אותך. תודה שחלקת.',
    4: 'מובן. חשוב שסיפרת על זה.',
    5: 'תודה על הפתיחות.',
    6: 'תודה.',
  };
  return responses[stage] ?? 'תודה.';
}

/**
 * Returns a static transition message between interview stages.
 */
export function buildTransitionMessage(
  fromStage: number,
  toStage: number
): string | null {
  const transitions: Record<string, string> = {
    '1_2': 'עכשיו אשאל כמה שאלות על מקום העבודה שלך.',
    '2_3': 'עכשיו נדבר קצת על מה שמקשה עליך בעבודה.',
    '3_4': 'תודה. עכשיו אשאל על מצבים שמרגישים קשים במיוחד.',
    '4_5': 'כמעט סיימנו. עכשיו אשאל על שיתוף המעסיק.',
    '5_6': 'שאלה אחרונה לפני שנסכם.',
  };
  return transitions[`${fromStage}_${toStage}`] ?? null;
}
