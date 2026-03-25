import { injectable, inject } from 'tsyringe';
import { IOCRProvider } from '@financer/backend-shared';
import type { OCRResponse, OCRExpenseData } from '@financer/shared';

@injectable()
export class OCRService {
  constructor(
    @inject('IOCRProvider') private readonly ocrProvider: IOCRProvider,
  ) {}

  async extractExpense(imageBase64: string, mimeType?: string): Promise<OCRResponse> {
    const result = await this.ocrProvider.extractFromImage(imageBase64, mimeType);

    let expense: OCRExpenseData | undefined;
    if (result.structuredData) {
      const data = result.structuredData;
      expense = {
        amount: this.parseAmount(data['amount']),
        date: this.parseDate(data['date']),
        description: data['description'] != null ? String(data['description']) : undefined,
        merchant: data['merchant'] != null ? String(data['merchant']) : undefined,
        category: data['category'] != null ? String(data['category']) : undefined,
      };
    }

    return { text: result.text, expense };
  }

  /** Coerce amount from string or number */
  private parseAmount(raw: unknown): number | undefined {
    if (raw == null) return undefined;
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
    return isNaN(num) || num <= 0 ? undefined : num;
  }

  /** Normalize date to YYYY-MM-DD from various formats */
  private parseDate(raw: unknown): string | undefined {
    if (raw == null) return undefined;
    const str = String(raw).trim();

    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // Try parsing as a Date
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return undefined;
  }
}
