import { injectable, inject } from 'tsyringe';
import { BaseLLMProvider, ICacheService, LLMOptions } from '@financer/backend-shared';

@injectable()
export class OllamaProvider extends BaseLLMProvider {
  private readonly baseUrl: string;
  private readonly chatModel: string;
  private readonly embedModel: string;

  constructor(@inject('ICacheService') cache: ICacheService) {
    super(cache);
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.chatModel = process.env.OLLAMA_CHAT_MODEL ?? 'qwen3.5:9b';
    this.embedModel = process.env.OLLAMA_EMBED_MODEL ?? 'bge-m3';
  }

  protected async executeComplete(prompt: string, options?: LLMOptions): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.chatModel,
      prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: options?.temperature ?? 0.7,
        ...(options?.maxTokens !== undefined && { num_predict: options.maxTokens }),
      },
    };

    if (options?.systemPrompt) {
      body['system'] = options.systemPrompt;
    }

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama generate failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { response: string };
    return data.response;
  }

  protected async executeEmbed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embedModel, prompt: text }),
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
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
