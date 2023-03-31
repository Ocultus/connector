import fastify from 'fastify';
import {Bootstrap} from '../common/bootstap.module';
import {fastifyTRPCPlugin} from '@trpc/server/adapters/fastify';
import {createContext} from './trpc/context';
import { appRouter } from './trpc/_app';

export class ApplicationModule {
	readonly bootstrap: Bootstrap;
	constructor() {
		this.bootstrap = new Bootstrap();
	}

	public init = async () => {
		console.debug('database initialize finished');

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
