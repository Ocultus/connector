import { AmqpConnectionProvider, AmqpConsumer } from "../../libs/amqp";
import { Envelope } from "../../types/payload";
import { VkGroupApiProvider } from "./vk-group-api.provider";

export class Consumer {
  private amqpConnectionProvider!: AmqpConnectionProvider;
  private amqpConsumer!: AmqpConsumer;
  //TODO refactor
  constructor(
    private readonly vkGroupProvider: VkGroupApiProvider
  ) {
    this.amqpConnectionProvider = new AmqpConnectionProvider({
      options: {
        hostname: process.env.AMQP_HOSTNAME,
        username: process.env.AMQP_USERNAME,
        vhost: "/",
      },
    });
  }
  public init = async () => {
    this.amqpConnectionProvider.init();
    this.amqpConsumer = new AmqpConsumer(
      this.amqpConnectionProvider.getConnection(),
      "vk-gateway",
      "vk.messages.out",
      "vk.messages.out"
    );
    await this.amqpConsumer.consume<Envelope>(this.consume);
  };

  private consume = (envelope: Envelope) => {
    this.vkGroupProvider.sendMessage(envelope);
  };
}
