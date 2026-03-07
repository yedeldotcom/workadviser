import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { callLLM } from './client';
import { SIGNAL_DETECTION_PROMPT, RECOMMENDATION_RENDERING_PROMPT } from './prompts';

// ─── Signal Detection ────────────────────────────────────────────────

export const DetectedSignalSchema = z.object({
  signalType: z.enum(['barrier', 'trigger', 'amplifier']),
  category: z.string(),
  rawEvidence: z.string(),
  interpretation: z.string(),
  confidence: z.number().min(0).max(1),
  severity: z.number().min(0).max(1).optional(),
});

export type DetectedSignal = z.infer<typeof DetectedSignalSchema>;

const signalDetectionTool: Anthropic.Tool = {
  name: 'report_signals',
  description: 'Report detected workplace barrier signals, triggers, and amplifiers from the user message.',
  input_schema: {
    type: 'object' as const,
    properties: {
      signals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            signalType: {
              type: 'string',
              enum: ['barrier', 'trigger', 'amplifier'],
            },
            category: { type: 'string' },
            rawEvidence: { type: 'string', description: 'The part of the message that indicates this signal' },
            interpretation: { type: 'string', description: 'What this signal means functionally' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            severity: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['signalType', 'category', 'rawEvidence', 'interpretation', 'confidence'],
        },
      },
    },
    required: ['signals'],
  },
};

export async function detectSignals(userMessage: string): Promise<DetectedSignal[]> {
  const response = await callLLM({
    systemPrompt: SIGNAL_DETECTION_PROMPT,
    userMessage,
    tools: [signalDetectionTool],
    maxTokens: 2048,
  });

  if (!response.toolUse || response.toolUse.length === 0) {
    return [];
  }

  const toolResult = response.toolUse.find((t) => t.name === 'report_signals');
  if (!toolResult) return [];

  const raw = (toolResult.input as { signals: unknown[] }).signals;
  const parsed: DetectedSignal[] = [];

  for (const s of raw) {
    const result = DetectedSignalSchema.safeParse(s);
    if (result.success) {
      parsed.push(result.data);
    }
  }

  return parsed;
}

// ─── Recommendation Rendering ────────────────────────────────────────

export interface RenderContext {
  templateContentHe: string;
  jobTitle?: string;
  workplaceType?: string;
  employmentStage?: string;
  barriers: string[];
}

export async function renderRecommendation(context: RenderContext): Promise<string> {
  const contextDescription = [
    context.jobTitle && `תפקיד: ${context.jobTitle}`,
    context.workplaceType && `סוג מקום עבודה: ${context.workplaceType}`,
    context.employmentStage && `שלב תעסוקתי: ${context.employmentStage}`,
    context.barriers.length > 0 && `חסמים: ${context.barriers.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  const message = `Template to render:\n${context.templateContentHe}\n\nUser context:\n${contextDescription}\n\nRender the recommendation in natural Hebrew, adapted to this specific context. Return ONLY the rendered text.`;

  const response = await callLLM({
    systemPrompt: RECOMMENDATION_RENDERING_PROMPT,
    userMessage: message,
    maxTokens: 1024,
  });

  return response.text.trim();
}
