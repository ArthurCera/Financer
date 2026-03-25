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
        amount: typeof data['amount'] === 'number' ? data['amount'] : undefined,
        date: typeof data['date'] === 'string' ? data['date'] : undefined,
        description: typeof data['description'] === 'string' ? data['description'] : undefined,
        merchant: typeof data['merchant'] === 'string' ? data['merchant'] : undefined,
        category: typeof data['category'] === 'string' ? data['category'] : undefined,
      };
    }

    return { text: result.text, expense };
  }
}
