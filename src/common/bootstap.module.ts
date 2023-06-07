import {createPool, DatabasePool, stringifyDsn} from 'slonik';
import {createFieldNameTransformationInterceptor} from 'slonik-interceptor-field-name-transformation';
import {AmqpConnectionProviderModule} from './amqp';
import {DatabaseConfig, RabbitMqConfig} from './config/config.module';
import { createQueryLoggingInterceptor } from 'slonik-interceptor-query-logging';

export class Bootstrap {
	private pgClient?: DatabasePool;
	private AmqpConnectionProviderModule?: AmqpConnectionProviderModule;

	public initDatabase = async (config: DatabaseConfig) => {
		if (!this.pgClient) {
			const interceptors = [
				createFieldNameTransformationInterceptor({
					format: 'CAMEL_CASE',
				}),
				createQueryLoggingInterceptor(),
			];
			const uri = stringifyDsn(config);

			this.pgClient = await createPool(uri, {
				interceptors,
			});

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
