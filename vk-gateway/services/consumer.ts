import * as amqp from "amqplib";
import { AmqpConsumer } from "../../libs/amqp";
import { Envelope } from "../../types/payload";
import { VkGroupApiProvider } from "./vk-group-api.provider";

export class Consumer {
  private amqpConsumer: AmqpConsumer;
  constructor(
    private readonly vkGroupProvider: VkGroupApiProvider,
    private readonly connection: amqp.Connection
  ) {
    this.amqpConsumer = new AmqpConsumer(
      this.connection,
      "vk-gateway",
      "vk.messages.out",
      "vk.messages.out"
    );
  }
  public init = async () => {
    await this.amqpConsumer.consume<Envelope>(this.consume);
  };

  private consume = (envelope: Envelope) => {
    this.vkGroupProvider.sendMessage(envelope);
  };
}
