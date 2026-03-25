import { injectable } from 'tsyringe';
import { IQueueService } from '@financer/backend-shared';
import amqplib, { type Channel, type ConsumeMessage } from 'amqplib';

const MAX_RETRIES = 3;

/** Return type of amqplib.connect() — has close(), createChannel(), event emitters */
type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;

@injectable()
export class RabbitMQService implements IQueueService {
  private connection: AmqpConnection | null = null;
  private channel: Channel | null = null;
  private assertedQueues = new Set<string>();

  private async getChannel(): Promise<Channel> {
    if (this.channel) return this.channel;

    // Clean up stale connection before reconnecting
    if (this.connection) {
      try { await this.connection.close(); } catch { /* already closed */ }
      this.connection = null;
    }

    const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
    const conn = await amqplib.connect(url);
    this.connection = conn;
    this.channel = await conn.createChannel();

    const onError = (err: Error) => {
      console.error('[RabbitMQ] Connection error:', err.message);
      conn.removeListener('error', onError);
      conn.removeListener('close', onClose);
      this.connection = null;
      this.channel = null;
      this.assertedQueues.clear();
    };
    const onClose = () => {
      console.warn('[RabbitMQ] Connection closed');
      conn.removeListener('error', onError);
      conn.removeListener('close', onClose);
      this.connection = null;
      this.channel = null;
      this.assertedQueues.clear();
    };

    conn.on('error', onError);
    conn.on('close', onClose);

    // Set up dead letter exchange
    await this.channel.assertExchange('dlx', 'direct', { durable: true });

    console.info('[RabbitMQ] Connected');
    return this.channel;
  }

  private async ensureQueue(channel: Channel, queue: string): Promise<void> {
    if (this.assertedQueues.has(queue)) return;

    // Assert dead letter queue first
    const dlqName = `${queue}.dead`;
    await channel.assertQueue(dlqName, { durable: true });
    await channel.bindQueue(dlqName, 'dlx', dlqName);

    // Assert main queue with DLX routing
    await channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: 'dlx',
      deadLetterRoutingKey: dlqName,
    });
    this.assertedQueues.add(queue);
  }

  async publish<T>(queue: string, message: T): Promise<void> {
    const channel = await this.getChannel();
    await this.ensureQueue(channel, queue);
    const ok = channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    if (!ok) {
      // Buffer full — wait for drain event before continuing
      await new Promise<void>((resolve) => channel.once('drain', resolve));
    }
  }

  async consume<T>(queue: string, handler: (message: T) => Promise<void>): Promise<void> {
    const channel = await this.getChannel();
    await this.ensureQueue(channel, queue);
    await channel.prefetch(1);

    await channel.consume(queue, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const retryCount = (msg.properties.headers?.['x-retry-count'] as number) ?? 0;

      try {
        const payload = JSON.parse(msg.content.toString()) as T;
        await handler(payload);
        channel.ack(msg);
      } catch (error) {
        console.error('[RabbitMQ] Handler error:', error);

        if (retryCount < MAX_RETRIES) {
          // Await delay, then re-publish before acking to prevent message loss on crash
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          channel.sendToQueue(queue, msg.content, {
            persistent: true,
            headers: { 'x-retry-count': retryCount + 1 },
          });
          channel.ack(msg);
        } else {
          // Max retries exceeded — nack to send to DLQ
          channel.nack(msg, false, false);
        }
      }
    });
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    this.assertedQueues.clear();
  }
}
