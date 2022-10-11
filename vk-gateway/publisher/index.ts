import * as vkio from "vk-io";
import { AmqpConnectionProvider, AmqpPublisher } from "../../libs/amqp";
import { Envelope } from "../../types/payload";
import { VkGroupProvider } from "../provider/vk-group.provider";

class Publisher {
  private amqpConnectionProvider!: AmqpConnectionProvider;
  private amqpPublisher!: AmqpPublisher;
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
    this.amqpPublisher = new AmqpPublisher(
      this.amqpConnectionProvider.getConnection(),
      "vk-gateway"
    );

    this.vkGroupProvider.registerLongPoll(this.group, this.handleNewMessage);
  };

  private handleNewMessage = (
    ctx: vkio.MessageContext<vkio.ContextDefaultState>
  ) => {
    if (ctx.text && ctx.peerId) {
      this.amqpPublisher.publish<Envelope>(
        {
          account: ctx.peerId,
          payload: {
            text: ctx.text,
          },
        },
        "vk.messages.int"
      );
    }
  };
}

(async () => {
  const publisher = new Publisher();
  await publisher.init();
})();
