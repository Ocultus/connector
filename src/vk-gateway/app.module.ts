import {createTRPCProxyClient, httpBatchLink} from '@trpc/client';
import {AmqpFactoryModule} from '../common/amqp';
import {Bootstrap} from '../common/bootstap.module';
import {configModule} from '../common/config/config.module';
import {AppRouter as CoreRouter} from '../core/trpc/_app';

import {VkGatewayController} from './vk-gateway.controller';
import {GatewayActionMessage} from '../common/types/common.type';
import pino from 'pino';

export class ApplicationModule {
	private bootsrap: Bootstrap;
	constructor() {
		this.bootsrap = new Bootstrap();
	}

	public init = async () => {
		const logger = pino();
		const {coreMessageExchange, coreActionsExchange} =
			configModule.getRabbitMQExchange();
		const amqpConfig = configModule.getAmqpConfig();
		const amqpConnection = await this.bootsrap.initAmqpConnection(amqpConfig);
		const amqpFactory = new AmqpFactoryModule(amqpConnection);

		const endpoints = configModule.getEndpointsConfig();
		console.log('core url', endpoints.coreUrl);
		const coreClient = createTRPCProxyClient<CoreRouter>({
			links: [
				httpBatchLink({
					url: endpoints.coreUrl,
				}),
			],
		});

		const vkGatewayActionsConsumer = await amqpFactory.makeConsumer(
			coreActionsExchange,
			'vk.actions',
			'*',
		);

		const coreMessagePublisher = await amqpFactory.makePublisher(
			coreMessageExchange,
		);

		const gatewayToController = new Map<number, VkGatewayController>();
		const vkGateways = await coreClient.getaway.findByType.mutate({type: 'vk'});

		const vkGatewayInitPromises = vkGateways.map(async vkGateway => {
			if (vkGateway.type === 'vk') {
				const {
					id,
					credentials: {token, group},
				} = vkGateway;

				const gatewayConsumer = await amqpFactory.makeConsumer(
					coreMessageExchange,
					`${coreMessageExchange}.vk`,
					`${coreMessageExchange}.vk.${id}`,
				);
				const gatewayController = new VkGatewayController(
					id,
					group,
					token,
					gatewayConsumer,
					coreMessagePublisher,
					endpoints,
					logger,
				);
				gatewayToController.set(id, gatewayController);
				gatewayController.init();
			}
		});

		await Promise.all(vkGatewayInitPromises);

		vkGatewayActionsConsumer.consume<GatewayActionMessage>(async data => {
			const {id, action} = data;
			if (action === 'create' && data.type == 'vk') {
				const {group, token} = data.credentials;
				const gatewayConsumer = await amqpFactory.makeConsumer(
					coreMessageExchange,
					`${coreMessageExchange}.vk`,
					`${coreMessageExchange}.vk.${id}`,
				);

				const gatewayController = new VkGatewayController(
					id,
					group,
					token,
					gatewayConsumer,
					coreMessagePublisher,
					endpoints,
					logger,
				);

				gatewayToController.set(id, gatewayController);
				gatewayController.init();
			} else {
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
			}
		});

		logger.info('Vk service init');
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
