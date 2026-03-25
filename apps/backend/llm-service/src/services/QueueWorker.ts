import { injectable, inject } from 'tsyringe';
import type { ILLMService, IQueueService } from '@financer/backend-shared';

/**
 * QueueWorker
 *
 * Starts consuming batch categorization and chat jobs from RabbitMQ.
 * Tracks in-flight message processing so that `stop()` can await
 * completion of all active handlers before the connection is closed.
 */
@injectable()
export class QueueWorker {
  private readonly inFlight = new Set<Promise<void>>();
  private stopping = false;

  constructor(
    @inject('ILLMService') private readonly llmService: ILLMService,
    @inject('IQueueService') private readonly queueService: IQueueService,
  ) {}

  async start(): Promise<void> {
    console.info('[QueueWorker] Starting consumers...');
    await Promise.all([
      this.llmService.startBatchWorker(),
      this.llmService.startChatWorker(),
    ]);
    console.info('[QueueWorker] Consumers registered: llm.categorize-batch, llm.chat');
  }

  /**
   * Gracefully stop all consumers.
   * Waits for every in-flight message handler to complete before returning,
   * so the caller can safely close the queue connection afterwards.
   */
  async stop(): Promise<void> {
    this.stopping = true;
    console.info(`[QueueWorker] Stopping — waiting for ${this.inFlight.size} in-flight message(s)...`);

    // Await all in-flight processing promises
    if (this.inFlight.size > 0) {
      await Promise.allSettled([...this.inFlight]);
    }

    console.info('[QueueWorker] All in-flight messages processed.');
  }

  /**
   * Wrap a message handler so the QueueWorker tracks it as in-flight.
   * When `stopping` is true, new messages are still processed (we don't
   * want to nack them) but no new consumers are registered.
   */
  trackExecution(task: Promise<void>): void {
    this.inFlight.add(task);
    task.finally(() => {
      this.inFlight.delete(task);
    });
  }

  get isStopping(): boolean {
    return this.stopping;
  }
}
