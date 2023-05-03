import {createTRPCProxyClient, httpBatchLink} from '@trpc/client';
import {AmqpFactoryModule} from '../common/amqp';
import {Bootstrap} from '../common/bootstap.module';
import {configModule} from '../common/config/config.module';
import {AppRouter as CoreRouter} from '../core/trpc/_app';

import {VkGatewayController} from './vk-gateway.controller';
import { GatewayActionMessage } from '../common/types/common.type';

export class ApplicationModule {
	private bootsrap: Bootstrap;
	constructor() {
		this.bootsrap = new Bootstrap();
	}

	public init = async () => {
		const gatewayExchange = 'core.messages';
		const gatewayActionsExchange = 'core.actions';
		const coreReportExchange = 'core.reports';

		const amqpConfig = configModule.getAmqpConfig();
		const amqpConnection = await this.bootsrap.initAmqpConnection(amqpConfig);
		const amqpFactory = new AmqpFactoryModule(amqpConnection);

		const endpoints = configModule.getEndpointsConfig();
		const coreClient = createTRPCProxyClient<CoreRouter>({
			links: [
				httpBatchLink({
					url: endpoints.coreUrl,
				}),
			],
		});

		const vkGatewayActionsConsumer = await amqpFactory.makeConsumer(
			gatewayActionsExchange,
			'vk.actions',
			'vk.actions',
		);

		const coreMessagePublisher = await amqpFactory.makePublisher(
			gatewayExchange,
		);

		const coreReportMessagePublisher = await amqpFactory.makePublisher(
			coreReportExchange,
		);

		const gatewayToController = new Map<number, VkGatewayController>();
		const vkGateways = await coreClient.gateway.findByType.mutate({type: 'vk'});

		const vkGatewayInitPromises = vkGateways.map(async vkGateway => {
			if (vkGateway.type === 'vk') {
				const {
					id,
					credentials: {token, group},
				} = vkGateway;
				const queueName = 'vk.out.id' + id;

				const gatewayConsumer = await amqpFactory.makeConsumer(
					gatewayExchange,
					queueName,
					queueName,
				);
				const gatewayController = new VkGatewayController(
					id,
					group,
					token,
					gatewayConsumer,
					coreMessagePublisher,
					coreReportMessagePublisher,
					endpoints,
				);
				gatewayToController.set(id, gatewayController);
				gatewayController.init();
			}
		});

		await Promise.all(vkGatewayInitPromises);

		vkGatewayActionsConsumer.consume<GatewayActionMessage>(data => {
			const {id, action} = data;
			const controller = gatewayToController.get(id);
			if (controller) {
				switch (action) {
					case 'resume':
						controller.enable();
					case 'pause':
						controller.pause();
					case 'stop':
						controller.pause();
						gatewayToController.delete(id);
				}
			}
		});

		console.log('finish init');
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
