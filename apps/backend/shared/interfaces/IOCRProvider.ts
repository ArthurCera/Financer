/**
 * IOCRProvider
 *
 * Abstracts image-to-text extraction.
 * Concrete implementation uses Ollama llama3.2-vision,
 * with a Tesseract.js fallback. Either can be swapped
 * without touching any calling code.
 *
 * Used by llm-service for payslip/receipt upload feature.
 */
export interface IOCRProvider {
  /**
   * Extract text and structured data from a base64-encoded image.
   * @param imageBase64 - Raw base64 string (no data URI prefix)
   * @param mimeType    - Image MIME type (default: 'image/jpeg')
   */
  extractFromImage(imageBase64: string, mimeType?: string): Promise<OCRResult>;
}

export interface OCRResult {
  /** Raw extracted text */
  text: string;
  /**
   * Structured data parsed from the text.
   * For expense/payslip extraction this typically contains:
   *   amount, date, merchant, category (if inferable)
   */
  structuredData?: Record<string, unknown>;
}
