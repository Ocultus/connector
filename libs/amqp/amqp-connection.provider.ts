import * as amqp from "amqplib";
import { sleep } from "../utils/sleep";

export type Options = {
  name?: string;
  options: amqp.Options.Connect;
};
export class AmqpConnectionProvider {
  private connections: Map<string, amqp.Connection>;
  constructor(private readonly options: Array<Required<Options>> | Options) {
    this.connections = new Map();
  }

  public init = async () => {
    await sleep(20);
    if (Array.isArray(this.options)) {
      Promise.all(
        this.options.map(async (opt) => {
          try {
            const connection = await amqp.connect(opt.options);
            this.connections.set(opt.name, connection);
          } catch (e) {
            console.error({
              event: this.init,
              message: (e as any).message,
            });
          }
        })
      );
    } else {
      try {
        const connection = await amqp.connect(this.options.options);
        this.connections.set("default", connection);
      } catch (e) {
        console.error({
          event: this.init,
          message: (e as any).message,
        });
      }
    }
  };

  getConnection = (name?: string) => {
    const c = this.connections.get(name ?? "default");
    if (!c) {
      throw new Error("connection not found");
    }
    return c;
  };
}
