import { injectable } from 'tsyringe';
import { IOCRProvider, OCRResult } from '@financer/backend-shared';
import { OCR_SYSTEM } from '../prompts';
import { OCRExpenseSchema } from '../validators/llm.validator';

@injectable()
export class OllamaOCRProvider implements IOCRProvider {
  private readonly baseUrl: string;
  private readonly ocrModel: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.ocrModel = process.env.OLLAMA_OCR_MODEL ?? 'glm-ocr';
  }

  async extractFromImage(imageBase64: string, _mimeType?: string): Promise<OCRResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ocrModel,
        messages: [
          {
            role: 'user',
            content: OCR_SYSTEM,
            images: [imageBase64],
          },
        ],
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama OCR failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { message: { content: string } };
    const rawText = data.message.content;

    // Try to parse structured data, fall back gracefully
    let structuredData: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(rawText);
      const validated = OCRExpenseSchema.safeParse(parsed);
      structuredData = validated.success
        ? (validated.data as Record<string, unknown>)
        : parsed;
    } catch {
      // Model returned non-JSON — return raw text only
    }

    return { text: rawText, structuredData };
  }
}
