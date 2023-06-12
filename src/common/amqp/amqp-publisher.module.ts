import {Channel, Connection} from 'amqplib';
import {sleep} from '../utils/sleep';

export class AmqpPublisherModule {
	private channel!: Channel;
	constructor(
		private readonly connection: Connection,
		private readonly exchange: string,
	) {}

	public init = async (retry = 0) => {
		try {
			this.channel = await this.connection.createChannel();
			this.channel.assertExchange(this.exchange, 'topic', {durable: true});
			this.channel.on('close', async () => {
				await this.init(retry + 1);
			});
		} catch (e) {

			if (retry > 5) {
				throw e;
			}
			await this.init(retry + 1);
		}
	};

	public publish = <T>(data: T, topic: string) => {
		if (!this.channel) {
			throw new Error('channel not initialized');
		}

		this.channel.publish(
			this.exchange,
			topic,
			Buffer.from(JSON.stringify(data)),
		);
	};
}
