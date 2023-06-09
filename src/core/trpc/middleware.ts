import {TRPCError} from '@trpc/server';
import {t} from './router';

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
