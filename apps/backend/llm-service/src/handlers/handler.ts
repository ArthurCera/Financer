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
  ForbiddenError,
  NotFoundError,
} from '@financer/backend-shared';
import { LLMService } from '../services/LLMService';
import { OCRService } from '../services/OCRService';
import { QueueWorker } from '../services/QueueWorker';
import { ChatStreamServer } from '../streaming/ChatStreamServer';
import {
  OCRSchema,
  CategorizeSchema,
  CategorizeBatchSchema,
  ChatSchema,
} from '../validators/llm.validator';

const llmService = container.resolve<LLMService>('ILLMService');
const ocrService = container.resolve<OCRService>('IOCRService');
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

// Start long-running processes only in local development (serverless-offline).
// In production AWS Lambda, these should run as separate ECS/EC2 services.
if (process.env.IS_OFFLINE === 'true') {
  const queueWorker = container.resolve<QueueWorker>('IQueueWorker');
  queueWorker.start().catch((err) => {
    console.warn('[LLM] Queue worker failed to start (RabbitMQ may not be running):', err);
  });

  const chatStreamServer = container.resolve(ChatStreamServer);
  chatStreamServer.start().catch((err) => {
    console.warn('[LLM] Chat stream server failed to start:', err);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.info('[LLM] Shutting down gracefully...');
    try {
      // Wait for in-flight messages to finish before closing the connection
      await queueWorker.stop();
    } catch { /* already stopped */ }
    try {
      const queueService = container.resolve<{ close(): Promise<void> }>('IQueueService');
      await queueService.close();
    } catch { /* already closed */ }
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
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
// Categorize — batch (async)
// ---------------------------------------------------------------------------

export const categorizeBatch = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    await enforceRateLimit(userId);
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

/**
 * POST /llm/chat — Submit a chat message.
 * Queues the request via RabbitMQ and returns a jobId (202 Accepted).
 * The frontend polls GET /llm/chat/job/:id for the result.
 */
export const chat = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    await enforceRateLimit(userId);
    const body = ChatSchema.parse(parseBody(event));

    const jobId = `chat-${userId}-${Date.now()}`;
    // Mark job as pending in Redis (TTL 5 minutes)
    await cacheService.set(
      `chat_job:${jobId}`,
      { status: 'pending' },
      300,
    );

    // Queue the job
    await llmService.queueChat(jobId, userId, body.message);

    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: { jobId } }),
    };
  },
);

/**
 * GET /llm/chat/job/{id} — Poll for a queued chat result.
 * Returns status: pending | completed | failed.
 */
export const chatJob = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const jobId = event.pathParameters?.id;
    if (!jobId) throw new ValidationError('Missing job ID');

    // Verify job belongs to the requesting user (jobId format: chat-{userId}-{timestamp})
    if (!jobId.startsWith(`chat-${userId}-`)) throw new ForbiddenError('Not your job');

    const result = await cacheService.get<{
      status: 'pending' | 'completed' | 'failed';
      reply?: unknown;
      error?: string;
    }>(`chat_job:${jobId}`);

    if (!result) throw new NotFoundError('Job', jobId);

    return ok(result);
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
  { method: 'GET',  pattern: /^\/health$/,                                    handler: health as RouteHandler },
  { method: 'POST', pattern: /^\/llm\/ocr$/,                                  handler: ocr as RouteHandler },
  { method: 'POST', pattern: /^\/llm\/categorize$/,                           handler: categorize as RouteHandler },
  { method: 'POST', pattern: /^\/llm\/categorize-batch$/,                     handler: categorizeBatch as RouteHandler },
  { method: 'POST', pattern: /^\/llm\/chat$/,                                 handler: chat as RouteHandler },
  { method: 'GET',  pattern: /^\/llm\/chat\/job\/(?<id>[A-Za-z0-9_-]+)$/,    handler: chatJob as RouteHandler },
  { method: 'GET',  pattern: /^\/llm\/chat\/history$/,                        handler: chatHistory as RouteHandler },
];

export const router = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.requestContext?.httpMethod ?? event.httpMethod ?? '';
  const path = (event as unknown as { rawPath?: string }).rawPath ?? event.path ?? '';

  for (const route of routes) {
    const match = route.pattern.exec(path);
    if (route.method === method.toUpperCase() && match) {
      // Inject captured named groups into pathParameters so handlers can access them
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
