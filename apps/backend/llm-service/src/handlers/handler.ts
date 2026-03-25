import 'reflect-metadata';
import '../container';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from 'tsyringe';
import {
  withErrorHandler,
  parseBody,
  ok,
  authenticate,
} from '@financer/backend-shared';
import { LLMService } from '../services/LLMService';
import { OCRService } from '../services/OCRService';
import { QueueWorker } from '../services/QueueWorker';
import {
  OCRSchema,
  CategorizeSchema,
  CategorizeBatchSchema,
  ChatSchema,
} from '../validators/llm.validator';

const llmService = container.resolve(LLMService);
const ocrService = container.resolve(OCRService);

// Start batch worker consumer (fire-and-forget on cold start)
const queueWorker = container.resolve(QueueWorker);
queueWorker.start().catch((err) => {
  console.warn('[LLM] Queue worker failed to start (RabbitMQ may not be running):', err);
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const health = withErrorHandler(
  async (_e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const ollamaProvider = container.resolve<{ isAvailable(): Promise<boolean> }>('ILLMProvider');
    const ollamaAvailable = await ollamaProvider.isAvailable();
    return ok({
      service: 'llm-service',
      status: 'ok',
      ollama: ollamaAvailable ? 'connected' : 'unavailable',
      timestamp: new Date().toISOString(),
    });
  },
);

// ---------------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------------

export const ocr = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    authenticate(event);
    const body = OCRSchema.parse(parseBody(event));
    const result = await ocrService.extractExpense(body.imageBase64, body.mimeType);
    return ok(result);
  },
);

// ---------------------------------------------------------------------------
// Categorize — single
// ---------------------------------------------------------------------------

export const categorize = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const body = CategorizeSchema.parse(parseBody(event));
    const result = await llmService.categorize(userId, body.expenseId);
    return ok(result);
  },
);

// ---------------------------------------------------------------------------
// Categorize — batch (async)
// ---------------------------------------------------------------------------

export const categorizeBatch = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const body = CategorizeBatchSchema.parse(parseBody(event));
    await llmService.categorizeBatch(userId, body.month, body.year);
    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: { message: 'Batch categorization queued' },
      }),
    };
  },
);

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const chat = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const body = ChatSchema.parse(parseBody(event));
    const reply = await llmService.chat(userId, body.message);
    return ok({ reply });
  },
);

// ---------------------------------------------------------------------------
// Chat History
// ---------------------------------------------------------------------------

export const chatHistory = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const result = await llmService.chatHistory(userId);
    return ok(result);
  },
);
