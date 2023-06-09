import {createTRPCProxyClient, httpBatchLink} from '@trpc/client';
import {AmqpFactoryModule} from '../common/amqp';
import {Bootstrap} from '../common/bootstap.module';
import {configModule} from '../common/config/config.module';
import {AppRouter as CoreRouter} from '../core/trpc/_app';
import {TgGatewayController} from './tg-gateway.controller';
import {GatewayActionMessage} from '../common/types/common.type';
import {AppRouter as CloudStorageRouter} from '../cloud-storage/trpc/router';
import pino, {P} from 'pino';
export class ApplicationModule {
	private bootsrap: Bootstrap;

	constructor() {
		this.bootsrap = new Bootstrap();
	}

	public init = async () => {
		const logger = pino();
		const {coreActionsExchange, coreMessageExchange} =
			configModule.getRabbitMQExchange();
		const amqpConfig = configModule.getAmqpConfig();
		const amqpConnection = await this.bootsrap.initAmqpConnection(amqpConfig);
		const amqpFactory = new AmqpFactoryModule(amqpConnection);
		const endpoints = configModule.getEndpointsConfig();
		const cloudStorageClient = createTRPCProxyClient<CloudStorageRouter>({
			links: [
				httpBatchLink({
					url: endpoints.cloudStorageUrl,
				}),
			],
		});

		const coreClient = createTRPCProxyClient<CoreRouter>({
			links: [
				httpBatchLink({
					url: endpoints.coreUrl,
				}),
			],
		});

		const tgGatewayActionsConsumer = await amqpFactory.makeConsumer(
			coreActionsExchange,
			'tg.actions',
			'*',
		);

		const coreMessagePublisher = await amqpFactory.makePublisher(
			coreMessageExchange,
		);

		const gatewayToController = new Map<number, TgGatewayController>();
		const tgGateways = await coreClient.getaway.findByType.mutate({type: 'tg'});

		const tgGatewayInitPromises = tgGateways.map(async tgGateway => {
			if (tgGateway.type === 'tg') {
				const {
					id,
					credentials: {token},
				} = tgGateway;

				const gatewayConsumer = await amqpFactory.makeConsumer(
					coreMessageExchange,
					`${coreMessageExchange}.tg`,
					`${coreMessageExchange}.tg.${id}`,
				);

				const gatewayController = new TgGatewayController(
					id,
					token,
					gatewayConsumer,
					coreMessagePublisher,
					endpoints,
					logger,
					cloudStorageClient,
				);
				gatewayToController.set(id, gatewayController);
				gatewayController.init();
			}
		});

		await Promise.all(tgGatewayInitPromises);
		
		tgGatewayActionsConsumer.consume<GatewayActionMessage>(async data => {
			console.log(data);
			const {id, action} = data;
			if (action === 'create' && data.type == 'tg') {
				const {token} = data.credentials;
				const gatewayConsumer = await amqpFactory.makeConsumer(
					coreMessageExchange,
					`${coreMessageExchange}.tg`,
					`${coreMessageExchange}.tg.${id}`,
				);

				const gatewayController = new TgGatewayController(
					id,
					token,
					gatewayConsumer,
					coreMessagePublisher,
					endpoints,
					logger,
					cloudStorageClient,
				);

				gatewayToController.set(id, gatewayController);
				gatewayController.init();
			}
			const controller = gatewayToController.get(id);
			if (controller) {
				switch (action) {
					case 'resume':
						console.log(1234);
						await controller.enable();
						break;
					case 'pause':
						await controller.pause();
						break;
					case 'stop':
						await controller.pause();
						gatewayToController.delete(id);
						break;
				}
			}
		});

		logger.info('Tg serivce init');
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
