import Anthropic from '@anthropic-ai/sdk';

let clientInstance: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!clientInstance) {
    clientInstance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return clientInstance;
}

export interface LLMRequest {
  systemPrompt: string;
  userMessage: string;
  tools?: Anthropic.Tool[];
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  toolUse?: {
    name: string;
    input: Record<string, unknown>;
  }[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: request.maxTokens ?? 4096,
    system: request.systemPrompt,
    tools: request.tools,
    messages: [{ role: 'user', content: request.userMessage }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  const toolUse = response.content
    .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
    .map((block) => ({
      name: block.name,
      input: block.input as Record<string, unknown>,
    }));

  return {
    text,
    toolUse: toolUse.length > 0 ? toolUse : undefined,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
