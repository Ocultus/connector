import fastify from 'fastify';
import {Bootstrap} from '../common/bootstap.module';
import {fastifyTRPCPlugin} from '@trpc/server/adapters/fastify';
import {createContext} from './trpc/context';
import {appRouter} from './trpc/_app';
import {configModule} from '../common/config/config.module';
import {MessageConsumer} from './consumers/messages/messages.controller';
import {AmqpFactoryModule} from '../common/amqp';

export class ApplicationModule {
	readonly bootstrap: Bootstrap;
	constructor() {
		this.bootstrap = new Bootstrap();
	}

	public init = async () => {
		const db = await this.bootstrap.initDatabase(
			configModule.getDatabaseConfig(),
		);

		const {coreMessageExchange} = configModule.getRabbitMQExchange();

		console.debug('database initialize finished');

		const amqp = await this.bootstrap.initAmqpConnection(
			configModule.getAmqpConfig(),
		);
		const amqpFactory = new AmqpFactoryModule(amqp);
		const consumer = new MessageConsumer(db);

		const amqpConsumer = await amqpFactory.makeConsumer(
			coreMessageExchange,
			coreMessageExchange,
			`core.messages.core`,
			100,
		);

		await amqpConsumer.init();
		await amqpConsumer.consume(consumer.recieveMessage);

		const server = fastify({
			maxParamLength: 5000,
		});

		server.register(fastifyTRPCPlugin, {
			prefix: 'api/trpc',
			trpcOptions: {router: appRouter, createContext},
		});

		await server.listen({port: 3000});
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
