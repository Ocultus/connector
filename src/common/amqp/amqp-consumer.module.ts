import {Channel, Connection, ConsumeMessage, Options} from 'amqplib';
import {sleep} from '../utils/sleep';

export class AmqpConsumerModule {
	private channel: Channel | undefined;
	constructor(
		private readonly connection: Connection,
		private readonly exchange: string,
		private readonly queueName: string,
		private readonly topic: string,
		private readonly prefetch: number = 1,
		private readonly withDeadLetter: boolean = false,
	) {}

	public init = async (retry = 0) => {
		try {
			this.channel = await this.connection.createChannel();

			let queueOptions: Options.AssertQueue | undefined;
			if (this.withDeadLetter) {
				const deadLetter = this.queueName + '.deadLetter';
				await this.channel.assertExchange(deadLetter, 'direct', {
					durable: true,
				});
				await this.channel.assertQueue(deadLetter, {durable: true});
				await this.channel.bindQueue(deadLetter, deadLetter, '');
				queueOptions = {
					durable: true,
					deadLetterExchange: deadLetter,
				};
			}

			this.channel.assertExchange(this.exchange, 'topic', queueOptions);
			this.channel.assertQueue(this.queueName);
			this.channel.bindQueue(this.queueName, this.exchange, this.topic);

			this.channel.prefetch(this.prefetch);

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

	public consume = async <T>(callback: (data: T) => Promise<void> | void) => {
		if (this.channel === undefined) {
			throw new Error('channel not initialized');
		}

		await this.channel.consume(
			this.queueName,
			async (msg: ConsumeMessage | null) => {
				if (!msg) {
					return;
				}

				try {
					const data = JSON.parse(msg.content.toString()) as T;
					await callback(data);
					this.channel?.ack(msg);
				} catch (e) {
					console.error({
						error: e as any,
						event: this.consume,
					});
					this.channel?.nack(msg, false, false);
				}
			},
		);
	};
}
