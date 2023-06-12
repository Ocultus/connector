import {TRPCError} from '@trpc/server';
import {publicProcedure, t} from './trpc/_app';
import {UploadFile} from './cloud-storage.type';

export const ObjectRouter = t.router({
	upload: publicProcedure.input(UploadFile).mutation(async ({input, ctx}) => {
		const {controller} = ctx;
		const {url, buffer, mimetype, route} = input;
		const uploadedObjectUrl = await controller.uploadObject(
			{
				buffer: buffer ? Buffer.from(buffer) : undefined,
				url: url,
				mimetype,
			},
			route,
		);

		if (!uploadedObjectUrl) {
			throw new TRPCError({code: 'BAD_REQUEST'});
		}

		return uploadedObjectUrl;
	}),
});
