import { Consumer } from "./services/consumer";
import { Publisher } from "./services/publisher";
import { VkGroupApiProvider } from "./services/vk-group-api.provider";

export class ApplicationModule {
  private vkGroupProvider: VkGroupApiProvider;
  private publisher!: Publisher;
  private consumer!: Consumer

  constructor() {
    //TODO move to the special class in charge of keeping secrets
    const group = Number(process.env.VK_GROUP!);
    this.vkGroupProvider = new VkGroupApiProvider(group, process.env.VK_TOKEN!);
    this.consumer = new Consumer(this.vkGroupProvider);
    this.publisher = new Publisher();
  }

  public init = async () => {
    await Promise.all([
        this.consumer.init(),
        this.publisher.init(),
    ])
    this.vkGroupProvider.registerLongPoll(this.publisher.handleNewMessage)
  }
}

(async() => {
  const app = new ApplicationModule()
  await app.init()
})()