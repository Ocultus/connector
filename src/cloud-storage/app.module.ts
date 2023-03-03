import {configModule} from '../common/config/config.module';
import {CloudStorageController} from './cloud-storage.controller';
import Fastify from 'fastify';
import {TypeBoxTypeProvider} from '@fastify/type-provider-typebox';
import {
	UploadFileRequestBody,
	UploadFileResponseBody,
} from './cloud-storage.type';

export class ApplicationModule {
	public init = async () => {
		const {keyId, key, bucket, region, endpoint, port} =
			configModule.getCloudStorageConfig();
		const cloudStorageController = new CloudStorageController({
			accessKeyId: keyId,
			secretAccessKey: key,
			bucket,
			region,
			endpoint,
		});

		const fastify = Fastify({
			logger: true,
		}).withTypeProvider<TypeBoxTypeProvider>();

		fastify.post<{Body: UploadFileRequestBody; Reply: UploadFileResponseBody}>(
			'/upload-object',
			async (request, reply) => {
				const {buffer, mimetype, route, url} = request.body;
				const uploadedObjectUrl = await cloudStorageController.uploadObject(
					{
						buffer: buffer ? Buffer.from(buffer) : undefined,
						url,
						mimetype,
					},
					route,
				);
				reply.send({url: uploadedObjectUrl});
			},
		);

		fastify.listen({port}, (err, address) => {
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
