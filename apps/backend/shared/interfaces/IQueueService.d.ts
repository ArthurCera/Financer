/**
 * IQueueService
 *
 * Abstracts all message queue operations.
 * Concrete implementation uses RabbitMQ (amqplib),
 * but any broker can be swapped via this interface.
 *
 * Used by llm-service for async batch-categorization jobs.
 */
export interface IQueueService {
    /**
     * Publish a message to a named queue.
     * The message is serialized to JSON automatically.
     */
    publish<T>(queue: string, message: T): Promise<void>;
    /**
     * Register a consumer handler for a named queue.
     * The handler receives one deserialized message at a time.
     * Acknowledge/reject is handled internally based on handler result.
     */
    consume<T>(queue: string, handler: (message: T) => Promise<void>): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=IQueueService.d.ts.map