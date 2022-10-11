import * as amqp from "amqplib";
export class AmqpConsumer {
  private channel: amqp.Channel | undefined;
  constructor(
    private readonly connection: amqp.Connection,
    private readonly exchange: string,
    private readonly queueName: string,
    private readonly topic: string,
    private readonly prefetch: number = 1
  ) {}

  public init = async () => {
    this.channel = await this.connection.createChannel();
    this.channel.assertExchange(this.exchange, "topic");
    this.channel.assertQueue(this.queueName);
    this.channel.bindQueue(this.queueName, this.exchange, this.topic);

    this.channel.prefetch(this.prefetch);
  };

  public consume = async <T>(callback: (data: T) => Promise<void> | void) => {
    if (this.channel === undefined) {
      throw new Error("channel not initialized");
    }
    await this.channel.consume(
      this.queueName,
      async (msg: amqp.ConsumeMessage | null) => {
        if (!msg) {
          return;
        }

        try {
          const data = JSON.parse(msg.content.toString()) as T;

          await callback(data);

          this.channel!.ack(msg);
        } catch (e) {
          console.error({
            error: e as any,
            event: this.consume,
          });
          this.channel!.nack(msg, false, false);
        }
      }
    );
  };
}
