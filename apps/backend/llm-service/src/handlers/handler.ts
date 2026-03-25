import 'reflect-metadata';
import '../container';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from 'tsyringe';
import {
  withErrorHandler,
  parseBody,
  ok,
  authenticate,
  ICacheService,
  RateLimitError,
  ValidationError,
} from '@financer/backend-shared';
import { LLMService } from '../services/LLMService';
import { OCRService } from '../services/OCRService';
import { CategorizationService } from '../services/CategorizationService';
import {
  OCRSchema,
  CategorizeSchema,
  CategorizeBatchSchema,
  ChatSchema,
} from '../validators/llm.validator';

const llmService = container.resolve<LLMService>('ILLMService');
const ocrService = container.resolve<OCRService>('IOCRService');
const categorizationService = container.resolve<CategorizationService>('ICategorizationService');
const cacheService = container.resolve<ICacheService>('ICacheService');

/** Max LLM calls per user per sliding 60-second window */
const RATE_LIMIT_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

async function enforceRateLimit(userId: string): Promise<void> {
  const key = `rate_limit:llm:${userId}`;
  const now = Date.now();
  const uniqueId = `${now}:${Math.random().toString(36).slice(2, 10)}`;
  const count = await cacheService.slidingWindowCount(key, RATE_LIMIT_WINDOW_MS, now, uniqueId);
  if (count > RATE_LIMIT_PER_MINUTE) {
    throw new RateLimitError();
  }
}

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
    const userId = authenticate(event);
    await enforceRateLimit(userId);
    const body = OCRSchema.parse(parseBody(event));
    const result = await ocrService.extractExpense(body.imageBase64, body.mimeType);

    // After OCR extraction, run the description through categorization to get a proper categoryId
    if (result.expense) {
      const desc = result.expense.description ?? result.expense.merchant;
      const amount = result.expense.amount;
      if (desc && amount) {
        const match = await categorizationService.categorizeDescription(userId, desc, amount);
        if (match) {
          result.expense.category = match.categoryName;
          result.expense.categoryId = match.categoryId;
        }
      }
    }

    return ok(result);
  },
);

// ---------------------------------------------------------------------------
// Categorize — single
// ---------------------------------------------------------------------------

export const categorize = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    await enforceRateLimit(userId);
    const body = CategorizeSchema.parse(parseBody(event));
    const result = await llmService.categorize(userId, body.expenseId);
    return ok(result);
  },
);

// ---------------------------------------------------------------------------
// Categorize — batch
// ---------------------------------------------------------------------------

export const categorizeBatch = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    await enforceRateLimit(userId);
    const body = CategorizeBatchSchema.parse(parseBody(event));
    const result = await llmService.categorizeBatchSync(userId, body.month, body.year, body.recategorizeAll);
    return ok(result);
  },
);

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const chat = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    await enforceRateLimit(userId);
    const body = ChatSchema.parse(parseBody(event));
    const reply = await llmService.chat(userId, body.message);
    return ok(reply);
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

// ---------------------------------------------------------------------------
// Router — single entry point for API Gateway proxy integration
// ---------------------------------------------------------------------------

type RouteHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

type Route = {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
};

const routes: Route[] = [
  { method: 'GET',  pattern: /^\/health$/,              handler: health as RouteHandler },
  { method: 'POST', pattern: /^\/llm\/ocr$/,            handler: ocr as RouteHandler },
  { method: 'POST', pattern: /^\/llm\/categorize$/,     handler: categorize as RouteHandler },
  { method: 'POST', pattern: /^\/llm\/categorize-batch$/, handler: categorizeBatch as RouteHandler },
  { method: 'POST', pattern: /^\/llm\/chat$/,           handler: chat as RouteHandler },
  { method: 'GET',  pattern: /^\/llm\/chat\/history$/,  handler: chatHistory as RouteHandler },
];

export const router = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.requestContext?.httpMethod ?? event.httpMethod ?? '';
  const path = (event as unknown as { rawPath?: string }).rawPath ?? event.path ?? '';

  for (const route of routes) {
    const match = route.pattern.exec(path);
    if (route.method === method.toUpperCase() && match) {
      if (match.groups) {
        event.pathParameters = { ...event.pathParameters, ...match.groups };
      }
      return route.handler(event);
    }
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not Found', path, method }),
  };
};
