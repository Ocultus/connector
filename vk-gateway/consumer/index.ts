import { AmqpConnectionProvider, AmqpConsumer } from "../../libs/amqp";
import { Envelope } from "../../types/payload";
import { VkGroupProvider } from "../provider/vk-group.provider";

class Consumer {
  private amqpConnectionProvider!: AmqpConnectionProvider;
  private amqpConsumer!: AmqpConsumer;
  private vkGroupProvider!: VkGroupProvider;
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
    this.vkGroupProvider = new VkGroupProvider([
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
    this.vkGroupProvider.getApiByGroup(this.group).api.messages.send({
      peer_id: envelope.account,
      message: envelope.payload.text,
      random_id: Math.random(),
    });
  };
}

(async () => {
  const c = new Consumer();
  await c.init();
})();
