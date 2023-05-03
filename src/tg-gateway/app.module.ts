import {createTRPCProxyClient, httpBatchLink} from '@trpc/client';
import {AmqpFactoryModule} from '../common/amqp';
import {Bootstrap} from '../common/bootstap.module';
import {configModule} from '../common/config/config.module';
import {AppRouter as CoreRouter} from '../core/trpc/_app';
import {TgGatewayController} from './tg-gateway.controller';
import {GatewayActionMessage} from '../common/types/common.type';

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

		const tgGatewayActionsConsumer = await amqpFactory.makeConsumer(
			gatewayActionsExchange,
			'tg.actions',
			'tg.actions',
		);

		const coreMessagePublisher = await amqpFactory.makePublisher(
			gatewayExchange,
		);

		const coreReportMessagePublisher = await amqpFactory.makePublisher(
			coreReportExchange,
		);

		const gatewayToController = new Map<number, TgGatewayController>();
		const tgGateways = await coreClient.gateway.findByType.mutate({type: 'tg'});

		const vkGatewayInitPromises = tgGateways.map(async tgGateway => {
			if (tgGateway.type === 'tg') {
				const {
					id,
					credentials: {token},
				} = tgGateway;
				const queueName = 'tg.out.bot.' + id;

				const gatewayConsumer = await amqpFactory.makeConsumer(
					gatewayExchange,
					queueName,
					queueName,
				);
				const gatewayController = new TgGatewayController(
					id,
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

		tgGatewayActionsConsumer.consume<GatewayActionMessage>(data => {
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
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
