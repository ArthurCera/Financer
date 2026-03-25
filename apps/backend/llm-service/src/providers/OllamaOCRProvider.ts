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
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama OCR failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { message: { content: string } };
    // Strip <think> blocks that some models produce even with format: json
    const rawText = data.message.content.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();

    // Try to parse structured data, fall back gracefully
    let structuredData: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(rawText);
      const validated = OCRExpenseSchema.safeParse(parsed);
      structuredData = validated.success
        ? (validated.data as Record<string, unknown>)
        : pickKnownFields(parsed);
    } catch {
      // Model returned non-JSON — try to extract JSON from mixed text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          structuredData = pickKnownFields(JSON.parse(jsonMatch[0]));
        } catch { /* truly not JSON */ }
      }
    }

    return { text: rawText, structuredData };
  }
}

const OCR_KNOWN_FIELDS = ['amount', 'date', 'description', 'merchant', 'category'] as const;

/** Extract only the fields OCRExpenseSchema expects, stripping any unknown keys */
function pickKnownFields(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const safe: Record<string, unknown> = {};
  for (const field of OCR_KNOWN_FIELDS) {
    if (raw[field] !== undefined) safe[field] = raw[field];
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}
