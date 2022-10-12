import { AmqpConnectionProvider, AmqpConsumer } from "../../libs/amqp";
import { Envelope } from "../../types/payload";
import { VkGroupApiProvider } from "../common/api/vk-group-api.provider";

class Consumer {
  private amqpConnectionProvider!: AmqpConnectionProvider;
  private amqpConsumer!: AmqpConsumer;
  private vkGroupProvider!: VkGroupApiProvider;
  //TODO refactor
  private group!: number;
  constructor() {
    this.amqpConnectionProvider = new AmqpConnectionProvider({
      options: {
        hostname: process.env.AMQP_HOSTNAME,
        username: process.env.AMQP_USERNAME,
        vhost: "/",
      },
    });
    const group = Number(process.env.VK_GROUP!);
    this.vkGroupProvider = new VkGroupApiProvider([
      {
        group,
        token: process.env.VK_TOKEN!,
      },
    ]);
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
    this.vkGroupProvider.sendMessage(this.group, envelope);
  };
}

(async () => {
  const c = new Consumer();
  await c.init();
})();
