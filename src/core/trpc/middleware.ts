import {TRPCError} from '@trpc/server';
import {t} from './router';
import {
	experimental_createMemoryUploadHandler,
	experimental_isMultipartFormDataRequest,
	experimental_parseMultipartFormData,
} from '@trpc/server/adapters/node-http/content-type/form-data';

export const middleware = t.middleware;

const isAuthed = middleware(({next, ctx}) => {
	if (!ctx.user) {
		throw new TRPCError({code: 'UNAUTHORIZED'});
	}

	return next({
		ctx: {
			user: ctx.user,
		},
	});
});

export const protectedProcedure = t.procedure.use(isAuthed);

export const formDataProcedure = protectedProcedure.use(async opts => {
	if (!experimental_isMultipartFormDataRequest(opts.ctx.req)) {
		return opts.next();
	}
	const formData = await experimental_parseMultipartFormData(
		opts.ctx.req,
		experimental_createMemoryUploadHandler(),
	);

	return opts.next({
		rawInput: formData,
	});
});
