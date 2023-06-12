import {createTRPCProxyClient, httpBatchLink} from '@trpc/client';
import {AmqpFactoryModule} from '../common/amqp';
import {Bootstrap} from '../common/bootstap.module';
import {configModule} from '../common/config/config.module';
import {AppRouter as CoreRouter} from '../core/trpc/_app';

import {VkGatewayController} from './vk-gateway.controller';
import {GatewayActionMessage} from '../common/types/common.type';
import pino from 'pino';
import {Envelope} from '../common/types/payload';
import { sleep } from '../common/utils/sleep';

export class ApplicationModule {
	private bootsrap: Bootstrap;
	constructor() {
		this.bootsrap = new Bootstrap();
	}

	public init = async () => {
		//wait core and cloud storage
		await sleep(10);

		const logger = pino();
		const {coreMessageExchange, coreActionsExchange} =
			configModule.getRabbitMQExchange();
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

		const gatewayConsumer = await amqpFactory.makeConsumer(
			coreMessageExchange,
			`${coreMessageExchange}.vk`,
			'vk',
		);

		const vkGatewayActionsConsumer = await amqpFactory.makeConsumer(
			coreActionsExchange,
			'vk.actions',
			'vk',
		);

		const coreMessagePublisher = await amqpFactory.makePublisher(
			coreMessageExchange,
		);

		const gatewayToController = new Map<number, VkGatewayController>();
		const vkGateways = await coreClient.gateway.findByType.mutate({type: 'vk'});

		const vkGatewayInitPromises = vkGateways.map(async vkGateway => {
			if (vkGateway.type === 'vk' && vkGateway.enabled) {
				const {
					id,
					credentials: {token, group},
				} = vkGateway;

				const gatewayController = new VkGatewayController(
					id,
					group,
					token,
					coreMessagePublisher,
					endpoints,
					logger,
				);
				gatewayToController.set(id, gatewayController);
				await gatewayController.init();
			}
		});

		await Promise.all(vkGatewayInitPromises);

		vkGatewayActionsConsumer.consume<GatewayActionMessage>(async data => {
			const {id, action} = data;
			if (
				data.action === 'create' &&
				data.type === 'vk' &&
				!gatewayToController.has(id)
			) {
				const {group, token} = data.credentials;

				const gatewayController = new VkGatewayController(
					id,
					group,
					token,
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
						case 'stop':
							controller.pause();
							gatewayToController.delete(id);
							break;
					}
				}
			}
		});

		gatewayConsumer.consume<Envelope>(async data => {
			if (data.type === 'outgoing') {
				const controller = gatewayToController.get(data.gatewayId);
				if (controller) {
					await controller.sendMessage(data);
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
