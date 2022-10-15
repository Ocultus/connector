import { AmqpConnectionProvider } from "../libs/amqp";
import { Consumer } from "./services/consumer";
import { Publisher } from "./services/publisher";
import { VkGroupApiProvider } from "./services/vk-group-api.provider";

export class ApplicationModule {
  private vkGroupProviders: VkGroupApiProvider[];
  private amqpConnectionProvider: AmqpConnectionProvider;

  constructor() {
    this.amqpConnectionProvider = new AmqpConnectionProvider({
      options: {
        hostname: process.env.AMQP_HOSTNAME,
        username: process.env.AMQP_USERNAME,
        vhost: "/",
      },
    });
    //TODO move to the special class in charge of keeping secrets
    const group = Number(process.env.VK_GROUP!);
    this.vkGroupProviders = [
      new VkGroupApiProvider(group, process.env.VK_TOKEN!),
    ];
  }

  public init = async () => {
    await this.amqpConnectionProvider.init();
    await Promise.all(
      this.vkGroupProviders.map(async (v) => {
        await new Consumer(
          v,
          this.amqpConnectionProvider.getConnection()
        ).init();
        const publisher = new Publisher(
          this.amqpConnectionProvider.getConnection()
        );
        v.registerLongPoll(publisher.handleNewMessage);
      })
    );
  };
}

(async () => {
  const app = new ApplicationModule();
  await app.init();
})();
