import { Client } from 'pg';
import {AmqpConnectionProviderModule} from './amqp';
import {DatabaseConfig, RabbitMqConfig} from './config/config.module';

export class Bootstrap {
	private pgClient?: Client;
	private AmqpConnectionProviderModule?: AmqpConnectionProviderModule;

	public initDatabase = async (config: DatabaseConfig) => {
		if (!this.pgClient) {
			this.pgClient = new Client(config);
			await this.pgClient.connect();
			return this.pgClient;
		}

		return this.pgClient;
	};

	public initAmqpConnection = async (config: RabbitMqConfig) => {
		if (!this.AmqpConnectionProviderModule) {
			this.AmqpConnectionProviderModule = new AmqpConnectionProviderModule({
				options: config,
			});

			await this.AmqpConnectionProviderModule.init();
			return this.AmqpConnectionProviderModule.getConnection();
		}

		return this.AmqpConnectionProviderModule.getConnection();
	};
}
