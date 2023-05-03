import {configModule} from '../common/config/config.module';
import Fastify from 'fastify';
import {fastifyTRPCPlugin} from '@trpc/server/adapters/fastify';
import {createContext} from './trpc/context';
import { appRouter } from './trpc/router';

export class ApplicationModule {
	public init = async () => {
		const {port} = configModule.getCloudStorageConfig();

		const server = Fastify({
			logger: true,
		});

		server.register(fastifyTRPCPlugin, {
			prefix: 'api/trpc',
			trpcOptions: {router: appRouter, createContext},
		});

		server.listen({port}, (err, address) => {
			if (err) {
				console.error(err);
				process.exit(1);
			}

			console.log(`server listening at ${address}`);
		});
	};
}

(async () => {
	const app = new ApplicationModule();
	await app.init();
})();
