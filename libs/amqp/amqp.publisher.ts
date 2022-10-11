import * as amqp from "amqplib";
export class AmqpPublisher {
  private channel: amqp.Channel;
  constructor(
    private readonly connection: amqp.Connection,
    private readonly exchange: string
  ) {}

  public init = async () => {
    this.channel = await this.connection.createChannel();
    this.channel.assertExchange(this.exchange, "topic");
  };

  public publish = <T>(data: T, topic: string) => {
    if (!this.channel) {
      throw new Error("channel not initialized");
    }

    this.channel.publish(
      this.exchange,
      topic,
      Buffer.from(JSON.stringify(data))
    );
  };
}
