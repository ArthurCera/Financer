import { injectable, inject } from 'tsyringe';
import { LLMService } from './LLMService';

/**
 * QueueWorker
 *
 * Starts consuming batch categorization jobs from RabbitMQ.
 * Called once at cold-start to register the consumer.
 */
@injectable()
export class QueueWorker {
  constructor(
    @inject(LLMService) private readonly llmService: LLMService,
  ) {}

  async start(): Promise<void> {
    console.info('[QueueWorker] Starting batch categorization consumer...');
    await this.llmService.startBatchWorker();
    console.info('[QueueWorker] Consumer registered on llm.categorize-batch');
  }
}
