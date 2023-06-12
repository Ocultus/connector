import {connect, Connection, Options} from 'amqplib';
import {sleep} from '../utils/sleep';

export type Options = {
	name?: string;
	options: Options.Connect;
};

export class AmqpConnectionProviderModule {
	private connections: Map<string, Connection>;
	constructor(private readonly options: Array<Required<Options>> | Options) {
		this.connections = new Map();
	}

	public init = async () => {
		if (Array.isArray(this.options)) {
			Promise.all(
				this.options.map(async opt => {
					try {
						const connection = await connect(opt.options);
						this.connections.set(opt.name, connection);
					} catch (e) {
						console.error({
							event: this.init,
							message: (e as any).message,
						});
					}
				}),
			);
		} else {
			try {
				const connection = await connect(this.options.options);
				this.connections.set('default', connection);
			} catch (e) {
				console.error({
					event: this.init,
					message: (e as any).message,
				});
			}
		}
	};

	getConnection = (name?: string) => {
		const connection = this.connections.get(name ?? 'default');
		if (!connection) {
			throw new Error('connection not found');
		}

		return connection;
	};
}
