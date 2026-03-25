import { injectable } from 'tsyringe';
import { IQueueService } from '@financer/backend-shared';
import amqplib from 'amqplib';

@injectable()
export class RabbitMQService implements IQueueService {
  private connection: any = null;
  private channel: any = null;

  private async getChannel(): Promise<any> {
    if (this.channel) return this.channel as any;

    const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
    const conn = await amqplib.connect(url);
    this.connection = conn;
    this.channel = await conn.createChannel();

    conn.on('error', (err: Error) => {
      console.error('[RabbitMQ] Connection error:', err.message);
      this.connection = null;
      this.channel = null;
    });

    conn.on('close', () => {
      console.warn('[RabbitMQ] Connection closed');
      this.connection = null;
      this.channel = null;
    });

    console.info('[RabbitMQ] Connected');
    return this.channel as any;
  }

  async publish<T>(queue: string, message: T): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
  }

  async consume<T>(queue: string, handler: (message: T) => Promise<void>): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertQueue(queue, { durable: true });
    await channel.prefetch(1);

    await channel.consume(queue, async (msg: any) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString()) as T;
        await handler(payload);
        channel.ack(msg);
      } catch (error) {
        console.error('[RabbitMQ] Handler error:', error);
        channel.nack(msg, false, false);
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
  }
}
