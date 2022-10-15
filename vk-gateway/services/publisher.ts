import * as vkio from "vk-io";
import * as dayjs from "dayjs";
import { AmqpConnectionProvider, AmqpPublisher } from "../../libs/amqp";
import { Envelope } from "../../types/payload";
import { VkGroupApiProvider } from "./vk-group-api.provider";

export class Publisher {
  private amqpConnectionProvider!: AmqpConnectionProvider;
  private amqpPublisher!: AmqpPublisher;
  constructor() {
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
    this.amqpPublisher = new AmqpPublisher(
      this.amqpConnectionProvider.getConnection(),
      "vk-gateway"
    );
  };

  public handleNewMessage = (
    ctx: vkio.MessageContext<vkio.ContextDefaultState>
  ) => {
    if (ctx.text && ctx.peerId) {
      this.amqpPublisher.publish<Envelope>(
        {
          type: "incoming",
          account: ctx.peerId,
          payload: {
            text: ctx.text,
          },
          createdAt: new Date().toISOString(),
          sentAt: dayjs.unix(ctx.createdAt).toISOString(),
        },
        "vk.messages.in"
      );
    }
  };
}
