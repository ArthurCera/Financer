import { injectable } from 'tsyringe';
import { BaseLLMProvider, LLMOptions } from '@financer/backend-shared';

const COMPLETE_TIMEOUT_MS = 45_000;
const EMBED_TIMEOUT_MS = 30_000;

/** Strip <think>...</think> reasoning blocks produced by qwen3/qwen3.5 models */
function stripThinkingBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
}

@injectable()
export class OllamaProvider extends BaseLLMProvider {
  private readonly baseUrl: string;
  private readonly chatModel: string;
  private readonly embedModel: string;

  constructor() {
    super();
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.chatModel = process.env.OLLAMA_CHAT_MODEL ?? 'qwen3.5:9b';
    this.embedModel = process.env.OLLAMA_EMBED_MODEL ?? 'bge-m3';
  }

  protected async executeComplete(prompt: string, options?: LLMOptions): Promise<string> {
    const think = options?.think !== false; // default: allow thinking

    const body: Record<string, unknown> = {
      model: this.chatModel,
      prompt,
      stream: false,
      think,
      options: {
        temperature: options?.temperature ?? 0.7,
        ...(options?.maxTokens !== undefined && { num_predict: options.maxTokens }),
      },
    };

    // Only force JSON format when explicitly requested via format option
    if (options?.format === 'json') {
      body['format'] = 'json';
    }

    if (options?.systemPrompt) {
      body['system'] = options.systemPrompt;
    }

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(COMPLETE_TIMEOUT_MS),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama generate failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { response: string };
    return stripThinkingBlocks(data.response);
  }

  protected async executeEmbed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embedModel, prompt: text }),
      signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama embeddings failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
