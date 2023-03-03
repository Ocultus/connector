import {AmqpFactoryModule} from '../common/amqp';
import {Bootstrap} from '../common/bootstap.module';
import {configModule} from '../common/config/config.module';
import {GatewayRepository} from '../common/repository/gateway.repository';
import {VkGatewayController} from './vk-gateway.controller';

export class ApplicationModule {
	private bootsrap: Bootstrap;
	constructor() {
		this.bootsrap = new Bootstrap();
	}

	public init = async () => {
		const amqpConfig = configModule.getAmqpConfig();
		const amqpConnection = await this.bootsrap.initAmqpConnection(amqpConfig);
		const amqpFactory = new AmqpFactoryModule(amqpConnection);

		const endpoints = configModule.getEndpointsConfig();

		const pgConfig = configModule.getDatabaseConfig();
		const pgClient = await this.bootsrap.initDatabase(pgConfig);

		/*for test only*/
		const gatewayRepository = new GatewayRepository(pgClient);
		const gateways = await gatewayRepository.findByType('vk');
		await Promise.all(
			gateways.map(async gateway => {
				// only typescript check
				if (gateway.type !== 'vk') {
					return;
				}

				const AmqpPublisherModule = await amqpFactory.makePublisher(
					'core.messages',
				);
				const AmqpConsumerModule = await amqpFactory.makeConsumer(
					'gateway.messages',
					'vk.messages',
					'vk',
				);

				const controller = new VkGatewayController(
					gateway.credentials.group,
					gateway.credentials.token,
					AmqpConsumerModule,
					AmqpPublisherModule,
					endpoints,
				);
				await controller.init();
			}),
		);
		/**/
		console.log('finish init');
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
