import * as vkio from "vk-io";
import { Upload, Updates } from "vk-io";
export class VkGroupProvider {
  private groups: Map<number, vkio.VK>;
  constructor(private options: Array<{ group: number; token: string }>) {
    this.groups = new Map();
    for (const opt of options) {
      const vk = new vkio.VK({
        token: opt.token,
        pollingGroupId: opt.group,
      });
      this.groups.set(opt.group, vk);
    }
  }

  public getApiByGroup = (group: number) => {
    const res = this.groups.get(group);
    if (!res) {
      throw new Error(`group: ${group} not initialized`);
    }
    return res;
  };

  public registerLongPoll = (
    group: number,
    callback: (
      context: vkio.MessageContext<vkio.ContextDefaultState>
    ) => Promise<void> | void
  ) => {
    const vk = this.getApiByGroup(group);
    const upload = new Upload({
      api: vk.api,
    });

    const updates = new Updates({
      api: vk.api,
      upload,
    });

    updates.on("message_new", callback);
  };
}
