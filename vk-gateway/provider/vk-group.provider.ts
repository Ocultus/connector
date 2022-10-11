import * as vkio from "vk-io";
export class VkGroupProvider {
  private groups: Map<number, vkio.VK>;
  constructor(private options: Array<{ group: number; token: string }>) {
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
}
