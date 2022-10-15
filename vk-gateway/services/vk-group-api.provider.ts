import * as vkio from "vk-io";
import { Upload, Updates } from "vk-io";
import { Envelope } from "../../types/payload";
export class VkGroupApiProvider {
  private vkApi!: vkio.VK
  constructor(private readonly group: number,private readonly token: string) {
      this.vkApi = new vkio.VK({
        token: this.token,
        pollingGroupId: this.group,
      });
    }

  public registerLongPoll = (
    callback: (
      context: vkio.MessageContext<vkio.ContextDefaultState>
    ) => Promise<void> | void
  ) => {
    const upload = new Upload({
      api: this.vkApi.api,
    });

    const updates = new Updates({
      api: this.vkApi.api,
      upload,
    });

    updates.on("message_new", callback);
  };

  public sendMessage = (envelope: Envelope) => {
    this.vkApi.api.messages.send({
      peer_id: envelope.account,
      message: envelope.payload.text,
      random_id: Math.random(),
    })
  }
}
