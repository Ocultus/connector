import {createTRPCProxyClient, httpBatchLink} from '@trpc/client';
import {AmqpFactoryModule} from '../common/amqp';
import {Bootstrap} from '../common/bootstap.module';
import {configModule} from '../common/config/config.module';
import {AppRouter as CoreRouter} from '../core/trpc/_app';
import {TgGatewayController} from './tg-gateway.controller';
import {GatewayActionMessage} from '../common/types/common.type';
import {AppRouter as CloudStorageRouter} from '../cloud-storage/trpc/router';
import pino from 'pino';
import {Envelope} from '../common/types/payload';
import {sleep} from '../common/utils/sleep';
export class ApplicationModule {
	private bootsrap: Bootstrap;

	constructor() {
		this.bootsrap = new Bootstrap();
	}

	public init = async () => {
		//wait core and cloud storage
		await sleep(10);
		
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

		const coreMessagePublisher = await amqpFactory.makePublisher(
			coreMessageExchange,
		);

		const gatewayToController = new Map<number, TgGatewayController>();
		const tgGateways = await coreClient.gateway.findByType.mutate({type: 'tg'});
		const tgGatewayInitPromises = tgGateways.map(async tgGateway => {
			if (tgGateway.type === 'tg' && tgGateway.enabled) {
				const {
					id,
					credentials: {token},
				} = tgGateway;

				const gatewayController = new TgGatewayController(
					id,
					token,
					coreMessagePublisher,
					endpoints,
					logger,
					cloudStorageClient,
				);
				gatewayToController.set(id, gatewayController);
				await gatewayController.init();
			}
		});

		await Promise.all(tgGatewayInitPromises);

		//wait for tg init
		await sleep(10);

		const tgGatewayActionsConsumer = await amqpFactory.makeConsumer(
			coreActionsExchange,
			'tg.actions',
			'tg',
		);

		const gatewayConsumer = await amqpFactory.makeConsumer(
			coreMessageExchange,
			`${coreMessageExchange}.tg`,
			'tg',
		);

		tgGatewayActionsConsumer.consume<GatewayActionMessage>(async data => {
			const {id, action} = data;

			if (
				action === 'create' &&
				data.type == 'tg' &&
				!gatewayToController.has(id)
			) {
				const {token} = data.credentials;

				const gatewayController = new TgGatewayController(
					id,
					token,
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
					case 'stop':
						await controller.pause();
						gatewayToController.delete(id);
						break;
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

		logger.info('Tg serivce init');
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
