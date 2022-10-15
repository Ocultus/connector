import * as vkio from "vk-io";
import * as dayjs from "dayjs";
import * as amqp from "amqplib";
import { AmqpPublisher } from "../../libs/amqp";
import { Envelope } from "../../types/payload";

export class Publisher {
  private amqpPublisher: AmqpPublisher;
  constructor(private connection: amqp.Connection) {
    this.amqpPublisher = new AmqpPublisher(this.connection, "vk-gateway");
  }

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
